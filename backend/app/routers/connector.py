"""The JobsQ Connector: a small app on the user's computer that runs the agents' AI work with their own
Claude Code or Codex subscription ("Your own AI" plan). It only makes outgoing requests, so it works behind any home router:

    POST /connector/next              "any work for me?" (waits up to 20 s), also tells us it's online
    POST /connector/tasks/{id}        "here's the answer"

In development, JobsQ's own connector (key CONNECTOR_HOUSE_KEY in .env) does the same for the "JobsQ AI" plan when there's
no ANTHROPIC_API_KEY.
"""
import hmac
import json
import time
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from .. import ai, config, db, worker
from ..deps import current_user, require_full
from ..security import new_token, token_hash

router = APIRouter(tags=["connector"])
WAIT_SECS = 20


# ---------------------------------------------------------------- for the signed-in user (website)
@router.post("/v1/connector/key")
def make_key(user: dict = Depends(current_user)):
    """A new connector key, shown once. Making a new one stops the old one working."""
    if require_full(user)["plan"] != "own_ai":
        raise HTTPException(403, "The connector is part of the Your own AI plan.")
    key = "jqc_" + new_token()
    db.run("insert into connectors (user_id, key_hash) values (%s, %s) on conflict (user_id) do update set key_hash = excluded.key_hash, "
           "last_seen_at = null, created_at = now()", (user["id"], token_hash(key)))
    server = "http://localhost:8000" if config.DEV_MODE or not config.PUBLIC_URL else config.PUBLIC_URL
    return {"key": key, "server": server}


@router.get("/v1/connector/status")
def status(user: dict = Depends(current_user)):
    row = db.one("select tool, last_seen_at, created_at from connectors where user_id = %s", (user["id"],))
    return {"has_key": bool(row), "online": ai.connector_online(user["id"]), "tool": row["tool"] if row else None,
            "last_seen_at": row["last_seen_at"] if row else None}


# ---------------------------------------------------------------- for the connector app
def _owner(authorization: str) -> tuple[str, int | None]:
    """('house', None) or ('user', user_id) for the key in the Authorization header."""
    key = authorization.removeprefix("Bearer ").strip()
    if not key:
        raise HTTPException(401, "Missing connector key.")
    if config.HOUSE_CONNECTOR_KEY and hmac.compare_digest(key, config.HOUSE_CONNECTOR_KEY):
        return "house", None
    row = db.one("select user_id from connectors where key_hash = %s", (token_hash(key),))
    if not row:
        raise HTTPException(401, "This connector key isn't valid any more. Make a new one in JobsQ (Settings, Your AI).")
    return "user", row["user_id"]


def _seen(kind: str, owner: int | None, tool: str) -> None:
    if kind == "house":
        db.run("insert into house_connector (id, tool, last_seen_at) values (1, %s, now()) on conflict (id) do update set tool = excluded.tool, last_seen_at = now()", (tool,))
        return
    db.run("update connectors set tool = %s, last_seen_at = now() where user_id = %s", (tool, owner))
    # The resume was saved while the connector was off: read it now that the AI is available.
    if db.one("select 1 from profiles where user_id = %s and resume_text <> '' and data->>'name' is null and not (data ? 'reading') "
              "and coalesce(data->>'read_error', %s) = %s", (owner, ai.OFFLINE_USER, ai.OFFLINE_USER)):
        worker.start_profile_read(owner)


class NextIn(BaseModel):
    tool: str = "claude"
    version: str = ""


@router.post("/connector/next")
def next_task(body: NextIn, authorization: str = Header("")):
    kind, owner = _owner(authorization)
    tool = body.tool if body.tool in ("claude", "codex") else "claude"
    end = time.time() + WAIT_SECS
    while True:
        _seen(kind, owner, tool)
        with db.pool.connection() as c:
            t = c.execute(
                "update ai_tasks set status = 'running', claimed_at = now() where id = ("
                " select id from ai_tasks where status = 'queued' and owner_user_id is not distinct from %s order by id limit 1 for update skip locked"
                ") returning id, system, prompt, web, agent", (owner,)).fetchone()
        if t:
            return {"task": t}
        if time.time() >= end:
            return {"task": None}
        time.sleep(1)


class ResultIn(BaseModel):
    ok: bool
    text: str = ""
    error: str | None = None
    usage: dict | None = None


@router.post("/connector/tasks/{task_id}")
def task_result(task_id: int, body: ResultIn, authorization: str = Header("")):
    _, owner = _owner(authorization)
    done = db.one(
        "update ai_tasks set status = %s, result = %s, error = %s, usage = %s, finished_at = now() "
        "where id = %s and owner_user_id is not distinct from %s and status = 'running' returning id",
        ("done" if body.ok else "failed", body.text if body.ok else None, None if body.ok else (body.error or "error")[:500],
         json.dumps(body.usage or {}), task_id, owner))
    if not done:
        raise HTTPException(404, "No such running task.")
    return {"ok": True}
