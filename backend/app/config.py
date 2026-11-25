"""Settings, read from the environment (.env in the project folder, loaded by docker compose)."""
import os


def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


DATABASE_URL = env("DATABASE_URL", "postgresql://jobsq:jobsq_dev_only@localhost:5433/jobsq")
DEV_MODE = env("DEV_MODE", "1") == "1"            # test-mode plan buttons and the dev email inbox
WEB_URL = env("WEB_URL", "http://localhost:3000").rstrip("/")
PASSWORD_PEPPER = env("PASSWORD_PEPPER", "dev-only-pepper-change-me")
UPLOAD_DIR = env("UPLOAD_DIR", "/data/uploads")

SESSION_DAYS = 14
COOKIE_NAME = "jq_session"
MAX_LOGIN_FAILURES = 5
LOCK_MINUTES = 15
DAILY_MESSAGE_CAP = int(env("DAILY_MESSAGE_CAP", "50"))
GATE_REPLY_EVERY_HOURS = 6                      # a lapsed or suspended user gets the fixed reply at most this often

# WhatsApp Cloud API (Meta's test number for now)
WA_TOKEN = env("WHATSAPP_ACCESS_TOKEN")
WA_PHONE_NUMBER_ID = env("WHATSAPP_PHONE_NUMBER_ID")
WA_APP_SECRET = env("WHATSAPP_APP_SECRET")
WA_VERIFY_TOKEN = env("WHATSAPP_VERIFY_TOKEN")
WA_DISPLAY_NUMBER = env("WHATSAPP_DISPLAY_NUMBER", "")  # the number users write to, digits with country code
GRAPH = "https://graph.facebook.com/v25.0"
PUBLIC_URL = env("PUBLIC_URL").rstrip("/")         # this backend's public address (ngrok), for files sent on WhatsApp

# AI.
# "JobsQ AI" plan: the Claude API when ANTHROPIC_API_KEY is set. Without a key (development), JobsQ's own connector
#   runs the work with Claude Code on this PC: start it with the key below (see README).
# "Your own AI" plan: always the user's own connector (their Claude Code or Codex subscription).
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY")
AI_MODEL = env("AI_MODEL", "claude-opus-5-5")
HOUSE_CONNECTOR_KEY = env("CONNECTOR_HOUSE_KEY")
CONNECTOR_ONLINE_SECS = 90          # a connector that hasn't asked for work for this long counts as off
AI_TASK_TIMEOUT_SECS = 15 * 60

# Job search and contacts
JSEARCH_KEY = env("JSEARCH_RAPIDAPI_KEY")
SERPAPI_KEY = env("SERPAPI_KEY")
HUNTER_KEY = env("HUNTER_API_KEY")
GOTENBERG_URL = env("GOTENBERG_URL", "http://gotenberg:3000")
