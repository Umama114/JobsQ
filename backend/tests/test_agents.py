"""The agent flow with a stand-in AI and job search (no cost, no network): Scout -> apply -> thread agents, on the web and WhatsApp."""
import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app import ai, agents, config, db, jobsearch, render, whatsapp
from app.main import app
from tests.test_flow import SECRET, SENT, wa

JOBS = [
    {"title": "UI/UX Designer", "company": "Acme", "location": "Hyderabad", "remote": False, "salary": None, "posted": None,
     "link": "https://jobs.example.com/1", "source": "LinkedIn", "logo": None, "company_website": "acme.com", "description": "Figma, design systems"},
    {"title": "Lead Designer", "company": "Big Co", "location": "Pune", "remote": False, "salary": None, "posted": None,
     "link": "https://jobs.example.com/2", "source": "Indeed", "logo": None, "company_website": None, "description": "10 years"},
    {"title": "Product Designer", "company": "Zed", "location": "Remote", "remote": True, "salary": "INR 12L", "posted": None,
     "link": "https://jobs.example.com/3", "source": "Shine", "logo": None, "company_website": None, "description": "SaaS"},
]
CALLS = []


def fake_complete(system, prompt, *, web=False, agent="", user_id=None, max_tokens=16000):
    CALLS.append((agent, web))
    if agent == "profile":
        return json.dumps({"name": "Kay Test", "headline": "Designer", "location": "Hyderabad", "skills": [{"group": "Design", "items": ["Figma"]}],
                           "experience": [], "education": [], "suggested_prefs": {"roles": ["UI/UX Designer"], "locations": ["Hyderabad"], "level": "mid"}})
    if agent == "scout" and "Turn the user's preferences" in prompt:
        return '{"queries":[{"query":"UI UX designer","location":"Hyderabad"}],"drop_title_words":["Lead"]}'
    if agent == "scout":
        assert "Lead Designer" not in prompt  # code removed the senior title before the AI saw the list
        return '{"summary":"Searched design roles.","picks":[{"n":1,"why":"design role in your city","match":90},{"n":2,"why":"remote product design","match":80}]}'
    if agent == "research":
        assert web
        return json.dumps({"company": {"what_they_do": "Makes widgets", "news": ["None found"], "domain": ""}, "fit": "Good fit.", "sources": [],
                           "people": [{"name": "Pat Lee", "role": "Design lead", "linkedin": "https://www.linkedin.com/in/pat", "confirmed": True, "why": "x"}]})
    if agent == "resume":
        return json.dumps({"resume": {"name": "Kay Test", "headline": "Designer", "skills": [{"group": "Design", "items": ["Figma"]}],
                                      "experience": [{"title": "Designer", "org": "Studio", "dates": "2023", "bullets": ["Grew conversions 40%"]}]},
                           "changes": ["Moved Figma up"], "gaps": ["No design-system lead experience"]})
    if agent == "email":
        return '[{"to_name":"Pat Lee","subject":"Referral for UI/UX Designer","body":"Hi Pat, short note. Resume attached. - Kay"}]'
    if agent == "linkedin":
        return '[{"name":"Pat Lee","note":"Hi Pat, I am applying for the UI/UX Designer role at Acme.","followup":"Thanks for connecting!"}]'
    return "## Interview process\nNo public details found."


@pytest.fixture(scope="module")
def client():
    config.WA_APP_SECRET = SECRET
    config.PUBLIC_URL = "https://jobsq.example.com"  # needed to send a file on WhatsApp; don't depend on .env
    whatsapp._post = lambda to, body: (SENT.append((to, body)) or (f"wamid.out.{uuid.uuid4().hex}", None))
    whatsapp.send_document = lambda to, url, name, uid, app_id=None: SENT.append((to, f"[file] {name}"))
    ai.complete = fake_complete
    agents.ai.complete = fake_complete
    jobsearch.search = lambda q, loc: [dict(j) for j in JOBS]
    agents.jobsearch.search = jobsearch.search
    render.to_pdf = lambda html: (b"%PDF-1.4 fake", 1)
    agents.render.to_pdf = render.to_pdf
    with TestClient(app) as c:
        yield c


def wait_for(fn, secs=15):
    end = time.time() + secs
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(0.2)
    raise AssertionError("timed out")


CONNECTIONS_CSV = """Notes:
"When exporting your connection data, you may notice that some of the email addresses are missing."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Sam,Rao,https://www.linkedin.com/in/samrao,,Acme Technologies Pvt Ltd,Engineering Manager,01 Jan 2025
Ana,Bell,https://www.linkedin.com/in/anabell,,Other Co,Designer,02 Jan 2025
"""


