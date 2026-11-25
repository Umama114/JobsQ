"""The "Your own AI" plan: AI work waits in a queue until the user's JobsQ Connector picks it up and sends the answer back."""
import threading
import uuid
import pytest
from fastapi.testclient import TestClient
from app import ai, config, db, worker
from app.main import app
from app.routers import connector

REAL_COMPLETE = ai.complete  # kept before other test modules swap in a stand-in AI


@pytest.fixture(scope="module")
def client():
    connector.WAIT_SECS = 1
    config.CONNECTOR_ONLINE_SECS = 90
    with TestClient(app) as c:
        yield c


def _user(c, plan):
    email = f"c{uuid.uuid4().hex[:8]}@jobsq.test"
    c.post("/v1/auth/register", json={"name": "Conn Test", "phone": "+91" + str(uuid.uuid4().int)[:10], "email": email, "password": "long-enough-1"})
    uid = db.one("select id from users where email = %s", (email,))["id"]
    db.run("update users set email_verified_at = now() where id = %s", (uid,))
    assert c.post("/v1/dev/activate-plan", json={"plan_code": plan}).status_code == 200
    return uid


def test_own_ai_goes_through_the_users_connector(client):
    c = client
    uid = _user(c, "own_ai")
    assert ai.route(uid) == ("user", uid)
    # no connector yet: a clear message, no waiting
    with pytest.raises(ai.AIError, match="Connector isn't running"):
        REAL_COMPLETE("sys", "hi", agent="test", user_id=uid)
    assert c.get("/v1/connector/status").json() == {"has_key": False, "online": False, "tool": None, "last_seen_at": None}

    key = c.post("/v1/connector/key").json()["key"]
    auth = {"Authorization": f"Bearer {key}"}
    assert c.post("/connector/next", json={"tool": "codex"}, headers={"Authorization": "Bearer jqc_wrong"}).status_code == 401
    assert c.post("/connector/next", json={"tool": "codex"}, headers=auth).json() == {"task": None}   # now online
    st = c.get("/v1/connector/status").json()
    assert st["online"] and st["tool"] == "codex"

    out = {}
    t = threading.Thread(target=lambda: out.update(text=REAL_COMPLETE("be brief", "say hi", web=True, agent="test", user_id=uid)))
    t.start()
    task = None
    for _ in range(10):
        task = c.post("/connector/next", json={"tool": "codex"}, headers=auth).json()["task"]
        if task:
            break
    assert task and task["prompt"] == "say hi" and task["system"] == "be brief" and task["web"] is True
    assert c.post(f"/connector/tasks/{task['id']}", json={"ok": True, "text": "hi!", "usage": {"input": 5}}, headers=auth).status_code == 200
    t.join(10)
    assert out["text"] == "hi!"
    assert db.one("select provider, ok from ai_calls where user_id = %s order by id desc limit 1", (uid,)) == {"provider": "user", "ok": True}

    # another user's connector never sees this user's work
    other = _user(c, "own_ai")
    okey = c.post("/v1/connector/key").json()["key"]
    db.run("insert into ai_tasks (owner_user_id, system, prompt) values (%s, 's', 'private')", (uid,))
    assert c.post("/connector/next", json={}, headers={"Authorization": f"Bearer {okey}"}).json()["task"] is None
    assert other != uid


def test_jobsq_ai_without_api_key_uses_the_house_connector(client):
    c = client
    uid = _user(c, "jobsq_ai")
    old = config.ANTHROPIC_API_KEY, config.HOUSE_CONNECTOR_KEY
    config.ANTHROPIC_API_KEY, config.HOUSE_CONNECTOR_KEY = "", "house-test-key"
    try:
        assert ai.route(uid) == ("house", None)
        db.run("update house_connector set last_seen_at = null")
        with pytest.raises(ai.AIError, match="connector/jobsq-connector.mjs --house"):
            REAL_COMPLETE("s", "p", user_id=uid)
        assert c.post("/connector/next", json={"tool": "claude"}, headers={"Authorization": "Bearer house-test-key"}).json() == {"task": None}
        assert ai.connector_online(None)
        config.ANTHROPIC_API_KEY = "sk-test"
        assert ai.route(uid) == ("api", None)   # with a key, the JobsQ AI plan uses the Claude API
    finally:
        config.ANTHROPIC_API_KEY, config.HOUSE_CONNECTOR_KEY = old


def test_no_ai_read_without_the_right_plan(client):
    c = client
    uid = _user(c, "jobsq_ai")
    assert c.post("/v1/connector/key").status_code == 403       # the connector belongs to the Your own AI plan
    db.run("insert into profiles (user_id, resume_text) values (%s, 'my resume')", (uid,))
    c.post("/v1/dev/end-plan")
    assert c.post("/v1/connector/key").status_code == 402       # and needs an active plan
    worker.start_profile_read(uid)                              # whatever asks, nothing is read without a plan
    assert db.one("select data from profiles where user_id = %s", (uid,))["data"] == {}
    assert not db.one("select 1 from ai_tasks where owner_user_id = %s", (uid,))

