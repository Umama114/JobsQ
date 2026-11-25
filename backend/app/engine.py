"""The conversation engine for one incoming WhatsApp message (docs/BACKEND.md section 12).

1. Is this number linked to a JobsQ account?  No -> a link code links it, anything else gets "sign up first".
2. Gate checks, in order: opted out -> nothing is sent; access level not 'full' -> one fixed reply
   (at most every few hours); daily message cap -> one fixed reply.
3. Work out what the user wants, cheapest and most certain first:
   button/menu payload -> reply to one of our messages -> pattern (go 1,3 / sent 1,2 / stop / help / status)
   -> (later: a small AI classifier) -> unclear: show the menu.
4. Code, not AI, decides the next step; job requests go to the agents (worker.start_thread_task).
One user's messages are handled one at a time (a PostgreSQL advisory lock on the user id).
"""
import re
from . import config, db
from .access import access_for
from .whatsapp import send

MENU = (
    "Here's what you can send:\n"
    "- *find jobs*: Scout finds jobs that fit your resume\n"
    "- *go 1,3*: pick jobs from the list; I tailor your resume for each\n"
    "- *A1 applied*: tell me you applied; I find people who can refer you\n"
    "- *A1 linkedin* / *A1 email*: messages for those people\n"
    "- *A1 shortlisted*: the company replied; I prepare you for the interview\n"
    "- *jobs*: your applications (A1, A2...)\n"
    "- *status*: your plan\n"
    "- *stop*: no more messages (send *start* to resume)\n"
    "- *help*: this menu\n"
    "You can also reply to a job's message instead of typing A1."
)
CODE_RE = re.compile(r"\bJQ-([A-Z0-9]{6})\b")


def handle(phone: str, text: str, wamid: str, reply_to: str | None = None, button: str | None = None) -> None:
    link = db.one(
        "select * from channel_links where channel = 'whatsapp' and external_id = %s and status <> 'disconnected'",
        (phone,),
    )
    if not link:
        _unlinked(phone, text, wamid)
        return
    user_id = link["user_id"]
    db.run("update messages set user_id = %s where platform_message_id = %s", (user_id, wamid))
    with db.pool.connection() as lock_conn:  # one message per user at a time, in order
        lock_conn.execute("select pg_advisory_lock(%s)", (user_id,))
        try:
            _handle_linked(user_id, link, phone, text, wamid, reply_to, button)
        finally:
            lock_conn.execute("select pg_advisory_unlock(%s)", (user_id,))


def _unlinked(phone: str, text: str, wamid: str) -> None:
    m = CODE_RE.search(text.upper())
    if m:
        code = f"JQ-{m.group(1)}"
        row = db.one("select * from link_codes where code = %s and used_at is null and expires_at > now()", (code,))
        if row and access_for(row["user_id"])["level"] != "full":  # the plan ended after the code was made: don't link
            db.run("update messages set intent = 'link_no_plan' where platform_message_id = %s", (wamid,))
            send(phone, f"WhatsApp is part of a JobsQ plan. Start or renew your plan at {config.WEB_URL}/start, then connect again.", row["user_id"], "link_no_plan")
            return
        if row:
            db.run("update channel_links set status = 'disconnected' where user_id = %s and status <> 'disconnected'", (row["user_id"],))
            db.run("insert into channel_links (user_id, channel, external_id, status) values (%s, 'whatsapp', %s, 'active')", (row["user_id"], phone))
            db.run("update link_codes set used_at = now() where code = %s", (code,))
            db.run("update messages set user_id = %s, intent = 'link_code' where platform_message_id = %s", (row["user_id"], wamid))
            user = db.one("select name from users where id = %s", (row["user_id"],))
            first = (user["name"] or "there").split()[0]
            send(phone, f"Linked! You're connected, {first}. JobsQ now works right here.\n\nSend *find jobs* to start.\n\n{MENU}", row["user_id"], "linked")
            return
        send(phone, "That code is wrong or has expired. Make a new one on the JobsQ website (Settings, WhatsApp).", None, "bad_code")
        return
    db.run("update messages set intent = 'not_registered' where platform_message_id = %s", (wamid,))
    send(phone, f"This number isn't connected to a JobsQ account. Sign up at {config.WEB_URL}/register, then connect WhatsApp on the start page.", None, "not_registered")


def _recent_out(user_id: int, intent: str, hours: int) -> bool:
    return bool(db.one(
        "select 1 from messages where user_id = %s and direction = 'out' and intent = %s and created_at > now() - make_interval(hours => %s) limit 1",
        (user_id, intent, hours),
    ))