def test_agent_flow_web_and_whatsapp(client):
    c = client
    email, phone = f"a{uuid.uuid4().hex[:8]}@jobsq.test", "91" + str(uuid.uuid4().int)[:10]
    c.post("/v1/auth/register", json={"name": "Kay Test", "phone": "+" + phone, "email": email, "password": "long-enough-1"})
    uid = db.one("select id from users where email = %s", (email,))["id"]
    db.run("update users set email_verified_at = now() where id = %s", (uid,))
    assert c.post("/v1/scout/runs").status_code == 402          # needs a plan

    # The resume is saved BEFORE paying (nothing is read yet); starting the plan reads it automatically.
    db.run("insert into profiles (user_id, resume_text, basics) values (%s, %s, %s)",
           (uid, "Kay Test\nDesigner\nGrew conversions 40%\nFigma", json.dumps({"name": "Kay Test", "location": "Hyderabad"})))
    assert c.get("/v1/profile").json()["data"] == {}
    c.post("/v1/dev/activate-plan", json={"plan_code": "jobsq_ai"})
    prof = wait_for(lambda: (p := c.get("/v1/profile").json())["data"].get("name") and p)
    assert prof["data"]["name"] == "Kay Test" and prof["prefs"]["roles"] == ["UI/UX Designer"]

    # Scout: code searches and drops "Lead", the AI ranks, links come from the real results
    c.post("/v1/scout/runs")
    run = wait_for(lambda: (r := c.get("/v1/scout/runs/latest").json()) and r["status"] == "done" and r)
    assert [p["company"] for p in run["picks"]] == ["Acme", "Zed"] and run["picks"][0]["link"] == "https://jobs.example.com/1"

    # LinkedIn connections: someone at "Acme Technologies Pvt Ltd" matches the job at "Acme"
    r = c.post("/v1/connections", files={"file": ("Connections.csv", CONNECTIONS_CSV.encode(), "text/csv")})
    assert r.json() == {"ok": True, "count": 2}

    # Step 1: picking a job tailors the resume straight away
    a = c.post("/v1/applications", json={"run_id": run["id"], "index": 0}).json()
    assert a["number"] == 1
    get = lambda: c.get(f"/v1/applications/{a['id']}").json()
    done = lambda agent: wait_for(lambda: (m := [x for x in get()["messages"] if x["agent"] == agent]) and m[-1]["status"] == "done" and m[-1])
    resume_msg = done("resume")
    assert "Next: apply" in resume_msg["body"] and get()["status"] == "saved"
    assert resume_msg["files"] and c.get(f"/v1/files/{resume_msg['files'][0]['file_id']}?inline=true").status_code == 200
    flagged = next(line for line in resume_msg["body"].splitlines() if "aren't in your original" in line)
    assert "2023" in flagged and "40" not in flagged  # 2023 isn't in the source resume; 40% is
    assert c.get("/v1/scout/runs/latest").json()["picks"][0]["application_id"] == a["id"]

    # Step 2: "I've applied" -> referrals start; people the user already knows come first
    assert c.post(f"/v1/applications/{a['id']}/applied").status_code == 200
    ref = done("research")
    assert get()["status"] == "applied" and get()["done"].get("applied")
    assert "Sam Rao" in ref["body"] and "Pat Lee" in ref["body"] and ref["body"].index("Sam Rao") < ref["body"].index("Pat Lee")
    assert "Ana Bell" not in ref["body"]

    # Steps 3-4: messages for those people (typed requests pick the right agent, no @ needed)
    for text, agent, expect in [("linkedin message please", "linkedin", "Connection note"), ("write the email", "email", "Open in Gmail")]:
        assert c.post(f"/v1/applications/{a['id']}/messages", json={"text": text}).status_code == 200
        assert expect in done(agent)["body"]
    # Step 5: the company replied -> interview prep
    assert c.post(f"/v1/applications/{a['id']}/replied").status_code == 200
    assert "Interview process" in done("prep")["body"]
    assert get()["status"] == "interviewing" and set(get()["done"]) >= {"resume", "applied", "research", "email", "linkedin", "prep"}
    c.patch(f"/v1/applications/{a['id']}", json={"notes": "Call with Sam on Friday"})
    assert get()["notes"] == "Call with Sam on Friday"
    assert c.get("/v1/applications").json()[0]["number"] == 1

    # WhatsApp: link the number, then "A1 ..." goes to that job's thread and the result comes back on WhatsApp
    code = c.post("/v1/channels/whatsapp/link-code").json()["code"]
    wa(c, phone, code)
    wa(c, phone, "jobs")
    assert "A1" in [b for to, b in SENT if to == phone][-1]
    wa(c, phone, "A1 tailor my resume for this")
    wait_for(lambda: any("[file]" in b for to, b in SENT if to == phone))
    assert any("Tailored resume" in b for to, b in SENT if to == phone)
