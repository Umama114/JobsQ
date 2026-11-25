"""Profile and preferences, Scout, applications and their steps, LinkedIn connections, and file downloads.

A job's steps, in order: tailor the resume -> apply -> find people who can refer you -> LinkedIn messages and
referral emails -> (when the company replies) interview prep."""
import csv
import io
import json
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .. import ai, db, worker
from ..agents import APPLIED_RE, LABELS, company_key
from ..deps import current_user, require_full

router = APIRouter(tags=["work"])
STATUSES = ("saved", "applied", "interviewing", "offer", "rejected", "archived")


# ---------------------------------------------------------------- profile
@router.get("/v1/profile")
def get_profile(user: dict = Depends(current_user)):
    p = db.one("select data, prefs, basics, updated_at, length(resume_text) as chars from profiles where user_id = %s", (user["id"],))
    return p or {"data": {}, "prefs": {}, "basics": {}, "updated_at": None, "chars": 0}


class PrefsIn(BaseModel):
    roles: list[str] = []
    locations: list[str] = []
    level: str | None = None
    remote: bool = True
    min_salary: int | None = None


@router.put("/v1/profile/prefs")
def set_prefs(body: PrefsIn, user: dict = Depends(current_user)):
    prefs = {**body.model_dump(), "roles": [r.strip() for r in body.roles if r.strip()][:6], "locations": [l.strip() for l in body.locations if l.strip()][:6]}
    db.run("insert into profiles (user_id, prefs) values (%s, %s) on conflict (user_id) do update set prefs = excluded.prefs, updated_at = now()",
           (user["id"], json.dumps(prefs)))
    return {"ok": True, "prefs": prefs}


@router.get("/v1/ai/status")
def ai_status(user: dict = Depends(current_user)):
    where, owner = ai.route(user["id"])
    return {"provider": ai.provider(), "route": where, "online": where == "api" or ai.connector_online(owner)}


# ---------------------------------------------------------------- Scout
@router.post("/v1/scout/runs")
def start_scout(user: dict = Depends(current_user)):
    require_full(user)
    if not db.one("select 1 from profiles where user_id = %s and resume_text <> ''", (user["id"],)):
        raise HTTPException(409, "Upload your resume first. Scout uses it to judge which jobs fit.")
    if db.one("select 1 from scout_runs where user_id = %s and status in ('queued','running') and created_at > now() - interval '15 minutes'", (user["id"],)):
        raise HTTPException(409, "Scout is already searching for you.")
    run = db.one("insert into scout_runs (user_id, status) values (%s, 'queued') returning id", (user["id"],))
    worker.submit(worker.run_scout, run["id"], user["id"], None)
    return {"id": run["id"]}


@router.get("/v1/scout/runs/latest")
def latest_scout(user: dict = Depends(current_user)):
    run = db.one("select id, status, summary, picks, error, created_at from scout_runs where user_id = %s order by id desc limit 1", (user["id"],))
    if run:
        tracked = {(a["job"].get("link") or a["job"].get("title")): a["id"] for a in db.all_rows("select id, job from applications where user_id = %s", (user["id"],))}
        for p in run["picks"]:
            p["application_id"] = tracked.get(p.get("link") or p.get("title"))
            p["tracked"] = p["application_id"] is not None
    return run


# ---------------------------------------------------------------- applications
def _next_number(user_id: int) -> int:
    return db.one("select coalesce(max(number), 0) + 1 as n from applications where user_id = %s", (user_id,))["n"]