def _handle_linked(user_id, link, phone, text, wamid, reply_to, button) -> None:
    say = lambda body, intent: send(phone, body, user_id, intent)  # noqa: E731
    low = text.strip().lower()

    # A connection code sent from a number that is already linked: say what is going on instead of "didn't catch that".
    m = CODE_RE.search(text.upper())
    if m:
        row = db.one("select user_id from link_codes where code = %s and expires_at > now()", (f"JQ-{m.group(1)}",))
        _mark(wamid, "link_code_already_linked")
        if row and row["user_id"] == user_id:
            say("This number is already connected to your JobsQ account, so you don't need the code. Try *status* or *help*.", "link_code_already_linked")
        elif row:
            say("This number is already connected to a different JobsQ account. To use it with the account that made this code, disconnect it first in the other account's Settings (WhatsApp, Disconnect), then send the code again.", "link_code_already_linked")
        else:
            say("That code is wrong or has expired. Make a new one on the JobsQ website (Settings, WhatsApp).", "bad_code")
        return

    # Gate 1: opted out -> nothing is sent, except that "start" turns messages back on.
    if link["status"] == "opted_out":
        if low == "start":
            db.run("update channel_links set status = 'active' where id = %s", (link["id"],))
            _mark(wamid, "start")
            say("Messages are back on.\n\n" + MENU, "start")
        else:
            _mark(wamid, "ignored_opted_out")
        return

    # Gate 2: access level, computed now from the subscription dates.
    acc = access_for(user_id)
    if acc["level"] != "full":
        intent = f"gate_{acc['level']}"
        _mark(wamid, intent)
        if not _recent_out(user_id, intent, config.GATE_REPLY_EVERY_HOURS):
            if acc["level"] == "suspended":
                say("Your JobsQ account is suspended, so the agents are off. Contact support from the website.", intent)
            else:
                say(f"Your JobsQ plan isn't active, so the agents are off. Choose or renew a plan at {config.WEB_URL}/start", intent)
        return

    # Gate 3: daily message cap.
    count = db.one(
        "select count(*) as n from messages where user_id = %s and direction = 'in' and created_at > date_trunc('day', now())",
        (user_id,),
    )["n"]
    if count > config.DAILY_MESSAGE_CAP:
        _mark(wamid, "gate_cap")
        if not _recent_out(user_id, "gate_cap", 24):
            say("You've reached today's message limit. It resets at midnight.", "gate_cap")
        return

    intent, values = route(user_id, text, reply_to, button)
    _mark(wamid, intent)
    reply(user_id, link, intent, values, acc, say)


def route(user_id: int, text: str, reply_to: str | None, button: str | None) -> tuple[str, dict]:
    """Work out what the user wants. Code only, most certain first."""
    if button:                                                    # 1. a tapped button or menu item
        return f"button:{button}", {}
    if reply_to:                                                  # 2. a reply to one of our messages
        ours = db.one("select body, intent, application_id from messages where platform_message_id = %s and direction = 'out' and user_id = %s", (reply_to, user_id))
        if ours and ours["application_id"]:
            return "job_message", {"application_id": ours["application_id"], "text": text}
        if ours:
            return "reply_to_ours", {"quoted": ours["body"][:120], "quoted_intent": ours["intent"]}
    low = text.strip().lower()                                    # 3. patterns
    m = re.match(r"^a(\d+)\b[\s:,-]*(.*)$", low, re.S)            # "A3 tailor my resume" -> application A3
    if m:
        app = db.one("select id from applications where user_id = %s and number = %s", (user_id, int(m.group(1))))
        if app:
            return "job_message", {"application_id": app["id"], "text": m.group(2).strip() or "What can you do for this job?"}
        return "no_such_job", {"number": m.group(1)}
    if low in ("jobs", "applications", "my jobs"):
        return "list_jobs", {}
    if low in ("help", "menu", "hi", "hello", "!help"):
        return "help", {}
    if low in ("status", "plan", "my plan"):
        return "status", {}
    if low == "stop":
        return "stop", {}
    m = re.fullmatch(r"(go|sent)\s+([\d,\s]+)", low)
    if m:
        nums = [int(n) for n in re.findall(r"\d+", m.group(2))]
        return m.group(1), {"numbers": nums}
    if re.search(r"\b(find|search|look for)\b.{0,40}\bjobs?\b", low):
        return "find_jobs", {}
    return "unclear", {}                                          # 4. later: a small AI classifier goes here


