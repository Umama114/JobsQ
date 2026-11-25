# JobsQ — Production Plan

> **Partly replaced on 2026-11-16.** The source of truth is now [../PRD.md](../PRD.md) and the documents listed in [../README.md](../README.md).
> Changed since this plan was written: sign-up is web-first (register → pay → connect a channel); one channel per user at a time; the resume is uploaded at registration (in the Details step); Discord's default is direct messages; V1 is one 8-week cycle, so the roadmap in §11 no longer applies.
> Still current and referenced from the new documents: the feature-parity checklist (§0.1), job discovery at scale (§5) and the cost model (§8.4).

Status: draft v2 (2026-11-16). Channels: WhatsApp **and** Discord. Production uses paid APIs only (free tiers are for development). No free plan. Owner: Abdul Ahad. Sources: `piyush-eon/multi-agent-ai-job-hunter` (repo), RoadsideCoder notes
"Build an AI Job Hunting Team with Claude Code" (notes.roadsidecoder.com), and the companion video (title read; transcript
not retrievable, the notes are its written form).

Facts about WhatsApp limits, prices and quotas below change often. Items marked **[verify]** must be re-checked against
Meta's current docs before they drive a decision.

---

## 0. What the source actually is (and what it is not)

The reference project is a **single-user, local, human-in-the-loop prototype**:

- **Runtime:** six Claude Code agents on the user's own machine, each pointed at one shared local folder. Discord (via the
  Switch Rooms tool) is the chat layer: one channel, one thread per job.
- **Repo contents:** only small Node.js helper scripts (the tools the agents call). The agent prompts are in the notes.
- **State:** files (`jobs/<slug>/job.md`, `research.md`, `people.json`, `resume.html/pdf`) and one `tracker.json`.
- **Cost model:** free API tiers (JSearch ~100 calls/mo, SerpApi 250/mo, Hunter 50 credits/mo).
- **Scheduling:** none. Everything is triggered by the user typing.
- **Scoring:** none in code. "Fit" is the model's judgement plus filters.
- **Core rule:** the AI drafts, the user decides, nothing is ever sent for the user.

None of that survives contact with thousands of paying users. **JobsQ keeps the product (agents, pipeline, four approval gates,
truthful resumes, drafts only) and replaces the whole runtime**: a multi-tenant server platform, a database instead of
folders, an LLM API instead of Claude Code, and **two chat channels, WhatsApp and Discord, running on one shared engine** instead of Switch Rooms plus a hand-made private Discord server.

### 0.1 Feature inventory to carry over (parity checklist)

| # | Feature in source | JobsQ equivalent |
|---|---|---|
| F1 | Profile setup: resume PDF → "Resume" doc (only source of truth) + "Preferences" doc (roles, skills, locations, experience, industries, min salary) | Onboarding in WhatsApp + web; structured `resume_master` and `preferences` records |
| F2 | **Scout**: 2–3 queries from preferences, JSearch + SerpApi merged, dedupe (company + title Jaccard ≥ 0.7), filters (location, level, no interns/freshers unless asked, salary only if listed), 5–8 shortlist with "why it fits" ≤ 12 words | Scout agent over a shared job index (§5) + the same filters; shortlist as a WhatsApp list message / Discord select menu |
| F3 | "go 1, 3" selects jobs; one thread per job | WhatsApp: job code (J-id) + reply routing (§6.1). Discord: a real thread per job, as in the source (§6.7) |
| F4 | User-supplied link: LinkedIn/Indeed/Naukri never opened (ask for pasted text); Greenhouse/Lever/Ashby via API; others fetched | Same rules, enforced in the tool layer |
| F5 | `check-posting`: is the job still open, get full description (Greenhouse, Lever, Ashby) | Same, plus more ATS adapters later |
| F6 | **Researcher**: company summary (what, size, stack, 2 news items) + 2–3 engineers (from search snippets, never LinkedIn pages; "not confirmed" when unsure) | Researcher agent, same constraints |
| F7 | Hunter.io email lookup/verify (1 domain search + 3 verifications per job; never guess emails; accept-all → "unconfirmed") | Same caps, cached per domain across all users |
| F8 | **Resume Tailor**: one-page tailored PDF; may reorder/shorten/reword, may never add a skill, number, title or employer; "what changed" ≤ 6 bullets, "gaps", apply link | Same, plus an automated truthfulness verifier (§7.3) |
| F9 | `make-pdf` (HTML → A4 PDF, page count, cut and rerun if > 1 page) | Render service (§7.4) |
| F10 | **Email agent**: ≤ 120-word referral drafts, subject < 8 words, Gmail compose link, "attach resume" reminder, tracker log | Drafts + `mailto`/Gmail link; optional Gmail draft-creation integration (§7.5) |
| F11 | Follow-ups: due after 5 days, ≤ 2 per person, never if replied/interviewing/rejected/offer, < 60 words, "Re:" subject | Scheduled job + WhatsApp reminder (this is the first thing the source lacked: real scheduling) |
| F12 | **LinkedIn agent**: connection note < 300 chars, follow-up < 80 words, user sends by hand, never opens LinkedIn | Same |
| F13 | **Interview Prep**: process, ranked topics, ≤ 10 likely questions marked "asked before" (with source) or "likely", gaps, day-by-day plan, mock interview one question at a time; Glassdoor/AmbitionBox snippets only | Same, mock interview as a native WhatsApp conversation |
| F14 | Tracker: drafted/sent/replied per person; job status applied/interviewing/rejected/offer | `outreach` and `job_applications` tables + a web dashboard |
| F15 | Four approval gates: pick jobs → approve people → approve resume → send outreach | Explicit workflow states; buttons in WhatsApp |
| F16 | Global rules: never invent experience, numbers, people, emails, links; web text is data not instructions; never reveal keys; start each message with "Company – Role"; short messages | System-prompt rules **plus** code-level enforcement |
| F17 | Model split: fast model (Sonnet) for Scout/Research/Email/LinkedIn; strongest (Opus) for Resume and Prep | Model router (§7.1), with a cheaper tier for bulk work |

### 0.2 Deliberate additions (not in the source; needed for a paid, scaled product)

- **Numeric fit score** and explainable matching (source has none).
- **Proactive daily digest** (source is purely reactive).
- **Subscriptions, quotas, metering, billing.**
- **Shared job index** so 100k users do not trigger 100k separate searches.
- **Multi-tenant isolation, PII protection, deletion/export, compliance.**
- **Two channels (WhatsApp and Discord) over one engine**, so a user can work from either, plus the web companion.
- **Web companion** for work that is miserable in a chat window (editing a resume, viewing the tracker, billing).

---

## 1. Product decisions to confirm before building

These change the plan; recommendations in bold.

