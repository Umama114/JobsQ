"""Turns a tailored resume (structured data from the Resume agent) into a one-page PDF.
Code fills a fixed HTML template with escaped values (the AI never writes HTML), then Gotenberg prints it."""
import html
import io
import httpx
from pypdf import PdfReader
from . import config

CSS = """
@page { size: A4; margin: 13mm 14mm; }
body { font: 10pt/1.38 'Segoe UI', Arial, sans-serif; color: #1b1b1b; margin: 0; }
h1 { font-size: 19pt; margin: 0; letter-spacing: -0.2px; }
.headline { color: #3a3a3a; font-size: 10.5pt; margin: 1px 0 3px; }
.contact { color: #555; font-size: 9pt; }
h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .8px; color: #0f6e56; border-bottom: 1px solid #cfe3dc; padding-bottom: 2px; margin: 11px 0 5px; }
.item { margin: 0 0 6px; } .row { display: flex; justify-content: space-between; gap: 8px; }
.t { font-weight: 600; } .m { color: #555; font-size: 9pt; white-space: nowrap; }
ul { margin: 2px 0 0; padding-left: 15px; } li { margin: 1px 0; }
.skills div { margin: 1px 0; } .skills b { font-weight: 600; }
"""


def _e(s) -> str:
    return html.escape(str(s or ""))


def to_html(r: dict) -> str:
    contact = " · ".join(_e(x) for x in [r.get("location"), r.get("email"), r.get("phone"), *(r.get("links") or [])] if x)
    parts = [f"<h1>{_e(r.get('name'))}</h1>"]
    if r.get("headline"):
        parts.append(f"<div class='headline'>{_e(r['headline'])}</div>")
    parts.append(f"<div class='contact'>{contact}</div>")
    if r.get("summary"):
        parts.append(f"<h2>Summary</h2><div>{_e(r['summary'])}</div>")
    if r.get("skills"):
        rows = "".join(f"<div><b>{_e(g.get('group'))}:</b> {_e(', '.join(g.get('items') or []))}</div>" for g in r["skills"] if g.get("items"))
        parts.append(f"<h2>Skills</h2><div class='skills'>{rows}</div>")
    for key, title in (("experience", "Experience"), ("projects", "Projects")):
        items = r.get(key) or []
        if not items:
            continue
        body = ""
        for it in items:
            bullets = "".join(f"<li>{_e(b)}</li>" for b in (it.get("bullets") or []))
            head = _e(it.get("title")) + (f" — {_e(it.get('org'))}" if it.get("org") else "")
            body += f"<div class='item'><div class='row'><span class='t'>{head}</span><span class='m'>{_e(it.get('dates'))}</span></div>{'<ul>' + bullets + '</ul>' if bullets else ''}</div>"
        parts.append(f"<h2>{title}</h2>{body}")
    if r.get("education"):
        body = "".join(f"<div class='item'><div class='row'><span class='t'>{_e(e.get('degree'))}{' — ' + _e(e.get('school')) if e.get('school') else ''}</span><span class='m'>{_e(e.get('dates'))}</span></div>{('<div>' + _e(e.get('detail')) + '</div>') if e.get('detail') else ''}</div>" for e in r["education"])
        parts.append(f"<h2>Education</h2>{body}")
    if r.get("certifications"):
        parts.append("<h2>Certifications</h2><ul>" + "".join(f"<li>{_e(c)}</li>" for c in r["certifications"]) + "</ul>")
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{_e(r.get('name'))} resume</title><style>{CSS}</style></head><body>{''.join(parts)}</body></html>"


def to_pdf(doc_html: str) -> tuple[bytes, int]:
    r = httpx.post(f"{config.GOTENBERG_URL}/forms/chromium/convert/html",
                   files={"files": ("index.html", doc_html.encode(), "text/html")},
                   data={"preferCssPageSize": "true", "printBackground": "true"}, timeout=90)
    r.raise_for_status()
    pages = len(PdfReader(io.BytesIO(r.content)).pages)
    return r.content, pages
