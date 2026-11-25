"""Runs agent work in the background (an agent can take a minute or more), then saves the result where the website shows it,
and also sends it on WhatsApp when the request came from WhatsApp."""
import hashlib
import hmac
import json
import logging
import re
import traceback
from concurrent.futures import ThreadPoolExecutor
from .access import access_for
from . import agents, ai, config, db

log = logging.getLogger("worker")
pool = ThreadPoolExecutor(max_workers=3)


def submit(fn, *args) -> None:
    def wrapped():
        try:
            fn(*args)
        except Exception:
            log.error("background job failed:\n%s", traceback.format_exc())
    pool.submit(wrapped)


def file_sig(file_id: str) -> str:
    return hmac.new(config.PASSWORD_PEPPER.encode(), f"file:{file_id}".encode(), hashlib.sha256).hexdigest()[:32]


def public_file_url(file_id: str) -> str | None:
    return f"{config.PUBLIC_URL}/files/{file_id}?sig={file_sig(file_id)}" if config.PUBLIC_URL else None


def to_whatsapp(md: str) -> str:
    md = re.sub(r"^#{1,6}\s+(.*)$", r"*\1*", md, flags=re.M)
    md = re.sub(r"\*\*(.+?)\*\*", r"*\1*", md)
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r"\1: \2", md)


def _err(e: Exception) -> str:
    return str(e) if isinstance(e, ai.AIError) else "Something went wrong while working on this. Try again."


# ---------------------------------------------------------------- resume -> profile
def run_profile(user_id: int) -> None:
    p = db.one("select resume_text from profiles where user_id = %s", (user_id,))
    try:
        agents.read_profile(user_id, p["resume_text"])
    except Exception as e:
        log.warning("profile read failed: %s", e)
        db.run("update profiles set data = (data - 'reading') || %s::jsonb where user_id = %s", (json.dumps({"read_error": _err(e)}), user_id))


def start_profile_read(user_id: int) -> None:
    """The AI reads the saved resume into the profile (in the background). Needs an active plan."""
    if access_for(user_id)["level"] != "full":  # checked here so that no path can start a paid read without a plan
        return
    db.run("update profiles set data = (data - 'read_error' - 'name') || '{\"reading\": true}'::jsonb where user_id = %s", (user_id,))
    submit(run_profile, user_id)


def on_plan_started(user_id: int) -> None:
    """Called when a plan starts (test button now; the payment webhook later). A resume saved before paying is read now,
    so the user can go straight to Find jobs."""
    if db.one("select 1 from profiles where user_id = %s and resume_text <> '' and data->>'name' is null", (user_id,)):
        start_profile_read(user_id)


# ---------------------------------------------------------------- a job's steps
def mark_applied(user_id: int, application_id: int, phone: str | None = None) -> None:
    """The user applied: record it, then find people who can refer them."""
    db.run("update applications set status = case when status = 'saved' then 'applied' else status end, "
           "done = done || '{\"applied\": true}'::jsonb, updated_at = now() where id = %s", (application_id,))
    db.run("insert into thread_messages (application_id, role, body) values (%s, 'system', 'You applied. Nice work.')", (application_id,))
    start_thread_task(user_id, application_id, "Find people at this company who could refer me.", "research", phone)


# ---------------------------------------------------------------- Scout
def run_scout(run_id: int, user_id: int, phone: str | None = None) -> None:
    db.run("update scout_runs set status = 'running' where id = %s", (run_id,))
    try:
        out = agents.scout(user_id, run_id)
        db.run("update scout_runs set status = 'done', summary = %s, picks = %s where id = %s", (out["summary"], json.dumps(out["picks"]), run_id))
        if phone:
            from .whatsapp import send
            send(phone, to_whatsapp(f"**Scout found {len(out['picks'])} jobs.** {out['summary']}"), user_id, "scout_done")
            for i, j in enumerate(out["picks"], 1):  # one message per job, so each link shows its preview card
                send(phone, f"*{i}. {j['company']} – {j['title']}*\n{j.get('location') or ''}{' · ' + j['salary'] if j.get('salary') else ''}\n{j.get('why') or ''}\n{j.get('link') or ''}",
                     user_id, "scout_pick")
            if out["picks"]:
                send(phone, "Reply *go* with the numbers you like, e.g. *go 1, 3*. I'll tailor your resume for each one.", user_id, "scout_done")
    except Exception as e:
        log.exception("scout run %s failed", run_id)
        db.run("update scout_runs set status = 'failed', error = %s where id = %s", (_err(e), run_id))
        if phone:
            from .whatsapp import send
            send(phone, f"Scout couldn't finish: {_err(e)}", user_id, "scout_failed")


# ---------------------------------------------------------------- job threads
def run_thread(placeholder_id: int, application_id: int, agent: str, ask: str, user_id: int, phone: str | None = None) -> None:
    app = db.one("select * from applications where id = %s", (application_id,))
    try:
        body, files = agents.AGENTS[agent](user_id, app, ask)
        db.run("update thread_messages set body = %s, status = 'done', files = %s where id = %s", (body, json.dumps(files), placeholder_id))
        db.run("update applications set done = done || %s::jsonb, updated_at = now() where id = %s", (json.dumps({agent: True}), application_id))
        if phone:
            from .whatsapp import send, send_document
            send(phone, to_whatsapp(f"*A{app['number']}* · " + body), user_id, f"thread_{agent}", application_id)
            for f in files:
                url = public_file_url(f["file_id"])
                if url:
                    send_document(phone, url, f["name"], user_id, application_id)
    except Exception as e:
        log.exception("%s for application %s failed", agent, application_id)
        db.run("update thread_messages set body = %s, status = 'failed' where id = %s", (_err(e), placeholder_id))
        if phone:
            from .whatsapp import send
            send(phone, f"A{app['number']}: {_err(e)}", user_id, "thread_failed", application_id)


def start_thread_task(user_id: int, application_id: int, text: str, agent: str | None = None, phone: str | None = None) -> int:
    agent = agent or agents.pick_agent(text)
    db.run("insert into thread_messages (application_id, role, body) values (%s, 'user', %s)", (application_id, text))
    ph = db.one("insert into thread_messages (application_id, role, agent, status) values (%s, 'agent', %s, 'working') returning id", (application_id, agent))
    db.run("update applications set updated_at = now() where id = %s", (application_id,))
    submit(run_thread, ph["id"], application_id, agent, text, user_id, phone)
    return ph["id"]