def reply(user_id, link, intent, values, acc, say) -> None:
    if intent == "help":
        say(MENU, intent)
    elif intent == "status":
        until = (acc["access_until"] or "")[:10]
        say(f"Plan: {acc['plan_name']} (active until {until}).\nAccess: full. The agents can work for you.", intent)
    elif intent == "stop":
        db.run("update channel_links set status = 'opted_out' where id = %s", (link["id"],))
        say("OK, no more messages. Send *start* any time to turn them back on.", intent)
    elif intent == "find_jobs":
        from . import worker
        if not db.one("select 1 from profiles where user_id = %s and resume_text <> ''", (user_id,)):
            say(f"Scout needs your resume first. Upload it at {config.WEB_URL}/start, then send *find jobs* again.", intent)
        elif db.one("select 1 from scout_runs where user_id = %s and status in ('queued','running') and created_at > now() - interval '15 minutes'", (user_id,)):
            say("Scout is already searching. I'll send the jobs here when it's done.", intent)
        else:
            run = db.one("insert into scout_runs (user_id, status, source) values (%s, 'queued', 'whatsapp') returning id", (user_id,))
            worker.submit(worker.run_scout, run["id"], user_id, link["external_id"])
            say("Scout is searching for jobs that fit your resume and preferences. This takes a minute or two.", intent)
    elif intent == "go":
        from . import worker
        from .routers.work import create_application
        run = db.one("select picks from scout_runs where user_id = %s and status = 'done' order by id desc limit 1", (user_id,))
        if not run or not run["picks"]:
            say("There's no shortlist yet. Send *find jobs* first.", intent)
            return
        made = []
        for n in values["numbers"]:
            if 1 <= n <= len(run["picks"]):
                res = create_application(user_id, run["picks"][n - 1])
                made.append((res, run["picks"][n - 1]))
        if not made:
            say(f"Those numbers aren't in the shortlist (1 to {len(run['picks'])}).", intent)
            return
        say("Added to your Applications. I'm tailoring your resume for each one; the PDF and the apply link come next.", intent)
        for res, job in made:  # one message per job: replying to it talks about that job
            send(link["external_id"], f"*A{res['number']} · {job['company']} – {job['title']}*\nReply to this message (or start with *A{res['number']}*) "
                 "to work on this job. After you apply, send *A" + str(res["number"]) + " applied*.", user_id, "job_card", res["id"])
            if not res["existing"]:
                worker.start_thread_task(user_id, res["id"], "Tailor my resume for this job.", "resume", link["external_id"])
    elif intent == "job_message":
        from . import worker
        from .agents import APPLIED_RE, LABELS, pick_agent
        app = db.one("select number, job from applications where id = %s", (values["application_id"],))
        if db.one("select 1 from thread_messages where application_id = %s and status = 'working' and created_at > now() - interval '15 minutes'", (values["application_id"],)):
            say(f"A{app['number']}: an agent is still working on this job. I'll send the result when it's ready.", intent)
            return
        if APPLIED_RE.match(values["text"]):
            worker.mark_applied(user_id, values["application_id"], link["external_id"])
            say(f"A{app['number']} · {app['job'].get('company')}: marked as applied. I'm finding people who can refer you.", intent)
            return
        agent = pick_agent(values["text"])
        worker.start_thread_task(user_id, values["application_id"], values["text"], agent, link["external_id"])
        say(f"A{app['number']} · {app['job'].get('company')}: {LABELS[agent]} is on it.", intent)
    elif intent == "list_jobs":
        apps = db.all_rows("select number, job, status from applications where user_id = %s order by number", (user_id,))
        say("Your applications:\n" + "\n".join(f"*A{a['number']}* {a['job'].get('company')} – {a['job'].get('title')} ({a['status']})" for a in apps)
            + "\n\nStart a message with the code, e.g. *A1 tailor my resume*." if apps else "No applications yet. Send *find jobs*.", intent)
    elif intent == "no_such_job":
        say(f"There's no A{values['number']}. Send *jobs* to see your applications.", intent)
    elif intent == "sent":
        say(f"Noted: drafts {', '.join(map(str, values['numbers']))} marked as sent.", intent)
    elif intent == "reply_to_ours":
        say(f"You replied to my message: \"{values['quoted']}\". Replies like this will go to that job's agent.", intent)
    elif intent.startswith("button:"):
        say(f"You chose: {intent[7:]}.", intent)
    else:
        say("I didn't catch that.\n\n" + MENU, "unclear")


def _mark(wamid: str, intent: str) -> None:
    db.run("update messages set intent = %s where platform_message_id = %s", (intent, wamid))
