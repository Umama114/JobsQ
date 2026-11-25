"""Meta's WhatsApp webhook. GET: Meta checks the address once (verify token). POST: incoming messages, signed by Meta."""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import PlainTextResponse
from .. import config, db, engine
from ..security import digits
from ..whatsapp import signature_ok

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("/whatsapp")
def verify(request: Request):
    q = request.query_params
    if q.get("hub.mode") == "subscribe" and config.WA_VERIFY_TOKEN and q.get("hub.verify_token") == config.WA_VERIFY_TOKEN:
        return PlainTextResponse(q.get("hub.challenge", ""))
    raise HTTPException(403, "forbidden")


@router.post("/whatsapp")
async def incoming(request: Request, background: BackgroundTasks):
    raw = await request.body()
    if not signature_ok(raw, request.headers.get("x-hub-signature-256")):
        raise HTTPException(403, "bad signature")  # only Meta can call this
    payload = await request.json()
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            for msg in (change.get("value") or {}).get("messages", []) or []:
                phone = digits(msg.get("from", ""))
                wamid = msg.get("id")
                kind = msg.get("type")
                button = None
                if kind == "text":
                    text = msg["text"]["body"]
                elif kind == "button":
                    text, button = msg["button"].get("text", ""), msg["button"].get("payload")
                elif kind == "interactive":
                    it = msg["interactive"].get("button_reply") or msg["interactive"].get("list_reply") or {}
                    text, button = it.get("title", ""), it.get("id")
                else:
                    text = f"[{kind} message]"
                reply_to = (msg.get("context") or {}).get("id")
                # Save first; a repeated webhook (same WhatsApp id) is ignored.
                saved = db.one(
                    "insert into messages (direction, external_id, platform_message_id, reply_to, body) values ('in', %s, %s, %s, %s) "
                    "on conflict (platform_message_id) do nothing returning id",
                    (phone, wamid, reply_to, text),
                )
                if saved:
                    background.add_task(engine.handle, phone, text, wamid, reply_to, button)
    return {"ok": True}  # answer Meta at once; replies are sent after
