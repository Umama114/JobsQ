# JobsQ: what is built today

Status: 2026-11-25. This is the one place that says what the code in this project actually does. The other documents describe the V1 target. Where they go further than this page (Discord, payments, admin and so on), that part is **planned, not built**. Where an older document disagrees with this page, this page is right.

How to run it: [../README.md](../README.md). Diagrams and plain-words flow: [JobsQ_architecture_and_flows.md](JobsQ_architecture_and_flows.md).

## 1. Product decisions in force (25 Nov 2026)

These replace the 18 Nov wording. They came up while building and are to be confirmed by the CTO and CEO.

| Topic | Now |
|---|---|
| Plans | **JobsQ AI** (code `jobsq_ai`): JobsQ pays for the AI, nothing to set up. **Your own AI** (code `own_ai`, cheaper): the agents run on the user's own Claude Code or Codex subscription through the **JobsQ Connector** on their computer. Nobody enters an AI API key. Prices open |
| Resume | Uploaded **on the sign-up page**, read without AI (no account needed) to fill the form, and **saved with the new account, before payment**. The AI reads it as soon as the plan starts, so nobody uploads twice. Someone without the file can sign up by typing and add it on the start page |
| Order of work | Find jobs → pick one → **resume tailored** → **apply** → **find referrals** → **LinkedIn messages and emails** → company replies → **interview prep** |
| Referrals | People the user already knows (their LinkedIn `Connections.csv`) come first, then people found on the web; emails only from Hunter |
| WhatsApp | Optional, and **only with an active plan**: both making a connection code and using it need one (one tap on a phone, QR code on a computer). A number stays linked if the plan later ends, but the agents stop |
| Interview prep | Built (it was stretch in the PRD) |

**Check before charging for "Your own AI":** Anthropic's terms restrict other companies' products from using people's Claude.ai subscription logins without approval, and OpenAI may have a similar rule for Codex. Get a written answer from both.

## 2. What works

| Area | Built |
|---|---|
| Accounts | Register (resume upload that fills in name, phone and email, plus a password; **one account per email and per phone number**, number written with + and country code; the number is not yet verified), email confirmation (shown on a dev inbox page; no real email yet), sign in with lockout, password reset |
| Plans and access | Test-mode activation (no payments). Access is worked out from dates on every request and message: `full`, `limited`, `suspended` |
| Resume | PDF or Word, self-filling editable form, saved, read by the AI into a profile with suggested preferences |
| Scout | Searches JSearch and Google Jobs (SerpApi), drops clearly senior titles in code, AI ranks, links come from real results |
| Agents | Scout, Research (referrals), Resume tailor (one-page PDF), Email, LinkedIn, Interview prep, plus a general assistant in each job. Code picks the agent from the words; no `@` |
| Web app | Start (guided setup), Scout (job list with details), Applications (grouped by stage), a thread per job with a **Next step** button, notes, Settings, light and dark mode, phone layout |
| WhatsApp | Meta test number: link by code, `find jobs`, `go 1,3`, `A1 applied`, `A1 linkedin`, `A1 email`, `A1 shortlisted`, `jobs`, `status`, `help`, `stop`/`start`, reply to a job's message. Resume PDF is sent as a file |
| Connector | `connector/jobsq-connector.mjs`: makes only outgoing requests, runs Claude Code or Codex in an empty folder, 2 jobs at a time |

Application statuses: **To apply** (`saved`), Applied, Interviewing, Offer, Rejected, Archived.

## 3. How the AI is called

| Case | Path |
|---|---|
| JobsQ AI plan, `ANTHROPIC_API_KEY` set | Claude API (`AI_MODEL`, default `claude-opus-5-5`) |
| JobsQ AI plan, no key (development) | JobsQ's own connector on the developer's PC (`--house`) |
| Your own AI plan | The user's connector |

No AI runs without an active plan, and only **Your own AI** subscribers can make a connector key. Reading a resume on the sign-up page uses no AI and is limited per address (10 a minute) and in total (60 a minute).

Queued work lives in the `ai_tasks` table. Every call is recorded in `ai_calls`.

## 4. Stack

Python 3.12 with FastAPI · PostgreSQL 16 · Next.js with TypeScript (plain CSS) · Gotenberg for PDFs · Docker Compose. Agent work runs on threads inside the API process: there is **no Redis, queue service or separate worker yet**.

## 5. Not built

Payments (Razorpay or Stripe), real email sending, Discord, timed "Did you apply?" prompts, usage limits beyond the daily message cap, admin console, data export and deletion, production WhatsApp number, hosting. Suggested backend work: [BACKEND_IMPROVEMENTS.md](BACKEND_IMPROVEMENTS.md).

## 6. Tested

7 backend tests (stand-in AI) and the website build pass. Checked live with a real model on one resume: profile reading, Scout, Research, tailored resume, referral email, and the connector with Claude Code. **Not tested live:** LinkedIn and Interview prep, WhatsApp end to end, the Claude API path, the Codex path.