def create_application(user_id: int, job: dict, status: str = "saved") -> dict:
    key = job.get("link") or job.get("title")
    existing = next((a for a in db.all_rows("select id, number, job from applications where user_id = %s", (user_id,))
                     if (a["job"].get("link") or a["job"].get("title")) == key), None)
    if existing:
        return {"id": existing["id"], "number": existing["number"], "existing": True}
    job = {k: job.get(k) for k in ("title", "company", "location", "salary", "link", "source", "logo", "remote", "posted", "description", "why", "match", "company_website")}
    row = db.one("insert into applications (user_id, number, job, status) values (%s, %s, %s, %s) returning id, number",
                 (user_id, _next_number(user_id), json.dumps(job), status))
    db.run("insert into thread_messages (application_id, role, body) values (%s, 'system', %s)",
           (row["id"], f"**{job.get('company')} – {job.get('title')}** is in your Applications. The steps: tailor your resume, apply, "
                       "find people who can refer you, message them, then prepare for the interview when the company replies. "
                       "Just follow the **Next step** button."))
    return {"id": row["id"], "number": row["number"], "existing": False}


class ApplyIn(BaseModel):
    run_id: int
    index: int
    tailor: bool = True


@router.post("/v1/applications")
def add_application(body: ApplyIn, user: dict = Depends(current_user)):
    require_full(user)
    run = db.one("select picks from scout_runs where id = %s and user_id = %s", (body.run_id, user["id"]))
    if not run or not (0 <= body.index < len(run["picks"])):
        raise HTTPException(404, "That job isn't in your shortlist any more.")
    res = create_application(user["id"], run["picks"][body.index])
    if body.tailor and not res["existing"]:  # step 1 starts right away: the resume tailored for this job
        worker.start_thread_task(user["id"], res["id"], "Tailor my resume for this job.", "resume")
    return res


@router.get("/v1/applications")
def list_applications(user: dict = Depends(current_user)):
    return db.all_rows(
        "select a.id, a.number, a.job - 'description' as job, a.status, a.done, a.created_at, a.updated_at, "
        "(select count(*) from thread_messages t where t.application_id = a.id and t.status = 'working') as working "
        "from applications a where a.user_id = %s order by a.updated_at desc", (user["id"],))


def _own(app_id: int, user: dict) -> dict:
    a = db.one("select * from applications where id = %s and user_id = %s", (app_id, user["id"]))
    if not a:
        raise HTTPException(404, "Application not found.")
    return a


def _not_busy(app_id: int) -> None:
    if db.one("select 1 from thread_messages where application_id = %s and status = 'working' and created_at > now() - interval '15 minutes'", (app_id,)):
        raise HTTPException(409, "An agent is still working on this job. Wait for it to finish.")


@router.get("/v1/applications/{app_id}")
def get_application(app_id: int, user: dict = Depends(current_user)):
    a = _own(app_id, user)
    a["messages"] = db.all_rows("select id, role, agent, body, status, files, created_at from thread_messages where application_id = %s order by id", (app_id,))
    a["labels"] = LABELS
    return a


class PatchIn(BaseModel):
    status: str | None = None
    notes: str | None = None


@router.patch("/v1/applications/{app_id}")
def update_application(app_id: int, body: PatchIn, user: dict = Depends(current_user)):
    _own(app_id, user)
    if body.notes is not None:
        db.run("update applications set notes = %s where id = %s", (body.notes[:5000], app_id))
    if body.status is not None:
        if body.status not in STATUSES:
            raise HTTPException(422, "Unknown status.")
        db.run("update applications set status = %s, updated_at = now() where id = %s", (body.status, app_id))
        db.run("insert into thread_messages (application_id, role, body) values (%s, 'system', %s)", (app_id, f"Status changed to **{body.status}**."))
    return {"ok": True}


@router.post("/v1/applications/{app_id}/applied")
def applied(app_id: int, user: dict = Depends(current_user)):
    """The user applied. Finding people who can refer them starts right away."""
    require_full(user)
    _own(app_id, user)
    _not_busy(app_id)
    worker.mark_applied(user["id"], app_id)
    return {"ok": True}


@router.post("/v1/applications/{app_id}/replied")
def replied(app_id: int, user: dict = Depends(current_user)):
    """The company replied or shortlisted the user: interview prep starts."""
    require_full(user)
    _own(app_id, user)
    _not_busy(app_id)
    db.run("update applications set status = 'interviewing', updated_at = now() where id = %s", (app_id,))
    worker.start_thread_task(user["id"], app_id, "The company replied / shortlisted me. Prepare me for the interview.", "prep")
    return {"ok": True}