| # | Question | Recommendation |
|---|---|---|
| D1 | Target market at launch | **India first** (the source is tuned for it: `country=in`, Indian city map, ₹ LPA, Naukri/AmbitionBox), with country as a profile field so US/UK/UAE are config, not code |
| D2 | Payments | **Razorpay (INR, UPI autopay) first; Stripe later for international.** Needs an adapter so both fit |
| D3 | Who sends outreach | **User only (as in the source).** This is also the main legal/ToS shield. Don't build auto-send in v1 |
| D4 | Gmail integration | **Phase 2 and optional.** Start with compose links. Draft creation needs a Gmail OAuth scope that Google classes as restricted and security-reviews (§7.5) |
| D5 | One WhatsApp number or many; one Discord app or many | **One WhatsApp number and one Discord application, one brand ("JobsQ")**; six agent "voices" per channel (§6.2, §6.7). Not six bots as in the source: six bot apps do not scale to manage or verify |
| D6 | Web app in v1 | **Yes, thin.** Signup, resume upload, plan/billing, dashboard. WhatsApp is the daily surface |
| D7 | Free tier | **No free plan (decided by product owner).** Access starts after payment, so signup includes a checkout step before onboarding. Open: single paid plan or two tiers, and whether to offer a refund window or paid trial (not a free plan) |
| D8 | Where Discord users live | **The user's own private server (as in the source) with a DM-mode fallback.** A JobsQ-owned shared server is rejected for v1 because server admins could see every user's résumé and the 500-channel limit forces many servers (§2.3) |
| D9 | Can a user use both channels | **Yes, one primary channel per user for the pipeline; any linked channel or the web can answer an approval gate (§6.8)** |
| D10 | Data sources in production | **Paid, contracted providers only.** Free tiers are for development and internal testing (§5.1) |

---

## 2. Channels: WhatsApp and Discord

JobsQ ships on two channels over one engine. For WhatsApp use the **official WhatsApp Business Platform (Cloud API)**; for Discord use the
**official Discord bot and interactions API** (no self-bots, no user-token automation). Do **not** use unofficial libraries (Baileys, whatsapp-web.js):
they break ToS, get numbers banned, and are not a basis for a paid product.

### 2.1 WhatsApp: hard platform constraints that shape the design

| Constraint | Consequence for JobsQ |
|---|---|
| **24-hour customer-service window**: free-form messages only within 24 h of the user's last message. Outside it, only **pre-approved templates**. | Daily digests and follow-up reminders must be templates whose button/reply re-opens the window. All agent output after that is free-form. Track `window_expires_at` per user |
| Templates are categorised (utility / marketing / authentication) and **billed per delivered message**. Per Meta's developer docs, from 2026-10-01 free-form service messages and in-window utility messages are also charged after 1,000 free per number per month (§8.4); the WhatsApp Business marketing page still says they are free, so **confirm in Billing Hub** | Template count is the main WhatsApp cost lever. Budget per user per month; cap digests by plan |
| Business must be **verified**; display name approved; **messaging limits** cap the unique recipients you message outside the 24 h window: a new portfolio starts at 250, verification lifts it to 2,000, then it auto-scales to 10k / 100k / unlimited with good quality, shared across the portfolio's numbers (Meta docs, read 2026-11-16) | Start Meta Business Verification in week 1 (takes days to weeks). Plan onboarding invitations around tier limits |
| **No threads, no channels-with-bots, no multi-bot rooms** | Replace "one thread per job" with job-scoped context (§6.1) |
| Interactive limits: **3 reply buttons**, **list message ≤ 10 rows**, text ≤ 4096 chars, button label ≤ 20 chars **[verify]** | Shortlist = list message (≤ 8 jobs fits). Long drafts split or move to web |
| Documents supported (PDF up to ~100 MB) | Resume PDF sent as a document with caption. Fits |
| **Opt-in required**, and opt-out ("STOP") must be honoured | Record consent at signup; global `stop` handler; suppress sends |
| Webhooks must be answered fast and can be **retried/duplicated/out of order** | Verify `X-Hub-Signature-256`, ack in < 1–2 s, enqueue, de-duplicate on WhatsApp message id |
| Media links from WhatsApp expire quickly | Download inbound resume PDFs immediately into object storage |
| Throughput per number is finite (starts ~80 msg/s, can rise) **[verify]** | Outbound queue with rate limiter; scale number count later if needed |

### 2.2 Integration pattern

- A **Channel Adapter** interface (`parseInbound`, `sendText`, `sendInteractive`, `sendDocument`, `sendTemplate`, `createThread`). Both launch channels implement it (WhatsApp via
  Meta's Cloud API, Discord via signed HTTP interactions); a Business Solution Provider (Twilio, 360dialog, Gupshup, etc.) or Telegram/web chat can be swapped in
  without touching agent code. Start on Meta's Cloud API directly (no per-message BSP markup); keep the adapter thin enough that
  switching is a config change.
- Agents never call WhatsApp or Discord. They return a **channel-neutral message model** (text blocks, action buttons, attachments,
  `job_id`). The adapter renders it, so the same output also renders in the web app.

### 2.3 Discord: how it works and what constrains it

One JobsQ **Discord application**. Use **HTTP interactions** (slash commands, buttons, select menus, modals) rather than a long-lived gateway
connection: every request is signed (Ed25519, verified on each call), the endpoint is stateless and scales behind the load balancer, and there is no
gateway sharding to run. A small gateway worker is added only for events interactions cannot give us, such as someone joining the user's server. **[verify]**

| Constraint | Consequence for JobsQ |
|---|---|
| Interactions must be acknowledged within about 3 s; deferred replies can be edited or followed up for about 15 min **[verify]** | Same pattern as WhatsApp: ack immediately, enqueue, post the agent result with the bot token when ready |
| Message limits: 2000 chars of content, embeds up to 4096 chars each, buttons 5 per row (5 rows), select menu 25 options, attachment size limit around 10 MiB by default **[verify]** | Shortlist (≤ 8) fits one select menu; a one-page résumé PDF fits as an attachment; long text goes into embeds or splits |
| Rate limits: per-route buckets plus a global limit per bot (about 50 requests/s) | Outbound sender honours `retry-after` and per-route buckets; one queue per guild/channel |
| **Message Content** is a privileged intent (needs Discord approval once the bot is in 100+ servers) | Design the primary path on commands, buttons, selects and modals, not on parsing typed text. Typed text ("go 1,3") works in DMs and when the bot is mentioned, as a convenience |
| Bot **verification is required at 100 servers**; gateway sharding is mandatory at 2,500 **[verify]** | The one-server-per-user model reaches 100 servers quickly, so start verification and intent applications in Phase 1 |
| No 24-hour window and no template fees | Daily digests and follow-up nudges can be normal posts in the user's channel, with no per-message cost |
| Threads are native, but they auto-archive (1 h to 7 d) **[verify]** | Bot un-archives a thread when a pipeline step posts, and keeps a thread-id map in `pipelines` |

**Where Discord users live (D8).**

| Option | Privacy | Friction | Verdict |
|---|---|---|---|
| A. User's own private server with the JobsQ bot (the source's model) | Best: only the user is a member | Medium: create a server, add the bot, run `/jobsq setup` | **Default for the full experience** |
| B. DM with the bot | Good | Lowest | **Fallback.** No threads in DMs, so it uses the WhatsApp job-code model |
| C. Private channels inside a JobsQ-owned server | Weak: server admins can see everything; 500-channel cap needs many servers | Low | **Rejected for v1** |

**Least-privilege bot permissions:** View Channel, Send Messages, Send Messages in Threads, Create Public Threads, Attach Files, Embed Links, Read Message History.
No Manage Channels, no Administrator: the user picks the channel and runs `/jobsq setup` in it. Account linking is by Discord OAuth2 (`identify`) from the web app, which ties the Discord user id to the JobsQ account.

**Private-space check.** On setup and on later checks the bot confirms the server has only the user as a human member. If another person joins, it stops posting résumés, contact lists and drafts there and tells the user how to fix it. **[verify the cheapest reliable way to read member counts]**

---

## 3. System architecture

