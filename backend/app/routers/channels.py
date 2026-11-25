"""Connecting WhatsApp: the website shows a code; the user sends it from their phone; the webhook links the number."""
import secrets
import string
from urllib.parse import quote
from fastapi import APIRouter, Depends
from .. import config, db
from ..deps import current_user, require_full
from ..security import digits

router = APIRouter(prefix="/v1/channels", tags=["channels"])


@router.get("")
def channel(user: dict = Depends(current_user)):
    return db.one("select channel, external_id, status, linked_at from channel_links where user_id = %s and status <> 'disconnected'", (user["id"],))


@router.post("/whatsapp/link-code")
def link_code(user: dict = Depends(current_user)):
    require_full(user)  # connecting WhatsApp needs an active plan
    code = "JQ-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    db.run("insert into link_codes (code, user_id, expires_at) values (%s, %s, now() + interval '30 minutes')", (code, user["id"]))
    number = digits(config.WA_DISPLAY_NUMBER)
    return {
        "code": code,
        "expires_in_minutes": 30,
        "whatsapp_number": config.WA_DISPLAY_NUMBER,
        "chat_link": f"https://wa.me/{number}?text={quote('Connect my JobsQ account: ' + code)}" if number else None,
    }


@router.delete("/current")
def disconnect(user: dict = Depends(current_user)):
    db.run("update channel_links set status = 'disconnected' where user_id = %s and status <> 'disconnected'", (user["id"],))
    return {"ok": True}
