"""End-to-end tests against the real PostgreSQL (run inside the api container: docker compose exec api pytest -q).
WhatsApp sending is replaced by a list, so nothing is sent to Meta."""
import hashlib
import hmac
import io
import json
import re
import uuid
import docx
import pytest
from fastapi.testclient import TestClient
from app import config, db, whatsapp
from app.main import app

SECRET = "test-app-secret"
SENT: list[tuple[str, str]] = []


@pytest.fixture(scope="module")
def client():
    config.WA_APP_SECRET = SECRET
    config.WA_VERIFY_TOKEN = "verify-me"
    whatsapp._post = lambda to, body: (SENT.append((to, body)) or (f"wamid.out.{uuid.uuid4().hex}", None))
    with TestClient(app) as c:
        yield c


def wa(client, phone, text, wamid=None, reply_to=None, secret=SECRET):
    msg = {"from": phone, "id": wamid or f"wamid.in.{uuid.uuid4().hex}", "type": "text", "text": {"body": text}}
    if reply_to:
        msg["context"] = {"id": reply_to}
    raw = json.dumps({"entry": [{"changes": [{"value": {"messages": [msg]}}]}]}).encode()
    sig = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return client.post("/webhooks/whatsapp", content=raw, headers={"x-hub-signature-256": sig, "content-type": "application/json"})


def last_to(phone):
    return [b for to, b in SENT if to == phone][-1]


def latest_email(to):
    return db.one("select body from email_outbox where to_email = %s order by id desc limit 1", (to,))["body"]