```
                       ┌────────────── Web app (Next.js) ──────────────┐
 WhatsApp user ─────┐  │ signup · resume upload · prefs · tracker · billing │
                    ▼  └───────────────┬───────────────────────────────┘
        Meta Cloud API webhook          │ REST/tRPC
                    ▼                   ▼
              ┌──────────────────  API / Gateway (stateless, autoscaled) ─────────────────┐
              │  webhook receiver (verify sig, dedupe, enqueue) · auth · entitlements      │
              └───────┬───────────────────────────────┬───────────────────────────────────┘
                      ▼                               ▼
            Inbound queue (per-user ordered)     Postgres (RLS)  ·  Redis  ·  Object storage
                      ▼
        ┌──── Conversation Orchestrator (deterministic state machine) ────┐
        │ intent router → workflow state → calls Agent Runner             │
        └───────┬─────────────────────────────────────────────────────────┘
                ▼
        Agent Runner (LLM API + tool loop, model router, budgets, prompt caching)
                ▼ tools (server-side, tenant-scoped)
   search_jobs · check_posting · web_research · find_contacts · render_resume · build_links · tracker · knowledge
                ▼
   Worker pools: ingestion · matching · research · render (headless Chromium) · scheduler · outbound sender
                ▼
   Outbound queue (rate-limited, template/window aware) ──► WhatsApp Cloud API
```

Discord enters the same API through the signed interactions endpoint, and its replies leave through the same outbound queue and rate limiter. Everything
behind the Channel Adapter (orchestrator, agents, tools, database) is identical for both channels.

### 3.1 Technology choices

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript end to end** | The source tools are Node; Anthropic SDK and Puppeteer are first-class; one language for web + API + workers |
| Web | Next.js + Tailwind | Fast to build; SSR for marketing/pricing |
| API | Fastify (or NestJS) | Stateless, easy horizontal scale |
| DB | **PostgreSQL** (managed: RDS/Cloud SQL/Neon) + **Row-Level Security** on `user_id`; read replica later; `pgvector` for job/resume embeddings | One store for relational, queue-adjacent, and vector needs until it hurts |
| Queue | **BullMQ on Redis** to start (Redis also for rate limits, locks, caches); move to SQS/Kafka only if volume demands | Simple, good enough to ~millions of jobs/day |
| Workflow state | **Explicit state machine in Postgres** (`job_pipeline.state`) driven by queue messages. Temporal is the upgrade path if approval waits and retries get complicated | Approval gates can wait days; DB state survives restarts |
| Object storage | S3 / Cloudflare R2; key prefix `u/{userId}/…`; SSE-KMS | Resumes are sensitive PII |
| PDF | Dedicated render service (Gotenberg or Puppeteer pool) | Chromium is heavy and must be isolated and capped |
| LLM | Anthropic API: **Haiku 5.5** (bulk classification/extraction/rerank), **Sonnet 5.5** (Scout, Researcher, Email, LinkedIn), **Opus 5.5** (Resume, Prep) | Mirrors the source's fast/strong split with a cheaper bottom tier. Re-check current model ids and prices at build time |
| Auth | Phone-first identity (WhatsApp) + web login via magic link/OTP; sessions server-side | Phone number is the primary key to the human |
| Payments | Razorpay (+ Stripe later) behind a `BillingProvider` interface | D2 |
| Infra | Containers on ECS/Fargate or Kubernetes; Terraform; CI/CD with staged rollout | Autoscale API, workers by queue depth |
| Observability | OpenTelemetry → Grafana/Datadog; Sentry; structured logs | §10 |
| Secrets | Cloud secret manager + KMS; never in the repo or logs | §9 |

---

## 4. Data model (multi-tenant, every row has `user_id`)

Core tables (names indicative):

- `users` (id, phone_e164 UNIQUE NULLABLE (Discord-only users have no phone), email, primary_channel whatsapp/discord, name, country, locale, timezone, plan_id, status, consent_at, opted_out_at, created_at)
- `channel_identities` (user_id, channel whatsapp/discord, external_id (wa_id or Discord user id), linked_at, opted_out_at) — one user can have both
- `wa_windows` (user_id, last_inbound_at, window_expires_at) — drives the WhatsApp 24 h window logic
- `discord_spaces` (user_id, guild_id, channel_id, mode server/dm, private_ok, last_checked_at)
- `resume_master` (user_id, version, source_file_key, text, parsed_json) — **the only source of truth for facts**
- `preferences` (user_id, roles[], skills[], locations[], remote_ok, experience_years, industries[], min_salary, currency, excluded[], digest_time, digest_enabled)
- `jobs` (global, **not** per-user: id, canonical_key, title, company_id, location, remote, salary_min/max/cur, description, apply_url, source, source_ref, posted_at, first_seen_at, last_checked_at, status open/closed, embedding)
- `companies` (global: id, name, domain, ats_type, ats_slug, research_cache jsonb, research_at)
- `matches` (user_id, job_id, score, reasons jsonb, state shown/picked/dismissed, shown_at)
- `pipelines` (id, user_id, job_id, short_code, state, state_data jsonb, discord_thread_id nullable, created_at) — **replaces the per-job thread/folder**
- `artifacts` (pipeline_id, kind research/people/resume_html/resume_pdf/drafts, version, file_key, json, approved_at)
- `contacts` (pipeline_id, name, role, linkedin_url, email, email_status verified/unconfirmed/none, confidence, source)
- `outreach` (id, pipeline_id, contact_id, channel email/linkedin, status drafted/sent/replied, draft_text, sent_at, follow_ups, to_address)
- `applications` (pipeline_id, status applied/interviewing/rejected/offer, updated_at)
- `messages` (user_id, direction, channel, channel_message_id (UNIQUE with channel), type, pipeline_id nullable, text_hash, created_at, status) — **no raw message text retained beyond a short TTL unless needed for support; see §9**
- `usage_events` (user_id, kind, units, llm_tokens_in/out, cost_micro_usd, model, pipeline_id, at) — metering ledger, append-only
- `subscriptions`, `invoices`, `entitlements` (plan limits resolved per period)
- `audit_log` (actor, action, target, at) — admin/support access and data deletion

Rules: RLS policy `user_id = current_setting('app.user_id')` on every tenant table; global tables (`jobs`, `companies`) hold no personal data;
`short_code` is unique per user (e.g. `J7`). Derived counters (usage totals, "jobs applied") are computed from event tables, never stored as literals.

---

## 5. Job discovery at scale (biggest cost and scale lever)

The source runs a live search per user per request. At scale that is slow, expensive and rate-limited. Change it to **ingest once, match many**.

1. **Ingestion workers** (scheduled, per source, polite rate limits):
   - ATS public APIs the source already uses: Greenhouse, Lever, Ashby; add Workable, SmartRecruiters, Recruitee where available.
   - Paid aggregator APIs: JSearch/OpenWeb Ninja, SerpApi Google Jobs, or alternatives (Adzuna, Jooble, etc.) on production plans, queried by a **demand-driven query set** derived from active users' preferences (de-duplicated across users).
   - Never scrape or open LinkedIn, Indeed or Naukri (kept from the source; ToS and legal risk). Revisit only via licensed data.
