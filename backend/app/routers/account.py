"""The signed-in user's account: /v1/me, plans, subscription, messages, and test-mode tools.

Payments are not built yet. In DEV_MODE the dashboard has test buttons instead:
activate a plan (as if paid), end it, and suspend the account, so every access level can be tried."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from .. import config, db, worker
from ..access import access_for
from ..deps import current_user

router = APIRouter(tags=["account"])


@router.get("/v1/me")
def me(user: dict = Depends(current_user)):
    link = db.one("select channel, external_id, status, linked_at from channel_links where user_id = %s and status <> 'disconnected'", (user["id"],))
    resume = db.one("select filename, text_chars, created_at from resumes where user_id = %s order by id desc limit 1", (user["id"],))
    today = db.one("select count(*) as n from messages where user_id = %s and direction = 'in' and created_at > date_trunc('day', now())", (user["id"],))["n"]
    return {
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "phone": user["phone"], "status": user["status"],
                 "email_verified": user["email_verified_at"] is not None},
        "access": access_for(user["id"]),
        "channel": link,
        "resume": resume,
        "usage": {"messages_today": today, "daily_cap": config.DAILY_MESSAGE_CAP},
        "dev_mode": config.DEV_MODE,
        "whatsapp_number": config.WA_DISPLAY_NUMBER,
    }


@router.get("/v1/plans")
def plans():
    return db.all_rows("select code, name, description, price_inr from plans order by code = 'own_ai', code")


@router.get("/v1/billing/subscription")
def subscription(user: dict = Depends(current_user)):
    return db.all_rows("select id, plan_code, status, current_period_end, provider, created_at from subscriptions where user_id = %s order by id desc limit 10", (user["id"],))


@router.get("/v1/messages")
def messages(user: dict = Depends(current_user)):
    return db.all_rows(
        "select id, direction, body, intent, status, error, created_at from messages where user_id = %s order by id desc limit 50",
        (user["id"],),
    )


# ---------- test mode (payments are not built yet) ----------
class ActivateIn(BaseModel):
    plan_code: str
    days: int = 30


class SuspendIn(BaseModel):
    suspended: bool


LOCAL_HOSTS = {"localhost", "127.0.0.1", "[::1]", "testserver"}  # testserver: the name the automated tests use


def _dev_only(request: Request):
    """Test-mode tools work only on this computer. Through a public address (ngrok, used for WhatsApp) they don't exist,
    so nobody else can read the dev inbox (it holds password reset links) or start a free test plan."""
    hosts = [request.headers.get("host", ""), *request.headers.get("x-forwarded-host", "").split(",")]
    names = [h.strip().lower() if h.strip().endswith("]") else h.strip().lower().rsplit(":", 1)[0] for h in hosts if h.strip()]
    if not config.DEV_MODE or not names or any(n not in LOCAL_HOSTS for n in names):
        raise HTTPException(404, "Not found")


@router.post("/v1/dev/activate-plan")
def activate(body: ActivateIn, request: Request, user: dict = Depends(current_user)):
    _dev_only(request)
    if not user["email_verified_at"]:
        raise HTTPException(403, "Confirm your email first.")
    if not db.one("select 1 from plans where code = %s", (body.plan_code,)):
        raise HTTPException(422, "Unknown plan.")
    days = max(1, min(body.days, 365))
    db.run("update subscriptions set status = 'canceled' where user_id = %s and status in ('active', 'past_due')", (user["id"],))
    db.run(
        "insert into subscriptions (user_id, plan_code, status, current_period_end, provider) values (%s, %s, 'active', now() + make_interval(days => %s), 'test')",
        (user["id"], body.plan_code, days),
    )
    worker.on_plan_started(user["id"])  # a resume saved before paying is read now
    return {"ok": True, "access": access_for(user["id"])}


@router.post("/v1/dev/end-plan")
def end_plan(request: Request, user: dict = Depends(current_user)):
    """Moves the end date into the past, as if the plan lapsed. The status stays 'active': access is worked out from the date."""
    _dev_only(request)
    db.run(
        "update subscriptions set current_period_end = now() - interval '1 minute', grace_until = null, extended_until = null "
        "where user_id = %s and status in ('active', 'past_due')",
        (user["id"],),
    )
    return {"ok": True, "access": access_for(user["id"])}


@router.post("/v1/dev/suspend")
def suspend(body: SuspendIn, request: Request, user: dict = Depends(current_user)):
    _dev_only(request)
    db.run("update users set status = %s where id = %s", ("suspended" if body.suspended else "active", user["id"]))
    return {"ok": True, "access": access_for(user["id"])}


@router.get("/v1/dev/outbox")
def outbox(request: Request):
    _dev_only(request)
    return db.all_rows("select id, to_email, subject, body, created_at from email_outbox order by id desc limit 20")