def test_full_journey(client):
    email, phone = f"t{uuid.uuid4().hex[:8]}@jobsq.test", "91" + str(uuid.uuid4().int)[:10]
    c = client

    # sign up -> limited, email not confirmed
    r = c.post("/v1/auth/register", json={"name": "Test User", "phone": "+" + phone, "email": email, "password": "short"})
    assert r.status_code == 422
    r = c.post("/v1/auth/register", json={"name": "Test User", "phone": "+" + phone, "email": email, "password": "long-enough-1"})
    assert r.status_code == 200
    assert c.post("/v1/auth/register", json={"name": "X", "phone": "+" + phone, "email": email, "password": "long-enough-1"}).status_code == 409
    # one account per phone number, however it is typed; the country code is required
    again = {"name": "X", "email": "other-" + email, "password": "long-enough-1"}
    r = c.post("/v1/auth/register", json={**again, "phone": f"+{phone[:2]} {phone[2:7]}-{phone[7:]}"})
    assert r.status_code == 409 and "phone number" in r.json()["detail"]
    assert c.post("/v1/auth/register", json={**again, "phone": phone[2:]}).status_code == 422
    me = c.get("/v1/me").json()
    assert me["access"]["level"] == "limited" and not me["user"]["email_verified"]

    # a plan can't start before the email is confirmed; confirm it with the emailed link
    assert c.post("/v1/dev/activate-plan", json={"plan_code": "jobsq_ai"}).status_code == 403
    token = re.search(r"token=([\w-]+)", latest_email(email)).group(1)
    assert c.post("/v1/auth/verify-email", json={"token": token}).status_code == 200
    assert c.post("/v1/auth/verify-email", json={"token": token}).status_code == 400  # single use

    # no plan, no WhatsApp connection
    assert c.post("/v1/channels/whatsapp/link-code").status_code == 402

    # activate -> full
    r = c.post("/v1/dev/activate-plan", json={"plan_code": "jobsq_ai", "days": 30})
    assert r.json()["access"]["level"] == "full"

    # unknown number gets "sign up first"
    stranger = "91" + str(uuid.uuid4().int)[:10]
    assert wa(c, stranger, "hello").status_code == 200
    assert "isn't connected" in last_to(stranger)

    # link the number with a code from the website
    code = c.post("/v1/channels/whatsapp/link-code").json()["code"]
    wa(c, phone, f"my code {code}")
    assert "Linked!" in last_to(phone)
    assert c.get("/v1/me").json()["channel"]["external_id"] == phone

    # a connection code sent again from an already-linked number is explained, not "didn't catch that"
    code2 = c.post("/v1/channels/whatsapp/link-code").json()["code"]
    wa(c, phone, code2); assert "already connected to your JobsQ account" in last_to(phone)

    # full access: patterns are understood
    wa(c, phone, "status");   assert "Access: full" in last_to(phone)
    wa(c, phone, "go 1, 3");  assert "no shortlist yet" in last_to(phone)
    wa(c, phone, "find me some jobs"); assert "resume first" in last_to(phone)
    wa(c, phone, "blah");     assert "didn't catch" in last_to(phone)

    # a reply to one of our messages is recognised
    ours = db.one("select platform_message_id from messages where external_id = %s and direction = 'out' order by id desc limit 1", (phone,))["platform_message_id"]
    wa(c, phone, "about this", reply_to=ours); assert "You replied to my message" in last_to(phone)

    # a repeated webhook is ignored
    n = len(SENT); dup = f"wamid.in.{uuid.uuid4().hex}"
    wa(c, phone, "status", wamid=dup); wa(c, phone, "status", wamid=dup)
    assert len(SENT) == n + 1

    # plan ends -> one fixed reply, then silence for a while
    c.post("/v1/dev/end-plan")
    assert c.get("/v1/me").json()["access"]["level"] == "limited"
    n = len(SENT)
    wa(c, phone, "status"); assert "isn't active" in last_to(phone)
    wa(c, phone, "status"); assert len(SENT) == n + 1

    # suspended
    c.post("/v1/dev/activate-plan", json={"plan_code": "own_ai"})
    c.post("/v1/dev/suspend", json={"suspended": True})
    wa(c, phone, "status"); assert "suspended" in last_to(phone)
    c.post("/v1/dev/suspend", json={"suspended": False})

    # stop -> nothing is sent; start -> back on
    wa(c, phone, "stop"); assert "no more messages" in last_to(phone)
    n = len(SENT); wa(c, phone, "status"); assert len(SENT) == n
    wa(c, phone, "start"); assert "back on" in last_to(phone)

    # sign out, wrong password lock, password reset
    c.post("/v1/auth/logout")
    assert c.get("/v1/me").status_code == 401
    for _ in range(5):
        c.post("/v1/auth/login", json={"email": email, "password": "wrong-password"})
    assert c.post("/v1/auth/login", json={"email": email, "password": "long-enough-1"}).status_code == 429
    c.post("/v1/auth/password/forgot", json={"email": email})
    rt = re.search(r"token=([\w-]+)", latest_email(email)).group(1)
    assert c.post("/v1/auth/password/reset", json={"token": rt, "password": "new-password-2"}).status_code == 200
    assert c.post("/v1/auth/login", json={"email": email, "password": "new-password-2"}).status_code == 200


def test_webhook_security(client):
    assert wa(client, "919999999999", "hi", secret="wrong").status_code == 403
    assert client.get("/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "42"}).text == "42"
    assert client.get("/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "42"}).status_code == 403


def test_resume_is_read_before_there_is_an_account(client):
    from app.routers import resume
    resume._reads.clear()
    client.cookies.clear()
    doc, buf = docx.Document(), io.BytesIO()
    for line in ["Asha Verma", "asha@example.com | 98765 43210 | Hyderabad", "Summary", "Backend developer with 3 years of experience building APIs and data pipelines.",
                 "Skills", "Python, FastAPI, PostgreSQL", "Education", "B.Tech, Computer Science"]:
        doc.add_paragraph(line)
    doc.save(buf)
    files = {"file": ("cv.docx", buf.getvalue(), "application/octet-stream")}
    r = client.post("/v1/resume/read", files=files)
    assert r.status_code == 200 and r.json()["name"] == "Asha Verma" and r.json()["experience_years_mentioned"] == 3
    assert client.post("/v1/resume", files=files).status_code == 401  # saving still needs an account
    codes = [client.post("/v1/resume/read", files=files).status_code for _ in range(resume.READS_PER_ADDRESS)]
    assert codes[-1] == 429 and codes[:-1] == [200] * (resume.READS_PER_ADDRESS - 1)
    resume._reads.clear()