2. **Normalise + dedupe globally** with the source's algorithm (normalised company, Jaccard ≥ 0.7 on title tokens, keep the richer record, merge fields), then add an embedding for each job.
3. **Freshness**: re-check open/closed with `check-posting` on a schedule and just-in-time before showing a job to a user.
4. **Matching per user** (runs on a schedule and on demand):
   - Stage 1, hard filters in SQL: location/remote, experience band, excluded roles, salary only if listed, no interns/freshers unless requested.
   - Stage 2, vector similarity between job and `resume_master`/preferences embeddings, take top N.
   - Stage 3, Haiku rerank/explain: score 0–100 plus the ≤ 12-word "why it fits" and flagged gaps.
   - Store in `matches`; never show the same job twice unless the user asks.
5. **Fallback**: if fewer than 5 good matches, a bounded WebSearch pass (as the source does), still excluding restricted sites.
6. **Cost control**: global cache keyed on (query, location, date bucket); shared across users; budget per source per day with alerts.

### 5.1 Data sources: free in development, paid in production

**A production feature must never depend on a free-tier key.** Free tiers are for development, tests and a small internal pilot. Before the paid beta (Phase 3) every
provider below must have a paid plan, confirmed terms that allow commercial use, and a fallback.

| Source | Development / Phase 1 | Production |
|---|---|---|
| Job search aggregator (JSearch / SerpApi class) | Free tier (about 100 and 250 calls a month) | **Paid plan with commercial-use terms; two providers so one outage doesn't empty shortlists** |
| ATS public endpoints (Greenhouse, Lever, Ashby) | Free, no key | Free, but ingested politely: rate limits, caching, terms checked |
| Contact lookup (Hunter class) | Free tier (about 50 credits a month) | **Paid plan sized to the plan caps in §8.1**, plus a shared per-domain cache |
| Web search and fetch for research | Free or low-cost | Paid search API with a daily budget |
| Anthropic API | No free tier; small dev spend | Paid usage with budgets, caching, and a volume agreement at scale |
| WhatsApp Cloud API | Test number | Replies in the 24 h window are free; templates billed per message **[verify]** |
| Discord API | Free | Free |

Phase 0 deliverable: a provider comparison (price per call, quotas, terms of use, uptime) and a chosen primary and backup for each paid row.

---

## 6. Conversation design: one engine, two channels

### 6.1 WhatsApp: threads → job-scoped context

One 1:1 chat per user. Per-job separation comes from three mechanisms used together:

