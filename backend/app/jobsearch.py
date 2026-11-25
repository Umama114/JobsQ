"""Job search with no AI: JSearch (RapidAPI) and SerpApi Google Jobs together, duplicates merged.
Results are cached for 6 hours per query, so repeat searches don't spend the API quotas."""
import hashlib
import json
import re
from datetime import datetime, timezone
import httpx
from . import config, db

db_cache_sql = """
create table if not exists search_cache (key text primary key, results jsonb not null, created_at timestamptz not null default now())
"""


def _clean(v):
    return v if v not in (None, "") else None


def _jsearch(query: str, location: str) -> list[dict]:
    if not config.JSEARCH_KEY:
        return []
    remote = location.strip().lower() == "remote"
    r = httpx.get("https://jsearch.p.rapidapi.com/search-v2",
                  params={"query": f"{query} remote" if remote else f"{query} in {location}", "country": "in", "date_posted": "month",
                          **({"work_from_home": "true"} if remote else {})},
                  headers={"X-RapidAPI-Key": config.JSEARCH_KEY, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"}, timeout=30)
    r.raise_for_status()
    data = r.json().get("data") or {}
    out = []
    for j in (data.get("jobs") if isinstance(data, dict) else data) or []:
        lo, hi, cur, per = j.get("job_min_salary"), j.get("job_max_salary"), j.get("job_salary_currency"), j.get("job_salary_period")
        salary = f"{cur or ''} {lo or ''}{'-' + str(hi) if hi and hi != lo else ''} {('per ' + per.lower()) if per else ''}".strip() if (lo or hi) else None
        out.append({
            "title": _clean(j.get("job_title")), "company": _clean(j.get("employer_name")),
            "location": _clean(j.get("job_location")) or ", ".join(x for x in [j.get("job_city"), j.get("job_state")] if x) or None,
            "remote": bool(j.get("job_is_remote")), "salary": salary, "posted": _clean(j.get("job_posted_at_datetime_utc")),
            "link": _clean(j.get("job_apply_link")), "source": _clean(j.get("job_publisher")), "logo": _clean(j.get("employer_logo")),
            "company_website": _clean(j.get("employer_website")), "description": (j.get("job_description") or "")[:6000],
        })
    return out


def _serp(query: str, location: str) -> list[dict]:
    if not config.SERPAPI_KEY:
        return []
    params = {"engine": "google_jobs", "q": query, "gl": "in", "hl": "en", "api_key": config.SERPAPI_KEY}
    loc = location.strip()
    if loc.lower() == "remote":
        params["q"] = f"{query} remote"           # Google Jobs has no "Remote" location
    elif loc.lower() == "india":
        params["location"] = "India"
    else:
        params["location"] = f"{loc}, India" if "india" not in loc.lower() else loc
    r = httpx.get("https://serpapi.com/search.json", params=params, timeout=30)
    r.raise_for_status()
    out = []
    for j in (r.json().get("jobs_results") or []):
        ext = j.get("detected_extensions") or {}
        link = (j.get("apply_options") or [{}])[0].get("link") or j.get("share_link")
        out.append({
            "title": _clean(j.get("title")), "company": _clean(j.get("company_name")), "location": _clean(j.get("location")),
            "remote": bool(ext.get("work_from_home")), "salary": _clean(ext.get("salary")), "posted": _clean(ext.get("posted_at")),
            "link": link, "source": (j.get("via") or "").replace("via ", "") or None, "logo": _clean(j.get("thumbnail")),
            "company_website": None, "description": (j.get("description") or "")[:6000],
        })
    return out


def _norm_company(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\b(pvt|private|ltd|limited|inc|llc|llp|technologies|technology|india)\b", "", (s or "").lower()))


def _tokens(s: str) -> set:
    return set(re.sub(r"[^a-z0-9+#]+", " ", (s or "").lower()).split())


def _same(a: dict, b: dict) -> bool:
    if _norm_company(a["company"]) != _norm_company(b["company"]):
        return False
    x, y = _tokens(a["title"]), _tokens(b["title"])
    return bool(x and y) and len(x & y) / len(x | y) >= 0.7


def search(query: str, location: str) -> list[dict]:
    db.run(db_cache_sql)
    key = hashlib.sha1(f"{query}|{location}".lower().encode()).hexdigest()
    hit = db.one("select results from search_cache where key = %s and created_at > now() - interval '6 hours'", (key,))
    if hit:
        return hit["results"]
    found, errors = [], []
    for fn in (_jsearch, _serp):
        try:
            found += fn(query, location)
        except Exception as e:  # one source failing should not stop the other
            errors.append(f"{fn.__name__}: {e}")
    kept: list[dict] = []
    for j in found:
        if not (j["title"] and j["company"]):
            continue
        dup = next((k for k in kept if _same(k, j)), None)
        if dup is None:
            kept.append(j)
        else:
            for f in ("salary", "link", "source", "location", "logo", "company_website", "posted"):
                dup[f] = dup[f] or j[f]
            if len(j["description"]) > len(dup["description"]):
                dup["description"] = j["description"]
    if kept:
        db.run("insert into search_cache (key, results) values (%s, %s) on conflict (key) do update set results = excluded.results, created_at = now()",
               (key, json.dumps(kept)))
    if not kept and errors:
        raise RuntimeError("Job search failed: " + "; ".join(errors)[:300])
    return kept
