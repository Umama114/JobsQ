"""Who is calling: the session cookie -> the signed-in user. Also the 'needs full access' check."""
from fastapi import HTTPException, Request
from . import config, db
from .access import access_for
from .security import token_hash


def current_user(request: Request) -> dict:
    token = request.cookies.get(config.COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Please sign in.")
    user = db.one(
        "select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = %s and s.expires_at > now()",
        (token_hash(token),),
    )
    if not user:
        raise HTTPException(401, "Your session has ended. Please sign in again.")
    return user


def require_full(user: dict) -> dict:
    acc = access_for(user["id"])
    if acc["level"] == "suspended":
        raise HTTPException(403, "Your account is suspended.")
    if acc["level"] != "full":
        raise HTTPException(402, "This needs an active plan. Activate a plan first.")
    return acc