1. **Job codes.** Every shortlisted job gets a short code (`J7`). Every pipeline message carries a header `📌 J7 · Company – Role` (the source's "start every message with Company – Role").
2. **Reply-to routing.** When a user *replies* to a message, WhatsApp supplies the quoted message id; map it to `pipeline_id`, so "approved" or "change summary" binds to the right job without typing a code.
3. **Active-job pointer + disambiguation.** If neither applies and the user has several open pipelines, show a list message "Which job?" (≤ 10 rows). A user can also type `J7 approve`.

Buttons on each gate message carry the pipeline id in their payload, so taps are unambiguous.

### 6.2 Six agents, one number (WhatsApp; Discord is in §6.7)

Agents are internal roles; the user sees a consistent JobsQ voice with an agent header:

`🔎 Scout` · `🧭 Researcher` · `📄 Resume Tailor` · `✉️ Email` · `🔗 LinkedIn` · `🎯 Interview Prep`

Users can still address them naturally ("@resume change the summary") but intent routing is done by the orchestrator, not by tagging.
(Header emoji are chat styling; keep them out of the web UI icon set.)

### 6.3 Pipeline and gates as a state machine

```
ONBOARDING → PROFILE_CONFIRMED
SHORTLIST_SHOWN ──(go 1,3 / tap)──► per picked job: JOB_CAPTURED
JOB_CAPTURED → RESEARCHING → PEOPLE_PROPOSED ──[Approve people]──► RESUME_DRAFTING
RESUME_DRAFTING → RESUME_PROPOSED ──[Approve resume]──► OUTREACH_DRAFTING (email ∥ linkedin)
OUTREACH_DRAFTING → OUTREACH_READY ──(user: "sent 1,2")──► TRACKING
TRACKING ──(5 d, timer)──► FOLLOWUP_DUE ──► FOLLOWUP_DRAFTED
TRACKING ──("they replied")──► INTERVIEW_PREP
terminal: applied / rejected / offer / archived
```

Every transition into an "approval" state sends an interactive message with **[Approve] [Change] [Skip job]**. "Change" opens a short
free-text exchange with the owning agent, producing a new artifact version (e.g. `resume.pdf` v2). **No state advances without an
explicit user action**; this is enforced in the orchestrator, not left to the prompt.

### 6.4 Message catalogue (all four gates, plus onboarding)

- **Onboarding**: welcome (consent, what we do, "we never send anything for you") → resume upload (PDF as document) → preference
  questions (one message, or a WhatsApp Flow form for structured input **[verify Flows availability for your account]**) →
  5-line summary + [Looks right] [Edit].
- **Shortlist** (list message): rows "Company – Role" / location · salary; body carries link and "why it fits"; footer "Pick with go 1,3".
- **Research**: company summary + people list; buttons [Approve people] [Remove someone] [Skip].
- **Resume**: PDF document + "What changed" (≤ 6) + "Gaps" + apply link; [Approve] [Change].
- **Outreach**: per contact: number, name, role, email status, subject, body, "Open in Gmail" link, reminder to attach the PDF;
  footer "After sending, reply `sent 1,2`".
- **Follow-up**: template-opened (see §6.5), then free-form drafts.
- **Prep**: sections sent as several messages (process, topics, questions, plan); mock interview as a one-question-at-a-time loop with `stop`.

### 6.5 Proactive messages on WhatsApp (daily digest, follow-up nudges)

Outside the 24 h window only templates may be sent. Create and get approved, with variables, e.g.:

1. `daily_digest` (utility/marketing **[verify category]**): "Hi {{1}}, {{2}} new jobs match your profile today." Quick-reply buttons: [Show me] [Pause].
2. `followup_due`: "{{1}} follow-ups are due for your outreach." [Draft them] [Later].
3. `window_reopen` for re-engagement after silence, rate-capped.
4. `plan_expiring` / `payment_failed` (utility).
5. Authentication template for phone verification OTP at web signup.

A tap on a template button opens a fresh 24 h window, and the orchestrator then sends the real content free-form. Send times respect the
user's timezone and quiet hours. Frequency is plan-gated and capped to protect quality rating (poor ratings reduce tier limits).

### 6.6 Web companion handoff

Deep links with a signed, short-lived token ("Open in JobsQ") for: editing resume text, full tracker table, preferences, billing.
WhatsApp stays the primary surface; the web covers what chat does badly.

### 6.7 Discord conversation design

The state machine (§6.3), the four gates, the agents and the artifacts are identical to WhatsApp. Only the rendering differs, and it matches the source more closely
because Discord has real threads.

- **Layout (server mode):** `#job-hunt` is the main channel. Only Scout posts there: the shortlist and one "📌 Company – Role" opener per picked job. Each opener starts a **thread**,
  and every agent posts in that thread. The four approvals happen in the thread.
- **Picking jobs:** a multi-select menu ("Pick jobs", 1 to 8 choices) plus a [Go] button, instead of typing "go 1,3". Typing still works in DMs or on mention.
- **Gates:** [Approve] [Change] [Skip job] buttons. The button's `custom_id` (up to 100 characters) carries the pipeline id and step, so a tap is unambiguous. [Change] opens a modal for the instruction.
- **Commands:** `/jobsq setup`, `/jobsq find`, `/jobsq status`, `/jobsq followups`, `/jobsq prep`, `/jobsq settings` (opens the web companion).
- **Six agent voices:** one application, with the bot posting through an application-owned webhook per channel that sets a different name and avatar for each agent (Scout, Researcher, Resume Tailor, Email, LinkedIn, Interview Prep),
  which gives the source's six-agent look without six bot apps. Fallback if webhooks cause trouble: bot messages with an embed author line per agent. **[verify that application-owned webhooks can carry buttons in threads]**
- **Files:** `resume.pdf` is an attachment with the "What changed" and "Gaps" embed. Drafts are embeds with an "Open in Gmail" link button.
- **Digest and nudges:** ordinary posts in `#job-hunt` with [Show me] [Pause] buttons. No template and no per-message cost.
- **DM mode (fallback):** no threads, so it uses the WhatsApp job-code and reply routing model (§6.1).

### 6.8 Using both channels

- Each user has one **primary channel**, chosen at onboarding and changeable. Pipeline conversation and proactive nudges go there, so nothing is duplicated by default.
- A gate can be answered from **any linked channel or the web**. The first valid action wins, and the other channel's message is edited to read "Approved in WhatsApp" (or Discord), so a stale button can't act twice (idempotency key per gate).
- A subscription covers the user, not the channel, and quotas count per user. A user can link both and switch with one command.
- Discord-only users have no phone number. Signup and payment are the identity check, and WhatsApp OTP is only used for users who choose WhatsApp.

---

## 7. Agent runtime (replacing "six Claude Code CLI agents")

### 7.1 Runner design

- Each agent = system prompt + tool allowlist + model tier + output schema + token/step budget. Implemented on the Anthropic API with
  tool use (Agent SDK where it helps). **No shell, no filesystem, no browser for agents**; every capability is a typed server-side tool.
- **Orchestration is deterministic code**, not an LLM deciding who talks next. The LLM does language tasks inside a step.
- **Model router**: default tier per agent; downgrade on budget pressure; upgrade on repeated verification failure.
- **Prompt caching** for stable prefixes (system prompt + `resume_master` + preferences), the largest recurring token cost.
- **Structured outputs** (JSON schema) for shortlist rows, people lists, resume sections, drafts, so the channel adapter renders them and validators can check them.
- **Per-user concurrency limit** and a global concurrency pool per model to stay under API rate limits; queues absorb bursts.
- **Retries/idempotency**: every step has an idempotency key (`pipeline_id:step:version`); safe to re-run after a crash.

### 7.2 Tool layer (ports of the source scripts, hardened)

| Tool | Port of | Production changes |
|---|---|---|
| `search_jobs` | `search-jobs.mjs` | Reads the shared index first; live API calls only through the quota-aware gateway |
| `check_posting` | `check-posting.mjs` | Same ATS adapters + caching + SSRF-safe fetcher; slug guessing kept |
| `web_research` | WebSearch/WebFetch | Allowlist/denylist (LinkedIn/Indeed/Naukri blocked; Glassdoor/AmbitionBox snippets only), size/time caps, content stripped of instructions |
| `find_contacts` | `hunter.mjs` | Per-domain cache shared across users; per-pipeline caps (1 domain search, 3 verifications); credit budget with alerts |
| `render_resume` | `make-pdf.mjs` | Remote render service, page-count check, retry with trimming |
| `build_links` | `links.mjs` | Gmail compose + `mailto:`; warn when URL > 2000 chars and fall back to "copy text" |
| `tracker` | `tracker.mjs` | Postgres tables, not a JSON file; same semantics (`due` ignores replied/interviewing/rejected/offer; ≤ 2 follow-ups) |

All tools take `user_id` from the server context, **never from model output**, so an injected prompt cannot read another tenant's data.

### 7.3 Truthfulness enforcement (the product's core promise)

The source relies on prompt rules ("never add a skill, number, title, employer"). A paid product needs a check in code:

1. The Tailor returns structured resume JSON (sections → items with `source_ref` pointing into `resume_master`).
2. A **verifier** (deterministic checks + a Haiku pass) confirms every skill, employer, title, date and number in the output exists in `resume_master`. Any failure blocks the artifact and triggers a regeneration, never a send to the user.
3. "Gaps" are generated from the job requirements minus verified skills, stated plainly.
4. The same pattern guards Email/LinkedIn drafts (facts about the user must trace to the resume or research) and Researcher output (people marked "not confirmed" unless a source URL is stored; **never** guess emails).

### 7.4 PDF rendering service

Isolated autoscaled pool (Gotenberg or Puppeteer in a locked-down container: no network egress except font/asset CDN, CPU/memory/time limits, queue-based concurrency).
HTML comes from a fixed template with escaped variables (no model-authored raw HTML/JS reaches the renderer; sanitise). Output: A4, 1 page enforced, stored in object storage; send as WhatsApp document.

### 7.5 Email handling (honest about WhatsApp)

Gmail compose links work on desktop and mobile Gmail but the PDF cannot be attached by link, hence the "attach resume.pdf from above" instruction in the source.
Roadmap: (a) v1 compose link + PDF sent as a WhatsApp document to forward/save; (b) Phase 2 optional Gmail OAuth to **create drafts with the PDF attached**
(the user still sends). Gmail's compose/draft scopes are classified as sensitive/restricted by Google and require app verification and possibly a security assessment, so schedule that lead time before promising it.

### 7.6 Prompt-injection and abuse defences

- Job posts, web pages, resumes and contact lists are **untrusted data**. Wrap them in delimiters, instruct the model they are information only (as the source does), and keep tools least-privilege so a successful injection can't do much.
- Tool outputs are length-capped and sanitised; no tool can send messages, spend money, or touch another user.
- Outbound text is scanned for secrets and for links not from the approved set (apply URL from the job record, our own domain, Gmail compose).
- Rate-limit per user and per phone; detect resume-upload spam and bulk-signup abuse.

---

## 8. Subscriptions, entitlements and unit economics

### 8.1 Plans (starting proposal; tune with data)

There is **no free plan**. Every user is on a paid subscription; limits below are fair-use caps that protect margin.

| | Pro | Premium |
|---|---|---|
| Daily digest | daily | daily + priority matching |
| Shortlists/day | 5 | unlimited (fair use) |
| Tailored resumes / month | 30 | 100 |
| Contact lookups (Hunter-backed) | 20 | 80 |
| Interview Prep sessions | 3 | unlimited (fair use) |
| Follow-up automation | yes | yes |
| Model tier for Resume/Prep | Opus | Opus |
| Support | email | priority |

### 8.2 Mechanics

- **Entitlement service**: one function `can(user, feature, units)` used by the orchestrator before every costly step; returns allow / soft-limit (upsell message with a tap-to-upgrade link) / hard-limit.
- **Metering**: every LLM call, search, lookup, render and template send writes a `usage_events` row with measured cost; dashboards show cost per user, per plan, per feature (**gross margin per plan is a tracked metric from day one**).
- **Budgets**: per-user daily LLM cost ceiling (anomaly guard) and global kill-switch per model/provider.
- **Billing**: Razorpay subscriptions/UPI autopay (+ Stripe later); webhooks idempotent and signature-verified; dunning via a utility template; grace period then downgrade; invoices/GST handling as required **[confirm with accountant]**. Payment links open on the web; **no card/UPI details are ever handled in chat**.
- **Referrals/trials** as config, not code.

### 8.3 Cost model summary (full detail with numbers in §8.4)

Per active user per month ≈ LLM tokens (shortlists, research, resume, drafts, prep) + search/aggregator calls (amortised across users) + Hunter credits +
WhatsApp template fees + PDF compute + infra. Instrument all six from the first pilot; set plan prices so each plan keeps a target margin (e.g. ≥ 70 % gross) under p90 usage.

### 8.4 Cost model (prices read from provider pages on 2026-11-16)

All figures are USD unless marked ₹. Exchange rate assumed **₹90 = $1** (check at launch). Usage numbers are **assumptions to be replaced by measured data in the Phase 1 pilot**; prices are from the providers' pages, with the gaps listed in §8.4.8.

#### 8.4.1 Unit prices

| Item | Price | Source / note |
|---|---|---|
| Claude Haiku 5.5 (prompts ≤ 100k tokens) | $0.10 in / $0.50 out per million tokens; cache read $0.01 | Anthropic pricing page |
| Claude Sonnet 5.5 | $2 in / $10 out; cache read $0.10; cache write (5 min) $2.50 | same |
| Claude Opus 5.5 | $4 in / $20 out; cache read $0.20; cache write (5 min) $5 | same |
| Batch API | 50% off input and output (can combine with caching) | same; not for interactive replies |
| Claude web search tool | about $10 per 1,000 searches plus tokens | **unverified**: only seen in a model summary of the page |
| WhatsApp, India (per delivered message) | Marketing about $0.0118 (≈ ₹1.06); utility, authentication and service about $0.0014 (≈ ₹0.13) | Twilio's CSV (no currency column) and Interakt's INR page (₹0.95–0.97 marketing, ₹0.14–0.16 utility) agree. Meta's own rate card was not retrievable |
| WhatsApp, US / Canada | Utility, authentication, service about $0.0034; marketing shown as "x" in Twilio's CSV (unclear) | same caveat |
| WhatsApp charging rules | Per delivered message. User messages are free. Free-form service and in-window utility messages are charged after **1,000 free per number per month** from 2026-10-01 | Meta developer docs; conflicts with Meta's marketing page |
| Discord | $0 | |
| JSearch (OpenWeb Ninja) | $0.003 per request ($0.03 per 10), pay as you go | commercial and storage terms **not verified** |
| SerpApi | $25 / 1k, $75 / 5k, $150 / 15k, $275 / 30k, $725 / 100k, $1,475 / 250k searches per month | terms not read |
| Adzuna | No public prices; **commercial use needs a written licence** | not a drop-in |
| Hunter | Starter $49 (2,000 credits), Growth $149 (10,000), Scale $299 (25,000) per month; about 30% less billed yearly; verification costs 0.5 credit | whether the API is included per plan is **unconfirmed** |
| Web search APIs | Serper $0.30–$1.00 per 1,000; Brave $5 per 1,000; Tavily $8 per 1,000 | commercial/AI-use terms not stated on the pages |
| Razorpay | 2% on domestic cards, UPI and netbanking, plus 18% GST on the fee (about 2.4% effective); subscriptions on cards 0.9% plus platform fee; international up to 3% | UPI autopay price "on request" |
| Stripe India | 2% domestic cards, 3% international, plus 0.7% for Stripe Billing | |
| Compute (Fargate ARM, US East example) | $0.0324 per vCPU-hour, $0.00356 per GB-hour | **Mumbai prices not found** |
| Load balancer, NAT gateway | ALB about $0.0225 per hour; NAT $0.045 per hour plus $0.045 per GB | US East examples |
| Postgres (Neon) | Launch $0.106 per compute-unit-hour; **Scale (uptime SLA) $0.222**; storage $0.35 per GB-month | Supabase Pro from $25 + compute add-on $10–$110 is a cheaper alternative |
| Redis (Upstash) | 1 GB fixed $20 per month; Prod Pack (SLA, multi-zone) +$200 | |
| Object storage (Cloudflare R2) | $0.015 per GB-month; no egress fees | |
| Embeddings (Voyage 4 lite) | $0.02 per million tokens | negligible |
| Sentry / Grafana | Team $29 / Business $89 per month; Grafana Pro $19 plus usage | |

#### 8.4.2 Usage assumptions per active paid user per month

| | Light | **Typical** | Heavy (Pro cap) |
|---|---|---|---|
| Shortlists | 6 | 15 | 30 |
| Jobs taken through the pipeline ("pipelines") | 6 | **15** | 30 |
| Interview Prep sessions | 0.5 | **1** | 3 |
| Outbound chat messages (WhatsApp) | 300 | **650** | 1,200 |
| Contact lookups (Hunter credits) | 15 | **26 (after sharing the cache)** | 50 |

#### 8.4.3 LLM and search cost of one pipeline

"As designed" is the plan as written (Opus for Résumé and Prep). "Optimised" uses Sonnet for the résumé on the lower plan, a shared company-research cache (assume 40% hit), prompt caching and the Batch API for follow-ups.

| Step | Model and size (tokens in / out) | As designed | Optimised |
|---|---|---|---|
| Company research + 5 searches | Sonnet, about 80k / 5k | $0.26 | $0.16 |
| Résumé + verifier | Opus 40k / 8k (optimised: Sonnet) | $0.32 | $0.16 |
| Email drafts (3 contacts) | Sonnet 15k / 2k | $0.05 | $0.04 |
| LinkedIn drafts | Sonnet | $0.04 | $0.03 |
| Follow-ups (0.5 per pipeline) | Sonnet | $0.03 | $0.02 (batch) |
| Capture the posting | Haiku | $0.001 | $0.001 |
| **Total per pipeline** | | **about $0.70** | **about $0.41** |

Other per-user costs: a shortlist about $0.03 (Haiku rerank plus Sonnet write-up), chat routing about $0.10 a month, one Interview Prep session about $1.10 on Opus (research, plan, mock interview) or about $0.55 on Sonnet.

#### 8.4.4 Variable cost per user per month

| Profile | LLM + search, as designed | LLM + search, optimised |
|---|---|---|
| Light | $5.05 | $3.04 |
| **Typical** | **$12.15** | **$7.25** |
| Heavy | $25.35 | $15.00 |

WhatsApp adds about $0.97 per WhatsApp user a month in India when every free-form message is charged ($0.0014 × 650, plus about 30 digest and 8 nudge templates as utility). If the daily digest is classed as marketing it rises to about $1.28. Cutting to 300 richer messages brings it to about $0.47. Assuming **70% of users on WhatsApp**, the average is **$0.68 as designed or $0.33 optimised**. Discord costs nothing. In the US the same traffic would cost about 2.4× more.

#### 8.4.5 Monthly totals for 100, 1,000 and 10,000 paying users (typical profile)

Shared costs are estimated at typical sizing: 7 / 14 / 40 always-on containers; managed Postgres on the SLA tier; Redis with the production pack; observability. Job search assumes about 100 / 400 / 2,000 distinct role-and-city queries refreshed daily on two providers. Hunter assumes 2,600 / 26,000 / 260,000 credits.

| Monthly cost | 100 users | 1,000 users | 10,000 users |
|---|---|---|---|
| Compute (containers, PDF renderer, workers) | $210 | $420 | $1,200 |
| Load balancer and NAT | $77 | $95 | $180 |
| Postgres (SLA tier) | $170 | $360 | $1,500 |
| Redis | $220 | $220 | $300 |
| Storage, embeddings | $0 | $5 | $15 |
| Sentry and Grafana | $48 | $170 | $440 |
| Email, secrets, backups, domain (misc) | $50 | $100 | $300 |
| **Shared infrastructure** | **$775** | **$1,366** | **$3,930** |
| Job search (JSearch + SerpApi) | $168 | $347 | $1,835 |
| Contact lookup (Hunter) | $149 | about $360 | about $3,100 (extrapolated, enterprise quote needed) |
| **Data providers** | **$317** | **$707** | **$4,935** |
| LLM + web search, as designed | $1,215 | $12,150 | $121,500 |
| LLM + web search, optimised | $725 | $7,250 | $72,500 |
| WhatsApp (70% of users), as designed / optimised | $68 / $33 | $680 / $330 | $6,800 / $3,300 |
| **Total, as designed** | **about $2,375** | **about $14,900** | **about $137,200** |
| **Total, optimised** | **about $1,850** | **about $9,650** | **about $84,700** |
| **Cost per user per month, as designed / optimised** | **$23.75 / $18.50** | **$14.90 / $9.65** | **$13.72 / $8.47** |

Not included: payment fees (about 2.4% of revenue), salaries, support, marketing, legal, security testing, Meta verification and the cost of a Google verification for Gmail drafts.

**What stands out:** at scale, **LLM use is about 90% of the bill** and shared infrastructure is under 5%. Below 1,000 users the fixed costs dominate, so cost per user is high.

#### 8.4.6 Price floor from this cost

Required monthly price per user = cost ÷ (1 − 2.4% payment fee − target gross margin), using the typical profile.

| Cost per user | 50% margin | 60% margin | 70% margin |
|---|---|---|---|
| As designed at 10,000 users, $13.72 | $28.8 (₹2,600) | $36.5 (₹3,290) | $49.7 (₹4,470) |
| Optimised at 10,000 users, $8.47 | $17.8 (₹1,600) | $22.5 (₹2,030) | $30.7 (₹2,760) |
| Optimised at 1,000 users, $9.65 | $20.3 (₹1,830) | $25.7 (₹2,310) | $35.0 (₹3,150) |

A heavy user on the lower plan costs about $15 (optimised) to $25 (as designed) a month, so a price set on the typical user loses money on heavy users unless caps bite.

#### 8.4.7 What this means for pricing

1. **The cost unit is one pipeline (about $0.41–$0.70).** Price and cap plans on "tailored applications per month", not on features.
2. **Lowest-risk levers, in order:** cap pipelines per plan; use Sonnet for the résumé on the lower plan and keep Opus for the top plan; share company research across users; use prompt caching; send the 50%-off Batch API for follow-ups and the digest; send fewer, richer WhatsApp messages; extend cached Hunter results.
3. **Interview Prep is the most expensive single action on Opus** (about $1.10 a session). Cap it per plan.
4. **Margins thin out at Indian price points.** A price near ₹1,500–₹2,000 a month supports only about a 50% margin even when optimised. A higher price, a lower application cap, or a cheaper default model is needed for 70%.
5. **WhatsApp costs more than expected** because free-form replies are now charged after 1,000 free a month per number, and the 1,000 is per number, not per user.

#### 8.4.8 Unverified or missing (resolve in Phase 0)

- ~~Meta's own INR and USD rate card, and whether free-form service messages are charged.~~ **Resolved on 2026-11-17:** the rate cards were read and are in [docs/WHATSAPP_VERIFICATION_PLAN.md §14](../WHATSAPP_VERIFICATION_PLAN.md#14-prices-and-limits-read-from-meta-on-2026-11-17). Service messages are charged after the first 1,000 per number per month, and in India they cost the same as utility messages.
- JSearch, SerpApi and Brave/Serper/Tavily **commercial-use, caching and storage terms**; Adzuna requires a licence.
- Whether Hunter's API is included on each plan, and its enterprise price for large volumes.
- Fargate, RDS and ElastiCache **Mumbai** prices (the pages showed only US East), and Anthropic's web search price from the verbatim page.
- Real usage: all of §8.4.2 is an assumption until the pilot.
- Rate limits and volume discounts on the Anthropic API (negotiated; none published).

---

## 9. Security, privacy and compliance

Resumes, phone numbers, job-search intent and contact lists are sensitive. Treat privacy as a feature.

- **Tenancy**: Postgres RLS + object-storage prefix isolation + tenant-scoped tool context; automated cross-tenant tests in CI that must fail closed.
- **Encryption**: TLS everywhere; at-rest encryption with KMS; field-level encryption for resume text and contact emails.
- **Logging rule** (same discipline as BenchQ's): never log names, emails, phone numbers, resume or message text, tokens or keys. Log ids, state names, counts, timings. A canary test fails the build if a fixture PII string reaches logs.
- **Message retention**: keep metadata; store message bodies only as needed for the product (artifacts, drafts) with a TTL; document it in the privacy policy.
- **Rights**: self-serve export and delete (web + `delete my data` in chat), with deletion propagated to object storage, vector index, caches and backups within a stated window. Consent captured at signup and per marketing template category.
- **Regulation to review with counsel**: India DPDP Act; GDPR/UK GDPR if EU/UK users; CAN-SPAM/PECR implications of users cold-emailing (mitigated by "user sends" and by not auto-sending); WhatsApp Business and Commerce policies; Google API terms; ToS of each job data source.
- **Contact data**: Hunter-style lookups involve third-party personal data; store minimal fields, honour removal requests, show source, never guess addresses.
- **Platform security**: secrets in manager (never `.env` in prod), least-privilege IAM, dependency scanning, SAST, image signing, WAF + rate limits, admin access via SSO + audit log, backups with restore drills, pen-test before public launch.
- **WhatsApp account safety**: protect the WABA/System User tokens; rotate; alert on quality-rating drops; support `STOP`.
- **Discord safety**: verify the Ed25519 signature on every interaction; protect and rotate the bot token; least-privilege permissions (§2.3); the private-space check stops sensitive posts if another human joins the user's server; tell users in the privacy policy that Discord and Meta also process the messages they send through their apps.

---

## 10. Reliability, scale and operations

### 10.1 Scaling plan

| Concern | Approach |
|---|---|
| Webhook burst | Stateless receivers behind a load balancer; ack fast, enqueue to Redis; p99 ack < 1 s. Discord interactions must be acknowledged within about 3 s (defer, then follow up) |
| Per-user ordering | One in-flight job per user (queue group keyed by `user_id`); prevents out-of-order replies and double processing |
| LLM throughput | Worker pools per model tier; concurrency tokens; exponential backoff on 429/529; provider-level circuit breaker with degraded mode ("taking longer than usual…") |
| Outbound sending | Dedicated sender with per-number (WhatsApp) and per-route/global (Discord) rate limiters, template/window checks (WhatsApp only), retry + dead-letter, delivery-status webhooks to update `messages.status` |
| DB | Pooled connections (PgBouncer), indexes on `(user_id, …)`, partition `usage_events`/`messages` by month, read replica for dashboards, archival |
| Jobs index | Partition by posting month; ANN index on embeddings; TTL close/delete stale jobs |
| PDF | Autoscale on queue depth, hard time/memory limits |
| Multi-region | Single region first; design for a second (India + US) via region-scoped data, honouring residency rules |

**Capacity planning method** (fill the numbers in Phase 0): users → DAU → messages/user/day → inbound events/s at peak (typically evening in IST,
so peak is local and sharp) → agent steps per message → LLM calls/s and tokens/s → compare to provider limits and budget. Load-test to 3× projected peak before launch.

### 10.2 SLOs

- Webhook ack p99 < 1 s; plain reply (no agent work) p95 < 3 s.
- Shortlist p95 < 30 s; tailored resume p95 < 90 s; with progress messages ("working on it…") so chat never looks dead.
- Message loss = 0 (at-least-once + idempotent processing); duplicate user-visible messages < 0.1 %.
- API availability 99.9 %.

### 10.3 Observability and runbooks

Traces across webhook → queue → agent → tool → send; metrics for queue depth/age, LLM latency/error/cost, WhatsApp send failures and quality rating,
template approval status, PDF failures, conversion funnel per gate. Alerts with runbooks for: WhatsApp token expiry/quality drop, provider outage, queue backlog,
cost spike, verifier failure rate, billing webhook failures. Feature flags and staged rollouts; instant rollback.

### 10.4 Quality and evals

- **Golden sets**: 100+ resume/job pairs with expected properties: resume truthfulness (zero fabrications), one page, keyword coverage, gap honesty; shortlist relevance (precision@8); draft length/specificity rules.
- **Regression evals** on every prompt/model change, gating deploys. Human review sample of live outputs weekly.
- **Fabrication = Sev-1**: any confirmed invented fact triggers incident review.
- Product metrics: gate approval rates, edit rates per agent, time to first shortlist, resumes approved per week, outreach sent, reply rate (self-reported), checkout conversion, churn, refunds.

---

## 11. Delivery roadmap

Assumes a small team (2 full-stack, 1 backend/infra, 1 designer/PM part time). Durations are estimates, **adjust once the team is known**.

### Phase 0: Foundations and compliance (weeks 0–3, run in parallel from day 1)
- Start **Meta Business Verification**, create the WABA, register the number, submit templates (approval takes time; this is the schedule risk).
- Decide D1–D7. Legal review kickoff (privacy policy, terms, DPDP/GDPR, data-source terms).
- Repo, CI/CD, environments (dev/staging/prod), Terraform, secrets, observability skeleton.
- Schema + RLS + cross-tenant test harness. Channel Adapter interface and **local WhatsApp and Discord simulators** so development isn't blocked on approvals.
- Capacity model v0; cost instrumentation (`usage_events`) from the first line of code.
- **Provider selection (§5.1):** compare and shortlist the paid job-search, contact-lookup and web-search providers (price, quotas, commercial-use terms, uptime). Free tiers are used only for development.
- Create the Discord application and decide the bot-verification timeline.

### Phase 1: Single-user vertical slice on WhatsApp and Discord (weeks 3–9)
- Webhook receiver, dedupe, signature verification, outbound sender, window tracking, opt-in/STOP.
- Discord adapter: signed interactions endpoint, slash commands, threads per job, select menus and buttons, private-space check, DM-mode fallback, OAuth account linking.
- Onboarding (resume upload → structured resume + preferences → confirmation).
- Scout on live APIs (still no index): shortlist list message, `go` selection, `check_posting`, pipeline records.
- Researcher + people list + gate 2; Resume Tailor + verifier + render service + gate 3; Email and LinkedIn drafts + tracker + gate 4.
- Exit: internal dogfood of the whole pipeline on real WhatsApp numbers; fabrication eval at zero on the golden set.

### Phase 2: Full feature parity + proactive layer (weeks 9–14)
- Follow-ups (scheduler, rules, template nudges), Interview Prep incl. mock interviews, job-status tracking.
- Shared job index + ingestion + matching with numeric score; daily digest template flow.
- Web companion (dashboard, tracker, resume edit, preferences).
- Exit: all of F1–F17 shipped; closed beta of 50–100 users.

### Phase 3: Premium subscriptions (weeks 11–16, overlaps)
- Plans, entitlements, metering, Razorpay integration, upgrade prompts in chat, dunning, invoices, admin console (plans, usage, refunds, support view that's read-only and audited).
- Exit: paying beta; margin per plan measured against §8.3.

### Phase 4: Scale and hardening (weeks 16–22)
- Load tests to 3× target; autoscaling policies; DB partitioning and replicas; provider failover/degraded modes; pen-test; backup/restore drill; incident runbooks; WhatsApp tier-upgrade plan and multi-number readiness.
- Optional: Gmail draft integration (start Google verification early), more ATS adapters, second country.

### Phase 5: Public launch (weeks 22–26)
- Staged invites matched to WhatsApp messaging tier, status page, support playbook, marketing site, referral loop.
- Post-launch: weekly eval/cost/quality review; roadmap from gate-edit data.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| WhatsApp verification/template delays or rejections | Launch slip | Start week 1; simulator for dev; plain, utility-style template wording; fallback channel (web chat/Telegram) behind the adapter |
| Messaging limits / quality rating drop | Can't onboard or notify | Staged invites, opt-in only, frequency caps, quick-reply opt-down, monitor rating |
| WhatsApp per-message costs erode margin | Unit economics | Minimise templates, lean on user-initiated windows, cap by plan, pricing tied to measured cost |
| LLM cost/latency spikes or provider outage | Cost, UX | Caching, model router, budgets, circuit breakers, degraded mode |
| Fabricated resume content | Trust, legal | Structured source-linked output + verifier + evals; Sev-1 policy |
| Job data ToS/legal (scraping, resale) | Takedown | Official APIs/ATS public endpoints only; never LinkedIn/Indeed/Naukri; legal review |
| Contact data privacy (lookups) | Regulatory | Minimal storage, source shown, deletion on request, Hunter terms review |
| Prompt injection via job posts/resumes | Data exposure | Least-privilege tools, tenant context from server, output scanning |
| Spam/abuse (outreach at volume) | Sender reputation, WABA | User-sent only, per-user caps, abuse detection |
| Google OAuth verification delay | Gmail feature slip | Optional, Phase 4, compose-link fallback |
| Single-region latency/residency | Perf, compliance | Region-aware design, second region later |
| Discord bot verification and privileged-intent approval at 100 servers | Growth blocked | Apply early; design on interactions so Message Content is optional; DM mode as fallback |
| Another person joins a user's Discord server | Résumé and contact leak | Private-space check; stop posting sensitive content; warn the user |
| Free-tier keys left in production by mistake | Outages, ToS breach | Config check that fails the deploy if a production source uses a free-tier key; provider contracts in Phase 0 |
| Two channels double the surface to test and support | Slower delivery, bugs | One engine and one message model; simulators in CI; same state-machine tests run against both adapters |

---

## 13. Immediate next steps

1. Answer D1–D7 (market, payments, Gmail, number strategy, web scope, free tier).
2. Create the Meta Business account and begin verification; choose a phone number that is not used on any WhatsApp account. Create the Discord application in the developer portal and enable HTTP interactions.
3. Pick the repo layout (suggested monorepo: `apps/web`, `apps/api`, `apps/worker`, `packages/{agents,tools,channel,db,billing}`).
4. Build the Phase 0 skeleton and the WhatsApp simulator.
5. Assemble the golden evaluation set (10–20 real, consented resumes and 100 jobs) before writing the final agent prompts.
6. Re-open the video and paste the transcript if you want me to diff it against this plan: the transcript was not retrievable, so anything shown only on screen (Switch Rooms setup, Discord bot configuration) is not reflected here and is replaced by this design anyway.
