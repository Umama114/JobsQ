"""Sign up, email verification, sign in and out, password reset (docs/BACKEND.md 7.1 and 9.1).
Emails are not sent yet: they go to the email_outbox table, shown on the website's dev inbox page."""
import re
from psycopg.errors import UniqueViolation
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from .. import config, db
from ..deps import current_user
from ..security import check_password, digits, hash_password, new_token, token_hash

router = APIRouter(prefix="/v1/auth", tags=["auth"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterIn(BaseModel):
    name: str
    phone: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class TokenIn(BaseModel):
    token: str


class EmailIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    token: str
    password: str


def _check_password_rules(pw: str) -> None:
    if len(pw) < 8:
        raise HTTPException(422, "The password needs at least 8 characters.")


def _email_link(user_id: int, email: str, kind: str) -> None:
    token = new_token()
    hours = 24 if kind == "verify" else 1
    db.run(
        "insert into email_tokens (token_hash, user_id, kind, expires_at) values (%s, %s, %s, now() + make_interval(hours => %s))",
        (token_hash(token), user_id, kind, hours),
    )
    if kind == "verify":
        subject, body = "Confirm your JobsQ email", f"Open this link to confirm your email: {config.WEB_URL}/verify?token={token}"
    else:
        subject, body = "Reset your JobsQ password", f"Open this link within 1 hour to choose a new password: {config.WEB_URL}/reset?token={token}"
    db.run("insert into email_outbox (to_email, subject, body) values (%s, %s, %s)", (email, subject, body))


def _start_session(response: Response, user_id: int) -> None:
    token = new_token()
    db.run(
        "insert into sessions (token_hash, user_id, expires_at) values (%s, %s, now() + make_interval(days => %s))",
        (token_hash(token), user_id, config.SESSION_DAYS),
    )
    response.set_cookie(config.COOKIE_NAME, token, httponly=True, samesite="lax", max_age=config.SESSION_DAYS * 86400, secure=not config.DEV_MODE)


@router.post("/register")
def register(body: RegisterIn, response: Response):
    email = body.email.strip().lower()
    phone = digits(body.phone)
    if not body.name.strip():
        raise HTTPException(422, "Enter your name.")
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Enter a valid email address.")
    if not body.phone.strip().startswith("+") or not 10 <= len(phone) <= 15:  # one way of writing a number, so repeats are caught
        raise HTTPException(422, "Enter your phone number with the country code, for example +91 98765 43210.")
    _check_password_rules(body.password)
    if db.one("select 1 from users where email = %s", (email,)):
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    taken = HTTPException(409, "This phone number is already used by another account. Sign in instead, or use a different number.")
    if db.one("select 1 from users where phone = %s", (phone,)):
        raise taken
    try:
        user = db.one(
            "insert into users (email, name, phone, password_hash) values (%s, %s, %s, %s) returning id",
            (email, body.name.strip(), phone, hash_password(body.password)),
        )
    except UniqueViolation as e:  # two sign-ups at the same moment
        if e.diag.constraint_name == "users_phone_unique":
            raise taken
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    _email_link(user["id"], email, "verify")
    _start_session(response, user["id"])
    return {"ok": True, "message": "Account created. We sent you a link to confirm your email."}


@router.post("/verify-email")
def verify_email(body: TokenIn):
    row = db.one(
        "select * from email_tokens where token_hash = %s and kind = 'verify' and used_at is null and expires_at > now()",
        (token_hash(body.token),),
    )
    if not row:
        raise HTTPException(400, "This link is wrong, already used or expired. Ask for a new one from your dashboard.")
    db.run("update email_tokens set used_at = now() where token_hash = %s", (row["token_hash"],))
    db.run("update users set email_verified_at = coalesce(email_verified_at, now()) where id = %s", (row["user_id"],))
    return {"ok": True, "message": "Your email is confirmed."}


@router.post("/resend-verification")
def resend(user: dict = Depends(current_user)):
    if user["email_verified_at"]:
        return {"ok": True, "message": "Your email is already confirmed."}
    _email_link(user["id"], user["email"], "verify")
    return {"ok": True, "message": "We sent a new confirmation link."}


@router.post("/login")
def login(body: LoginIn, response: Response):
    user = db.one("select * from users where email = %s", (body.email.strip().lower(),))
    wrong = HTTPException(401, "Wrong email or password.")
    if not user:
        raise wrong
    locked = db.one("select locked_until > now() as locked from users where id = %s", (user["id"],))
    if locked and locked["locked"]:
        raise HTTPException(429, f"Too many wrong tries. Try again in {config.LOCK_MINUTES} minutes.")
    if not check_password(user["password_hash"], body.password):
        db.run(
            "update users set failed_logins = failed_logins + 1, "
            "locked_until = case when failed_logins + 1 >= %s then now() + make_interval(mins => %s) else locked_until end "
            "where id = %s",
            (config.MAX_LOGIN_FAILURES, config.LOCK_MINUTES, user["id"]),
        )
        raise wrong
    db.run("update users set failed_logins = 0, locked_until = null where id = %s", (user["id"],))
    _start_session(response, user["id"])
    return {"ok": True}


@router.post("/logout")
def logout(response: Response, user: dict = Depends(current_user)):
    db.run("delete from sessions where user_id = %s", (user["id"],))
    response.delete_cookie(config.COOKIE_NAME)
    return {"ok": True}


@router.post("/password/forgot")
def forgot(body: EmailIn):
    user = db.one("select id, email from users where email = %s", (body.email.strip().lower(),))
    if user:
        _email_link(user["id"], user["email"], "reset")
    return {"ok": True, "message": "If that email has an account, we sent a reset link."}  # same answer either way


@router.post("/password/reset")
def reset(body: ResetIn):
    _check_password_rules(body.password)
    row = db.one(
        "select * from email_tokens where token_hash = %s and kind = 'reset' and used_at is null and expires_at > now()",
        (token_hash(body.token),),
    )
    if not row:
        raise HTTPException(400, "This reset link is wrong, already used or expired.")
    db.run("update email_tokens set used_at = now() where token_hash = %s", (row["token_hash"],))
    db.run("update users set password_hash = %s, failed_logins = 0, locked_until = null where id = %s", (hash_password(body.password), row["user_id"]))
    db.run("delete from sessions where user_id = %s", (row["user_id"],))  # signed out everywhere
    return {"ok": True, "message": "Password changed. Sign in with the new one."}
