"""One way for every agent to call the AI. Where the work runs depends on the user's plan:

- "JobsQ AI" plan + ANTHROPIC_API_KEY set -> the Claude API (the production path), through the official `anthropic` SDK.
- "JobsQ AI" plan, no key (development)    -> queued for JobsQ's own connector (Claude Code on this PC).
- "Your own AI" plan                         -> queued for the user's JobsQ Connector, which runs it with their
                                                Claude Code or Codex subscription on their computer.

Queued work goes into the ai_tasks table; the connector asks for it, runs it and sends the answer back.
Agents ask for JSON in the prompt and read it with `parse_json`, so the same code works on every path.
Every call is recorded in ai_calls (time, tokens) so cost can be measured from the start.
"""
import json
import logging
import re
import time
from . import config, db

log = logging.getLogger("ai")


class AIError(Exception):
    pass


def plan_of(user_id: int | None) -> str | None:
    if not user_id:
        return None
    from .access import access_for
    return access_for(user_id)["plan"]


def route(user_id: int | None) -> tuple[str, int | None]:
    """('api', None), ('house', None) or ('user', user_id): where this user's AI work runs."""
    if plan_of(user_id) == "own_ai":
        return "user", user_id
    return ("api", None) if config.ANTHROPIC_API_KEY else ("house", None)


def provider() -> str:
    """For the settings page: how the JobsQ AI plan runs right now."""
    return "api" if config.ANTHROPIC_API_KEY else "house"


def complete(system: str, prompt: str, *, web: bool = False, agent: str = "", user_id: int | None = None, max_tokens: int = 16000) -> str:
    where, owner = route(user_id)
    t0 = time.time()
    try:
        if where == "api":
            text, usage = _api(system, prompt, web, max_tokens)
        else:
            text, usage = _queue(owner, system, prompt, web, agent)
        _record(agent, user_id, where, True, time.time() - t0, usage, None)
        return text
    except AIError as e:
        _record(agent, user_id, where, False, time.time() - t0, {}, str(e))
        raise


# ---------------------------------------------------------------- the Claude API
def _api(system: str, prompt: str, web: bool, max_tokens: int) -> tuple[str, dict]:
    import anthropic

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    tools = [
        {"type": "web_search_20260209", "name": "web_search", "max_uses": 6},
        {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": 6},
    ] if web else []
    messages: list = [{"role": "user", "content": prompt}]
    usage = {"input": 0, "output": 0, "turns": 0}
    try:
        for _ in range(6):  # a long web-search turn can pause; send it back so the server continues
            kwargs = dict(model=config.AI_MODEL, max_tokens=max_tokens, system=system, messages=messages,
                          betas=["server-side-fallback-2026-07-01"], fallbacks="default")
            if tools:
                kwargs["tools"] = tools
            resp = client.beta.messages.create(**kwargs)
            usage["turns"] += 1
            usage["input"] += (resp.usage.input_tokens or 0) + (getattr(resp.usage, "cache_read_input_tokens", 0) or 0)
            usage["output"] += resp.usage.output_tokens or 0
            if resp.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": resp.content})
                continue
            if resp.stop_reason == "refusal":
                raise AIError("Claude declined this request.")
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            if resp.stop_reason == "max_tokens":
                log.warning("reply hit max_tokens")
            return text, usage
        raise AIError("The AI kept pausing and didn't finish.")
    except anthropic.RateLimitError:
        raise AIError("The AI is busy (rate limit). Try again in a minute.")
    except anthropic.APIStatusError as e:
        raise AIError(f"Claude API error {e.status_code}: {str(e.message)[:200]}")
    except anthropic.APIConnectionError:
        raise AIError("Couldn't reach the Claude API.")


# ---------------------------------------------------------------- connectors (queued work)
OFFLINE_USER = ("Your JobsQ Connector isn't running, so the agents can't work. Open it on your computer "
                "(Settings, Your AI shows how), then try again.")
OFFLINE_HOUSE = ("The AI isn't connected. Add ANTHROPIC_API_KEY to .env, or start JobsQ's connector in a terminal: "
                 "node connector/jobsq-connector.mjs --house")


def connector_online(owner: int | None) -> bool:
    if owner is None:
        row = db.one("select now() - last_seen_at < make_interval(secs => %s) as online from house_connector where id = 1", (config.CONNECTOR_ONLINE_SECS,))
    else:
        row = db.one("select now() - last_seen_at < make_interval(secs => %s) as online from connectors where user_id = %s", (config.CONNECTOR_ONLINE_SECS, owner))
    return bool(row and row["online"])


def _queue(owner: int | None, system: str, prompt: str, web: bool, agent: str) -> tuple[str, dict]:
    offline = OFFLINE_HOUSE if owner is None else OFFLINE_USER
    if not connector_online(owner):
        raise AIError(offline)
    task = db.one("insert into ai_tasks (owner_user_id, agent, system, prompt, web) values (%s,%s,%s,%s,%s) returning id",
                  (owner, agent, system, prompt, web))
    end = time.time() + config.AI_TASK_TIMEOUT_SECS
    while time.time() < end:
        time.sleep(1)
        t = db.one("select status, result, error, usage from ai_tasks where id = %s", (task["id"],))
        if t["status"] == "done":
            return t["result"] or "", t["usage"] or {}
        if t["status"] == "failed":
            raise AIError(t["error"] or "The AI returned an error.")
        if t["status"] == "queued" and not connector_online(owner):  # the connector was closed before it picked this up
            db.run("update ai_tasks set status = 'failed', error = %s, finished_at = now() where id = %s and status = 'queued'", (offline, task["id"]))
            raise AIError(offline)
    db.run("update ai_tasks set status = 'failed', error = 'timed out', finished_at = now() where id = %s and status in ('queued','running')", (task["id"],))
    raise AIError("The AI took too long (over 15 minutes). Try again.")


# ---------------------------------------------------------------- reading answers
def parse_json(text: str):
    """Reads the JSON object or array in a reply, ignoring any text or code fences around it."""
    s = text.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s)
    pairs = [("{", "}"), ("[", "]")]
    pairs.sort(key=lambda p: s.find(p[0]) if s.find(p[0]) != -1 else len(s))  # whichever starts first: a list of objects stays a list
    for opener, closer in pairs:
        a, b = s.find(opener), s.rfind(closer)
        if a != -1 and b > a:
            try:
                return json.loads(s[a:b + 1])
            except json.JSONDecodeError:
                continue
    raise AIError("The AI's answer wasn't in the expected format.")


def complete_json(system: str, prompt: str, **kw):
    """Asks for JSON; if the first answer can't be read, asks once more."""
    text = complete(system, prompt, **kw)
    try:
        return parse_json(text)
    except AIError:
        text = complete(system, prompt + "\n\nIMPORTANT: reply with only the JSON, nothing before or after it.", **kw)
        return parse_json(text)


def _record(agent, user_id, where, ok, secs, usage, error) -> None:
    try:
        db.run(
            "insert into ai_calls (user_id, agent, provider, ok, secs, input_tokens, output_tokens, turns, error) values (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (user_id, agent, where, ok, round(secs, 1), usage.get("input"), usage.get("output"), usage.get("turns"), (error or "")[:300] or None),
        )
    except Exception:  # never let bookkeeping break an agent
        log.exception("could not record ai call")