class ThreadIn(BaseModel):
    text: str = ""
    agent: str | None = None


DEFAULT_ASK = {"research": "Find people at this company who could refer me.", "resume": "Tailor my resume for this job.",
               "email": "Write referral emails.", "linkedin": "Write LinkedIn messages.", "prep": "Help me prepare for the interview."}


@router.post("/v1/applications/{app_id}/messages")
def post_message(app_id: int, body: ThreadIn, user: dict = Depends(current_user)):
    require_full(user)
    _own(app_id, user)
    if body.agent and body.agent not in LABELS:
        raise HTTPException(422, "Unknown agent.")
    text = body.text.strip() or DEFAULT_ASK.get(body.agent or "", "")
    if not text:
        raise HTTPException(422, "Type a message first.")
    _not_busy(app_id)
    if not body.agent and APPLIED_RE.match(text):  # "I applied" typed in the thread
        worker.mark_applied(user["id"], app_id)
        return {"ok": True}
    worker.start_thread_task(user["id"], app_id, text, body.agent)
    return {"ok": True}


# ---------------------------------------------------------------- LinkedIn connections (for referrals)
@router.post("/v1/connections")
async def upload_connections(file: UploadFile = File(...), user: dict = Depends(current_user)):
    """LinkedIn's export file Connections.csv. A few note lines come before the header row."""
    raw = (await file.read())[:10_000_000].decode("utf-8-sig", errors="replace")
    lines = raw.splitlines()
    start = next((i for i, line in enumerate(lines) if line.lower().startswith("first name")), None)
    if start is None:
        raise HTTPException(422, "This doesn't look like LinkedIn's Connections.csv (it needs a row starting with 'First Name').")
    people = []
    for r in list(csv.DictReader(io.StringIO("\n".join(lines[start:]))))[:30000]:
        name = f"{(r.get('First Name') or '').strip()} {(r.get('Last Name') or '').strip()}".strip()
        if name:
            company = (r.get("Company") or "").strip()
            people.append((user["id"], name[:200], (r.get("URL") or "").strip()[:300], (r.get("Email Address") or "").strip()[:200],
                           company[:200], company_key(company), (r.get("Position") or "").strip()[:200]))
    with db.pool.connection() as c:
        c.execute("delete from connections where user_id = %s", (user["id"],))
        with c.cursor() as cur:
            cur.executemany("insert into connections (user_id, name, url, email, company, company_key, position) values (%s,%s,%s,%s,%s,%s,%s)", people)
    return {"ok": True, "count": len(people)}


@router.get("/v1/connections")
def connections_summary(user: dict = Depends(current_user)):
    return db.one("select count(*) as count, max(created_at) as uploaded_at from connections where user_id = %s", (user["id"],))


# ---------------------------------------------------------------- files
@router.get("/v1/files/{file_id}")
def download(file_id: str, inline: bool = False, user: dict = Depends(current_user)):
    f = db.one("select * from files where id = %s and user_id = %s", (file_id, user["id"]))
    if not f:
        raise HTTPException(404, "File not found.")
    return FileResponse(f["path"], media_type=f["mime"], filename=f["name"], content_disposition_type="inline" if inline else "attachment")


@router.get("/files/{file_id}")
def public_download(file_id: str, sig: str = ""):
    """Signed link for WhatsApp to fetch a file (no sign-in possible there)."""
    import hmac as _h
    if not _h.compare_digest(sig, worker.file_sig(file_id)):
        raise HTTPException(404, "Not found")
    f = db.one("select * from files where id = %s", (file_id,))
    if not f:
        raise HTTPException(404, "Not found")
    return FileResponse(f["path"], media_type=f["mime"], filename=f["name"])
