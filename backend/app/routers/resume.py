"""Resume: read it straight away (no AI, nothing stored) so the sign-up form fills itself in, then save it once there's an account.
Saving works before paying: the resume waits in our database, and the AI reads it as soon as a plan starts."""
import io
import json
import re
import time
import uuid
import zipfile
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from .. import config, db, worker
from ..access import access_for
from ..deps import current_user
from ..resume_parse import parse

router = APIRouter(prefix="/v1/resume", tags=["resume"])
MAX_BYTES = 5 * 1024 * 1024
MAX_UNZIPPED = 50 * 1024 * 1024
BASIC_FIELDS = ("name", "email", "phone", "location", "years", "skills")

# /read needs no account (it fills the sign-up form), so it is limited: per address and in total, per minute.
READS_PER_ADDRESS, READS_TOTAL = 10, 60
_reads: list[tuple[float, str]] = []


def _limit_reads(address: str) -> None:
    now = time.time()
    _reads[:] = [(t, a) for t, a in _reads if now - t < 60]
    if len(_reads) >= READS_TOTAL or sum(a == address for _, a in _reads) >= READS_PER_ADDRESS:
        raise HTTPException(429, "Too many uploads. Wait a minute and try again.")
    _reads.append((now, address))


async def _read(file: UploadFile) -> tuple[bytes, str, str]:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "The file is over 5 MB.")
    name = (file.filename or "resume").lower()
    text, ext = await run_in_threadpool(_extract, data, name)  # parsing is slow: keep it off the event loop
    return data, text, ext


def _extract(data: bytes, name: str) -> tuple[str, str]:
    try:
        if name.endswith(".pdf") or data[:4] == b"%PDF":
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                text = "\n".join((p.extract_text() or "") for p in pdf.pages[:6])
            ext = "pdf"
        elif name.endswith(".docx"):
            import docx
            if sum(i.file_size for i in zipfile.ZipFile(io.BytesIO(data)).infolist()) > MAX_UNZIPPED:
                raise HTTPException(413, "This Word file is too large once opened.")
            text = "\n".join(p.text for p in docx.Document(io.BytesIO(data)).paragraphs)
            ext = "docx"
        else:
            raise HTTPException(415, "Upload a PDF or a Word (.docx) file.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "We couldn't read this file. Try saving it again as PDF.")
    text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) < 100:
        raise HTTPException(422, "We found almost no text in this file. If it's a scanned image, upload a text PDF or a Word file.")
    return text, ext


@router.post("/read")
async def read_now(request: Request, file: UploadFile = File(...)):
    """Fills the sign-up form: name, contact, location, skills and sections. No account needed, no AI call, nothing stored."""
    _limit_reads(request.headers.get("x-forwarded-for", "").split(",")[-1].strip() or (request.client.host if request.client else ""))
    _, text, _ = await _read(file)
    return {"chars": len(text), **parse(text)}


def _basics(raw: str) -> dict:
    try:
        b = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    out = {k: str(b.get(k) or "").strip()[:200] for k in BASIC_FIELDS if k != "skills"}
    out["skills"] = [str(s).strip()[:60] for s in (b.get("skills") or []) if str(s).strip()][:60]
    return out


@router.post("")
async def store(file: UploadFile = File(...), basics: str = Form("{}"), user: dict = Depends(current_user)):
    data, text, ext = await _read(file)
    folder = Path(config.UPLOAD_DIR) / str(user["id"])
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uuid.uuid4().hex}.{ext}"
    path.write_bytes(data)
    db.run(
        "insert into resumes (user_id, filename, stored_path, text_chars, text_excerpt) values (%s, %s, %s, %s, %s)",
        (user["id"], (file.filename or f"resume.{ext}")[:200], str(path), len(text), text[:2000]),
    )
    db.run("insert into profiles (user_id, resume_text, basics) values (%s, %s, %s) on conflict (user_id) do update set "
           "resume_text = excluded.resume_text, basics = excluded.basics, data = '{}'::jsonb, updated_at = now()",
           (user["id"], text, json.dumps(_basics(basics))))
    if access_for(user["id"])["level"] == "full":
        worker.start_profile_read(user["id"])
        return {"ok": True, "reading": True, "message": "Resume saved. The AI is reading it; this takes about a minute."}
    return {"ok": True, "reading": False, "message": "Resume saved. We'll read it as soon as your plan starts."}


@router.post("/reread")
def reread(user: dict = Depends(current_user)):
    if access_for(user["id"])["level"] != "full":
        raise HTTPException(402, "Start a plan first.")
    if not db.one("select 1 from profiles where user_id = %s and resume_text <> ''", (user["id"],)):
        raise HTTPException(409, "Save your resume first.")
    worker.start_profile_read(user["id"])
    return {"ok": True}


@router.get("")
def current(user: dict = Depends(current_user)):
    return db.one("select filename, text_chars, text_excerpt, created_at from resumes where user_id = %s order by id desc limit 1", (user["id"],))
