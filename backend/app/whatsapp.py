"""WhatsApp Cloud API: check Meta's webhook signature, and send text messages (every message sent is saved)."""
import hashlib
import hmac
import logging
import httpx
from . import config, db

log = logging.getLogger("whatsapp")


def signature_ok(raw_body: bytes, header: str | None) -> bool:
    """Meta signs the raw body with the App Secret: X-Hub-Signature-256 = 'sha256=' + HMAC-SHA256 hex."""
    if not config.WA_APP_SECRET or not header:
        return False
    expected = "sha256=" + hmac.new(config.WA_APP_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)


def _post(to: str, body: str) -> tuple[str | None, str | None]:
    """Returns (WhatsApp message id, error). Tests replace this function."""
    if not (config.WA_TOKEN and config.WA_PHONE_NUMBER_ID):
        return None, "WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set"
    try:
        r = httpx.post(
            f"{config.GRAPH}/{config.WA_PHONE_NUMBER_ID}/messages",
            headers={"Authorization": f"Bearer {config.WA_TOKEN}"},
            json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": body, "preview_url": True}},
            timeout=20,
        )
        if r.status_code >= 400:
            return None, f"WhatsApp API {r.status_code}: {r.text[:300]}"
        return (r.json().get("messages") or [{}])[0].get("id"), None
    except httpx.HTTPError as e:
        return None, f"WhatsApp API unreachable: {e}"


def send(to: str, body: str, user_id: int | None, intent: str, application_id: int | None = None) -> None:
    """application_id: which job this message is about, so a reply to it goes to that job."""
    for part in _split(body):
        wamid, error = _post(to, part)
        if error:
            log.warning("send failed: %s", error)
        db.run(
            "insert into messages (user_id, direction, external_id, platform_message_id, body, intent, status, error, application_id) "
            "values (%s, 'out', %s, %s, %s, %s, %s, %s, %s)",
            (user_id, to, wamid, part, intent, "failed" if error else "sent", error, application_id),
        )


def send_document(to: str, url: str, filename: str, user_id: int | None, application_id: int | None = None) -> None:
    """Sends a file (the tailored resume PDF). WhatsApp downloads it from our public link."""
    wamid, error = None, None
    if not (config.WA_TOKEN and config.WA_PHONE_NUMBER_ID):
        error = "WhatsApp is not configured"
    else:
        try:
            r = httpx.post(f"{config.GRAPH}/{config.WA_PHONE_NUMBER_ID}/messages", headers={"Authorization": f"Bearer {config.WA_TOKEN}"},
                           json={"messaging_product": "whatsapp", "to": to, "type": "document", "document": {"link": url, "filename": filename}}, timeout=30)
            if r.status_code >= 400:
                error = f"WhatsApp API {r.status_code}: {r.text[:300]}"
            else:
                wamid = (r.json().get("messages") or [{}])[0].get("id")
        except httpx.HTTPError as e:
            error = f"WhatsApp API unreachable: {e}"
    db.run("insert into messages (user_id, direction, external_id, platform_message_id, body, intent, status, error, application_id) "
           "values (%s, 'out', %s, %s, %s, 'file', %s, %s, %s)", (user_id, to, wamid, f"[file] {filename}", "failed" if error else "sent", error, application_id))


def _split(text: str, limit: int = 3500) -> list[str]:
    """WhatsApp allows 4,096 characters per message; split on lines below that."""
    parts, cur = [], ""
    for line in text.split("\n"):
        if cur and len(cur) + len(line) + 1 > limit:
            parts.append(cur)
            cur = ""
        cur = f"{cur}\n{line}" if cur else line
    return parts + ([cur] if cur else [])
