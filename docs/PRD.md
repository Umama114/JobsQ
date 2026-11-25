# JobsQ — V1 Product Requirements Doc (PRD)

> **What is built today** is in [CURRENT_BUILD.md](CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

**Status: DRAFT v0.4 (updated 2026-11-25)** — not approved. Items marked **[TBD]** are listed in section 10 and must be settled before sign-off.

Template: TrunkQ Product & Engineering Framework, C1. Next documents after approval: Engineering Requirements (C1A), System Design (C7), Data Model (C8), one Agent Spec (D1) and Eval Plan (D3) per agent, then the Orchestrator Task Plan (C9).

---

## 1. Feature name & product

**Product:** JobsQ (a TrunkQ product).
**Feature:** JobsQ V1 — a paid-only job-hunting service where a team of six AI agents works for the user in the web app and in the chat channel the user picks, WhatsApp or Discord. A mobile app is planned.

Reference for agent behaviour: the open-source project [piyush-eon/multi-agent-ai-job-hunter](https://github.com/piyush-eon/multi-agent-ai-job-hunter) and its notes. That project is a single-user prototype that runs on one person's computer. JobsQ keeps what its agents do and rebuilds everything else as a multi-user subscription product.

## 2. Owner & date

| | |
|---|---|
| PRD owner | Abdul Muqtadir (CTO) — **[TBD: confirm]** |
| Build team | Abdul Ahad and Zuhair (both working with Claude Code) |
| Approvers | Abdul Muqtadir (scope, tech stack, AI vendor); Abdul Kabeer (CEO: pricing and product greenlight) |
| Drafted | 2026-11-16 |
| Version | Draft v0.4 |

## 3. Problem

An experienced tech professional looking for a job repeats the same manual work for every role:

1. Searching several job sites and filtering out roles that don't fit.
2. Reading up on each company and finding someone inside who could refer them.
3. Rewriting their resume for each role.
4. Writing a referral email and a LinkedIn note for each contact, then remembering to follow up.
5. Preparing for the interview from scattered sources.

This takes hours per application, so people either apply to few roles well or to many roles badly. The reference project shows that six AI agents can do the drafting while the person keeps every decision, but it only works for one technical user on their own machine, with free API keys and a hand-built Discord server.

**Evidence: [TBD].** The product owner will supply it (user interviews or similar). Until then the problem statement is an assumption taken from the reference project, and this PRD stays a draft.

## 4. Goal & success metric

**Goal:** A paying user can go from "find me jobs" to a tailored resume and ready-to-send referral messages for a chosen job, in the web app or in the chosen chat channel (WhatsApp or Discord), without the agents ever inventing a fact or sending anything on the user's behalf.

| Metric | Target |
|---|---|
| **Primary: monthly recurring revenue (MRR)** | **[TBD: amount and date]** |
| Supporting: tailored applications completed per paying user per week | [TBD after pilot] |
| Supporting: refund rate in the first 7 days | [TBD] |
| Quality: invented facts in resumes or drafts | 0 (any confirmed case is a top-severity incident) |

Scale target at launch: **about 100 users**, and the system must be **production ready for 100 to 1,000 users at once** (section 9a). **India first; the product scales globally later** (decided 18 Nov 2026). The 12-month figure (10,000 was only an assumption) is open.

## 5. User stories

**Target user:** an experienced professional in a tech role (for example software, data, DevOps, QA or product engineering). Freshers and interns are not the V1 audience.

### Account and subscription
- As a visitor, I want to register with my name, phone number, email and a password, and nothing more, so that sign-up is short and simple.
- As a new user, I want to upload my resume, see a form filled in from it, correct it and save it before I pay, so that I never upload it twice.
- As a new user, I want to give my job preferences once so that the agents know what to look for. *(How and when this is collected is open; it is not part of registration.)*
- As a registered user, I want to see the two plans and pay so that I can start using JobsQ. **JobsQ AI** includes the AI. **Your own AI** is cheaper and runs the agents on my own Claude Code or Codex subscription.
- As a user on Your own AI, I want to connect the JobsQ Connector on my computer, see whether it is running, and replace its key.
- As a user who hasn't paid or whose plan has lapsed, I want to still log in and reach the plans, billing and data screens (export, and a way to request deletion) so that I can pay, renew or leave.
- As a subscriber, I want to see my plan, usage against my limits, invoices and renewal date so that there are no surprises.
- As a subscriber, I want to cancel or change my plan myself.

### Connecting a channel
- As a subscriber, I want to choose WhatsApp or Discord once and connect it from the app, so that I can use the agents where I already chat. There is no switching afterwards.
- As a subscriber, I want to do everything the chat channel does in the web app too (shortlists, approvals, drafts, tracker), so that I can use JobsQ without opening a chat app.
- As a subscriber, I want the web app and my chat to show the **same history**, so that a follow-up, an approval or a draft is the same in both and I never answer the same thing twice.
- As a subscriber, I want the same on a mobile app later.

### The agents
- As a subscriber, I want **Scout** to give me a short list of up to 10 open jobs, as recent as possible, that match my preferences, each with a reason it fits, so that I can pick which to pursue.
- As a subscriber, I want to paste a job link or job text myself so that I can use the agents on a job I found elsewhere.
- As a subscriber, after I apply, I want **Researcher** to summarise the company and find people who could refer me, starting with people I already know (my LinkedIn connections file).
- As a subscriber, as soon as I pick a job I want **Resume Tailor** to produce a one-page resume for it, as **PDF** (Word is planned), tell me what it changed and which requirements I don't meet, and let me ask for changes.
- As a subscriber, I want the **Email** agent to draft a short referral email per approved contact, sent to me **in the chat with a copy button** (and in the web app), so that I copy it, paste it into my own email and send it myself.
- As a subscriber, I want the **LinkedIn** agent to draft a connection note and a follow-up message per contact, with a copy button, so that I can paste and send them myself.
- As a subscriber, I want JobsQ to ask me, with buttons, whether I applied and whether I got a reply, so that my tracker stays accurate without effort.
- As a subscriber, once a company replies, I want **Interview Prep** to give me the likely interview process, topics, questions and a study plan.

### Dashboard
- As a subscriber, I want a web dashboard showing every job I'm pursuing, its stage, my contacts and my drafts so that I have one place to see everything.
- As a subscriber, I want to edit my preferences, upload a newer resume, and download my tailored resumes from the dashboard.

### Administration
- As support staff, I want to find a user and see their subscription, payment status and usage so that I can answer their questions.
- As support staff, I want to suspend and unsuspend an account with a recorded reason.
- As a super admin, I want to cancel or extend a subscription and issue a refund.
- As a super admin, I want to limit how many jobs a user may apply to per day and how many jobs they may have active at once (applied, replied or at interview), and later set the other limits too.
- As a super admin, I want to switch any agent off for all users immediately if it misbehaves.
- As the company, I want every admin action recorded so that access can be audited.

## 6. Scope

**How the 8-week cycle works:** the time is fixed and the scope flexes. Everything under "Must have" ships in the cycle. Once the must-haves are done, the team pulls in "Stretch" items in the order listed, as many as fit before the cycle ends. A stretch item is only started if it can be finished and tested inside the cycle; whatever is left moves to the next cycle.

### Must have (V1, one 8-week cycle, fixed time)
1. Registration and login: the resume is uploaded on the sign-up screen and fills in name, phone number and email; the user adds a password. One account per email and per phone number. Passwords are stored (hashed). Reset by email. Whether Google sign-in is also offered is open. **The user's LinkedIn ID is an open question (question 32), not part of registration.**
2. Resume: PDF or Word, read with pdfplumber and python-docx with **no AI call** into the sign-up form the user can correct, then **saved with the account, before payment** (scanned files are refused in V1). Job preferences are not collected at registration.
3. Paywall: plans screen and checkout. Two plans, monthly billing: **JobsQ AI** (JobsQ pays for the AI) and **Your own AI** (cheaper: the user's own Claude Code or Codex subscription, through the JobsQ Connector on their computer). Prices, currency and payment provider are open.
4. Access control: unpaid, lapsed and suspended users can log in but reach only plans, billing, and data export and the deletion request.
5. Chat channel: WhatsApp can be connected only with an active plan and is optional; the web app works on its own. The plan to also offer Discord, with one choice and no switching, is unchanged but not built.
6. **The web app does everything the chat channel does**: shortlists, approvals, drafts, tracker and prompts. The web app is a third way into the same engine, not a separate product. If the chat channel is blocked or unreachable, the user carries on in the web app and reconnects the same channel.
6a. **One shared history.** The web app and the chosen chat channel show the same history for the user. Prompts, follow-ups and approvals appear in both; the first answer wins; late answers get "already done" (section 7.5).
7. Resume reading: when the plan starts, the AI reads the saved resume into a profile (Intake). A newer resume can be uploaded later.
8. Agents: Scout, Resume Tailor, Researcher, Email, LinkedIn and Interview Prep. The order is: pick a job → tailored resume → the user applies → referrals → messages → the company replies → interview prep. The user sends and applies personally.
9. Tracker: per contact drafted / sent / replied; per job applied / replied / interviewing / rejected / offer. Timed prompts: two hours after the resume is approved, "Did you apply?" with Yes / Not yet / No; four days after the user confirms applying, "Did you get a reply?" with a "Not shortlisted" button (see 7.3).
10. Usage limits: **a daily limit on applications (5 or 10 per day; value open and a crucial cost decision, together with the AI model)** and a limit on active jobs (value open). Both are set by the super admin, per user, and shown to the user with a clear message when reached.
11. Web dashboard: jobs and stages, contacts, drafts, resume downloads, preferences, plan and usage.
12. Admin console (basic): two roles.
    - **Support:** search users; view subscription, payment status and usage; suspend / unsuspend with a reason.
    - **Super admin:** all of the above, plus cancel, extend, refund, switch an agent off globally, **set the daily application limit and the active-jobs limit per user, and set the other limits (including Interview Prep, open).**
    - Audit log of every admin action.
13. Self-service data export. **No self-service delete button in V1 (decided 18 Nov 2026); it will be added later.** On request the user's data is erased by a written procedure run by the super admin (proposed, question 31), **except** the activity log and the payment invoices and receipts, which are kept and linked by user ID (decided 18 Nov 2026; section 8, Admin). **Legal basis, to be confirmed by Abdul Muqtadir (CTO):** the Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023), sections 8(7) and 12; the Digital Personal Data Protection Rules, 2025 (notified by MeitY on 13 Nov 2025), rule 8; and, for invoices and receipts, the Central Goods and Services Tax Act, 2017, section 36, with rule 56 of the CGST Rules, 2017. Texts and links: [RECOMMENDATIONS §7.1](archive/RECOMMENDATIONS_2026-11-18.md#71-legal-references-where-anyone-can-find-them).
14. English only.
15. Launch market: India first; global scaling later (nothing global is built in V1).
16. **Production readiness** for 100 to 1,000 users at once: targets and tests in section 9a.
17. **Timed prompts are Must** (item 9). Their limits are open (question 26).

### Stretch (same cycle if time allows, in this order; otherwise next cycle)
1. Mock interview (one question at a time).
2. Follow-up drafts to contacts. (The timed prompts to the user in Must item 9 are part of the tracker and are **Must**, decided 18 Nov 2026; only their limits are open.)
3. Daily digest of new matching jobs.
4. Yearly billing.
5. Discord "own private server" mode with a real thread per job.
6. **Mobile app** (planned; the API is built so it can be added; platform and date open).

### Not doing in V1
- A free plan or free trial.
- Sending emails, LinkedIn messages or job applications for the user.
- Opening, scraping or logging in to LinkedIn, Indeed or Naukri.
- Using both chat channels at the same time, or switching channel.
- A self-service delete button (later; erasure on request is handled by a procedure, see Must item 13).
- A resume builder for users who have no resume.
- Gmail account connection (drafts created inside the user's mailbox).
- Languages other than English; freshers and non-tech roles as a target audience.
- Mobile apps in the first cycle (planned afterwards).

## 7. User flow & designs

**Designs:** no Figma file yet **[TBD: design]**. Behaviour reference: the [reference repository](https://github.com/piyush-eon/multi-agent-ai-job-hunter). Screens are described in words below.

### 7.1 Sign-up to first use

```
Landing page
  → Register: upload resume, the form fills itself in (no AI), correct it, add a password
  → Confirm email
  → Choose plan (JobsQ AI, or Your own AI) → Checkout
  → Your own AI only: connect the JobsQ Connector
  → Optional: connect WhatsApp (needs the active plan)
  → "Find me jobs" → Scout shortlist (uses the saved resume)
```

### 7.2 Account states

| State | Can log in | Sees | Agents |
|---|---|---|---|
| Registered, not paid | Yes | Resume, plans, checkout | Off |
| Active | Yes | Full app | On |
| Payment failed (grace period, length **[TBD]**) | Yes | Full app with a "fix payment" banner | On |
| Lapsed / cancelled | Yes | Plans, billing, export; past jobs read-only | Off |
| Suspended by admin | Yes | A suspension notice, billing, export | Off |

When agents are off, a message sent in chat gets one short reply saying why and linking to the web app.

### 7.3 Working a job (the same in WhatsApp, Discord and the web app)

1. **Shortlist.** Scout posts the best jobs for the user: company, role, location, salary if listed, link, a fit score and why it fits. The user picks a job.
2. **Resume.** Resume Tailor produces a one-page resume for it, with what changed and the gaps. The user can ask for changes.
3. **Apply.** The user applies on the company's site and presses **I've applied**.
4. **Referrals.** Researcher lists the people the user already knows there, then others found on the web, with a company summary.
5. **Outreach.** Email and LinkedIn drafts for those people, with a copy button. **The user sends.**
6. **Reply.** When the company replies or shortlists the user, they press **I got a reply** and Interview Prep starts.

Timed prompts ("Did you apply?", "Did you get a reply?") are planned, not built.

Every message about a job starts with "Company – Role" so jobs don't get mixed up. On WhatsApp and in Discord direct messages there are no threads, so each job also gets a short code (for example J7) and buttons that carry the job with them.

### 7.4 Channel screens in the web app
- **Choose:** two options (WhatsApp, Discord). The user picks one, once. WhatsApp verifies the phone number; Discord asks the user to authorise with their Discord account. Both end with a "say hi" step that opens the chat. There is no switching afterwards.
- **Connected:** shows the channel and its status. If it stops working, the web app offers to reconnect it.
- **Web workspace:** the same shortlist, approvals, drafts, tracker and prompts as the chat channel, in the web app.

### 7.5 One history for the web app and the chat

The web app and the chosen chat channel are two windows onto **one timeline per user**. Every message, card (shortlist, approval, draft, prompt) and answer is one record with the place it came from. A prompt or follow-up is created once and shown in the web app always, and in the chat when the channel allows it (for WhatsApp, inside the 24-hour window or with an approved template).

- **First answer wins.** An answer from either place is recorded once and the other place updates. A later tap on an old button gets "already done" with the current state.
- **Old buttons** carry the item's version; if the draft was replaced the user is told and shown the new one.
- **One prompt message per user per day**, the most urgent first; the same list in both places.
- **If the chat channel is closed** (STOP, blocked, reconnecting) the web app carries on; after reconnecting, the chat gets a short summary, not a replay.
- Full edge-case table: [RECOMMENDATIONS §5](archive/RECOMMENDATIONS_2026-11-18.md#5-same-history-on-the-web-and-in-the-chat).

## 8. Edge cases & error states

**Registration and payment**
- Payment fails or is abandoned at checkout: user stays "registered, not paid"; details are kept.
- Payment succeeds but confirmation arrives late: show "confirming payment", unlock automatically, never charge twice.
- Same email or phone number registers twice: refuse and point to login or password reset.
- Forgotten password: reset by an emailed link. Repeated wrong passwords: temporary lock and a notice by email.
- Renewal fails: grace period, reminders by email and in chat, then lapsed.
- Refund in the guarantee window **[TBD]**: access ends when the refund is issued.
- Your own AI: the connector is off or the user's subscription is out of usage: the step stops with a message saying so. JobsQ never runs a Your-own-AI user's work on JobsQ's AI.
- Suspension during an agent run: the run stops; nothing further is posted except the notice.

**Channels**
- Phone number or Discord account already linked to another JobsQ account: refuse and explain.
- User messages the bot before registering or paying: one reply with the sign-up link; no agent work.
- WhatsApp only allows free-form messages within 24 hours of the user's last message. A result that is ready after that window is announced with a pre-approved notification message; the full result is sent when the user replies.
- User blocks the bot, deletes the chat, or sends "STOP": stop all messages; show "channel disconnected" in the web app and offer to reconnect the same channel.
- User tries to connect the other channel after choosing one: refuse and explain there is no switching.
- The chat channel is blocked or down while a job waits: the approval stays available in the web app.
- The same approval tapped twice, or an old button tapped later: acts once; the second tap gets "already done".
- An approval or prompt answered in the web app while the chat message is still on the phone (or the other way round): the first answer counts; the late tap gets "already answered at 10:02 from the web app". A prompt due while the WhatsApp window is closed is shown in the web app at once; whether a paid template message also goes to the chat is open (question 33).
- The user copies an outreach draft and the platform has no real copy button (WhatsApp, Discord): the draft is sent as its own text-only message and can be sent again alone with one button.

**Resume and profile**
- File is not a resume, is unreadable, is password-protected or is a scanned image: say so and ask again.
- The file is not a PDF or Word file, or is over the size limit (limit open; it may depend on the user's experience): refuse with the specific reason.
- Reading before payment is text extraction only (no AI call), so it costs no model money. Uploads are still rate-limited.
- The user registers, uploads a resume and never pays: the account stays, and its data (including the resume) is erased after **30 days** (the product owner's value, 18 Nov 2026; to be confirmed by Abdul Muqtadir).
- Resume longer than the tailored output can keep: the Tailor cuts, and lists what it cut.
- User uploads a newer resume later (dashboard or chat): confirmed the same way, used for new jobs; jobs already under way keep their version.

**Agents**
- Scout finds fewer than 5 good matches: show what it found and suggest widening preferences. Finds none: say so plainly.
- User pastes a LinkedIn, Indeed or Naukri link: the agent does not open it and asks for the job text to be pasted.
- Job has closed since it was shortlisted: tell the user before doing any further work on it.
- Researcher can't find suitable people or a confirmed email: say "not confirmed" or "none found"; never guess a name or address.
- Resume won't fit one page: trim and retry; if it still won't fit, tell the user what to cut.
- Tailored resume fails the truthfulness check: regenerate; never show the failed version.
- The AI provider or a job source is slow or down: "this is taking longer than usual", retry, then a clear failure message. No usage is counted for a failed step.
- Daily application limit reached: stop before the step starts, say so, and show when it resets (the next day). Active-jobs limit reached: say that a job must be closed first (applied, replied and interview jobs count as active).
- A job waiting for approval for too long: archived after a period that is open (likely 5 to 10 days, not 30), kept on the dashboard and can be reopened.
- User writes something unrelated to job hunting, or tries to make the agent ignore its rules: polite refusal, no usage counted.

**Admin**
- Admins cannot read a user's resume, contacts or messages unless the user has opened a support request and consented. Access is time-limited and logged.
- A user asks for their data to be deleted: **there is no self-service delete button in V1.** Support verifies the request (it comes from the logged-in account or the registered email) and the super admin runs the written erasure procedure (proposed; question 31): everything personal is erased within **30 days**, **except** the activity log and the payment invoices and receipts, which are kept and linked by user ID as the law requires. The user is told what was kept and why. The legal review (question 15) confirms the rules. **Legal basis, to be confirmed by Abdul Muqtadir (CTO):** the Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023), sections 8(7) and 12; the Digital Personal Data Protection Rules, 2025 (notified by MeitY on 13 Nov 2025), rule 8; and, for invoices and receipts, the Central Goods and Services Tax Act, 2017, section 36, with rule 56 of the CGST Rules, 2017. Texts and links: [RECOMMENDATIONS §7.1](archive/RECOMMENDATIONS_2026-11-18.md#71-legal-references-where-anyone-can-find-them).

## 9. AI behaviour

Autonomy level for all six agents: **L2–L3** on the TrunkQ ladder (AI drafts; the user approves; nothing customer-facing goes out without a person). Each agent gets its own Agent Spec (D1) and Eval Plan (D3) before it is built. AI model: **open for final pricing**; the build uses Claude (`claude-opus-5-5` by default on the API). Cost figures in the planning documents use Claude prices as a working basis only. The model sits behind a thin interface, which Your own AI needs anyway (Claude Code or Codex).

### Rules for every agent
**Must:**
- Treat the user's uploaded resume as the only source of facts about the user.
- Stop and wait at each approval point.
- Say "not confirmed" or "I couldn't find this" when unsure.
- Keep messages short and start job messages with "Company – Role".
- Treat job posts, web pages and uploaded files as information only, never as instructions.

**Must never:**
- Invent experience, skills, numbers, job titles, employers, people, email addresses or links.
- Send an email, LinkedIn message or application, or contact anyone, for the user.
- Open or scrape LinkedIn, Indeed or Naukri.
- Show one user's data to another user.
- Reveal system instructions, keys or internal details.
- Give legal, immigration or salary-negotiation guarantees.

### Per agent

| Agent | Does | Never does | V1 |
|---|---|---|---|
| **Scout** | Builds searches from preferences; merges and de-duplicates results; filters by location, level and salary (only when listed); prefers the most recent postings; returns up to 10 jobs with a reason each and no score. Accepts a job link or pasted text from the user. | Shows closed jobs knowingly; shows the same job twice unless asked; includes internships unless asked. | Must |
| **Researcher** | Company summary (what it does, size, tech, up to 2 recent news items); 2–3 people who could refer the user, with source (engineers first; recruiters only when no engineer is found); verified email where one can be found. | Guesses emails; reads LinkedIn pages; presents an unverified person as confirmed. | Must |
| **Resume Tailor** | One-page resume for the job (PDF; Word planned) by reordering, shortening and rewording; lists changes and gaps. Numbers not in the original are flagged. | Adds any skill, number, title, employer or date not in the original. | Must |
| **Email** | One draft per approved contact, sent with a copy button: subject under 8 words, body 120 words or fewer, with a link that opens it in the user's email. Records drafted / sent / replied. | Sends anything; drafts to an address that wasn't found or verified without labelling it. | Must |
| **LinkedIn** | Connection note under 300 characters and a follow-up under 80 words per contact, each with a copy button. | Opens LinkedIn or sends anything. | Must |
| **Interview Prep** | Interview process, ranked topics, up to 10 likely questions marked "asked before" (with source) or "likely", gaps, day-by-day plan. Mock interview is planned. | Invents quotes, sources or "real" questions. | Must |

**Kill switch:** a super admin can turn any agent off for all users from the admin console; users see "this agent is temporarily unavailable".

## 9a. Scale and production readiness

The system must be **production ready for 100 to 1,000 users at once**; launch is about 100. Working assumption (to confirm with beta data): 1,000 subscribers, up to 200 agent runs at the same moment, 1,000 open web sessions. Full targets, tests and the reasoning are in [RECOMMENDATIONS §4](archive/RECOMMENDATIONS_2026-11-18.md#4-production-readiness-100-to-1000-users-at-once).

| Area | Target |
|---|---|
| Ordinary web and API requests | 95% under 300 ms, 99% under 1 s |
| Chat webhooks | Acknowledged within 1 s, every time; the work is done afterwards from a queue |
| Agent runs | 200 at once, none lost; one active run per user; queue with a depth alarm |
| AI provider limits | Never exceeded: a rate gate in front of every model call, retries with waiting, a higher limit tier requested before launch |
| Availability | 99.5% a month at launch; no single point of failure for the API, workers or database |
| Overload | Degrade, do not fall over: runs wait in the queue and users are told "queued"; the web app and tracker keep working |
| Cost safety | Daily limit per user, per-user cost ceiling, global spend alarm, kill switch |
| Before launch | Load test (1,000 sessions, 200 runs, model stand-in), a short real run at planned peak, and failure drills |
| Growth | India first; a country field, currency and tax per country, translatable text, and room to add a hosting region are designed in, nothing global is built in V1 |

## 10. Open questions

Answers given by the product owner on 18 Nov 2026 are recorded as decisions in [DECISIONS_2026-11-18.md](archive/DECISIONS_2026-11-18.md). Everything below is still open.

| # | Question | Decided by |
|---|---|---|
| 1 | Whether and when a market after India follows (India first is decided) | CEO |
| 2 | **Payment provider** (open; Razorpay is only one candidate) | CTO / CEO |
| 3 | **Prices** for JobsQ AI and Your own AI, and the **currency** (open). Decided together with questions 4 and 13 | CEO |
| 4 | **Limits: a crucial cost decision.** The daily application limit (5 or 10 per day is the plan; the value per plan is open and is decided together with the AI model, question 13, because of cost), the active-jobs limit (how many applications in process per user), and the other limits. The super admin can change them per user | CEO with CTO |
| 5 | 7-day money-back guarantee: offer it or not, and how it works for Your own AI | CEO |
| 6 | MRR target and date | CEO |
| 7 | Scale: about 100 users at launch is stated. The 12-month target is open | CEO / CTO |
| 8 | Problem evidence: interviews or other proof to add to section 3 | Product owner |
| 9 | PRD owner: confirm Abdul Muqtadir | CEO |
| 10 | **Preferences and details**: not collected at registration. How and when are they collected (chat, web form, or a mix), and what is the full list of fields? | Product owner |
| 11 | Grace period length after a failed renewal | CEO |
| 12 | **Designs**: who produces the screens and by when (likely Abdul Ahad; to be confirmed) | CEO (design) |
| 13 | **AI model** per agent (**a crucial cost decision**, decided together with the daily limit, question 4): decided later, when the cost is reviewed. Your own AI accepts Claude Code and Codex. Job-search and contact-lookup providers and their terms are also open | CTO |
| 14 | **Legal entity**: decided later. WhatsApp business verification needs it; the closed beta can run on a test or unverified number | CEO / CTO |
| 15 | **To be confirmed by Abdul Muqtadir (law references in [RECOMMENDATIONS §7.1](archive/RECOMMENDATIONS_2026-11-18.md#71-legal-references-where-anyone-can-find-them))**. Legal review: privacy policy, terms, refund policy, data-protection rules for India, including confirming what must be kept (activity log, invoices and receipts, linked by user ID; the retention periods) and what must be erased on request (everything else), and storing passwords, phone numbers, resumes and uploaded LinkedIn connections. The first checks are in [RECOMMENDATIONS §7](archive/RECOMMENDATIONS_2026-11-18.md#7-data-protection-what-we-must-keep-and-what-must-be-deleted-on-request) | CEO |
| 16 | Who holds the Support and Super admin roles | CEO |
| 17 | **WhatsApp risk.** Meta's terms (section 4.7) prohibit products where AI is the primary functionality, at Meta's sole discretion. On 17 and 18 Nov 2026 Meta's developer assistant and Meta AI in WhatsApp said a fixed, developer-controlled workflow is permitted. These replies are not pre-approval and do not bind Meta. **Because of them, the team accepts the remaining risk and goes ahead with building the WhatsApp connection**, while following Meta's guidelines and designing and presenting JobsQ to give it the best chance of approval. Discord is the other channel option. The CEO and CTO confirm the accepted risk. See [the evidence](evidence/META_AI_IN_WHATSAPP_2026-11-18.md) | CEO / CTO |
| 18 | Can the Discord bot send the first message to a user who has not written to it? A short test in week 1 settles it. See [features/06-discord-channel.md](features/06-discord-channel.md) | CTO |
| 19 | **Decided 18 Nov 2026 (D30): backend Python 3.12 with FastAPI; frontend Next.js (React) with TypeScript.** The reasons: **Python 3.12 with FastAPI** (pdfplumber and python-docx are Python; async fits the long waits on AI and job APIs; typed contract for the web and mobile apps). Mobile (still open, question 30): React Native (Expo) is recommended. ([RECOMMENDATIONS §2–3](archive/RECOMMENDATIONS_2026-11-18.md#2-backend-language-python-312-with-fastapi-recommended)) | CTO to confirm the detail |
| 20 | **Tailoring engine and model**: single call (this plan) or the multi-call design from BenchQ. Needs a head-to-head test | CTO |
| 21 | **Agent owners**: one person per agent, as the framework requires | CTO |
| 22 | **Approval waiting time**: how long a job may wait for the user's approval before it is archived (likely 5 to 10 days, not 30) | Product owner |
| 23 | **Resume**: file size and page limits (may depend on the user's experience); how the user chooses the format of the tailored resume (**PDF and Word are both delivered for now**), and its template (one page) | Product owner |
| 24 | **Answered:** the resume is read in the Python API with no AI call and saved before payment (25 Nov 2026) | CTO |
| 25 | **Your own AI**: written confirmation from Anthropic and OpenAI that the connector may use subscription logins; what the user still pays JobsQ for; Codex still to be tested | CEO / CTO |
| 26 | **Follow-up limits** (the prompts are kept, Must): the 2-day, 4-day and 30-day values are working values and the final limits are open. How often the "did you get a reply" question repeats within the 30 days | Product owner |
| 27 | **Interview Prep rules**: does a mock session count as a prep session, how many questions per session. Open; the super admin can set them | Product owner |
| 28 | **Email and LinkedIn wording**: sign-off and whether a LinkedIn note is offered on request. Not answered yet; the proposal stands (name only, note on request) | Product owner |
| 29 | **Login options**: is Google sign-in offered next to email and password? Is the phone number verified at registration or only when WhatsApp is connected? | Product owner |
| 30 | **Mobile app**: platform (iOS, Android, or both), date, and whether it is a full copy of the web app. Recommendation: React Native (Expo) | CEO / CTO |
| 31 | **Erasure at launch.** Proposed: no self-service button in V1, but a written erasure procedure run by the super admin from day one (verified request, erase everything personal within 30 days, keep the activity log and invoices linked by user ID, confirm by email). The self-service button follows. Erasure time: 30 days. Legal basis: DPDP Act 2023 (Act No. 22 of 2023) ss. 8(7) and 12, DPDP Rules 2025 r. 8, CGST Act 2017 s. 36 ([references](archive/RECOMMENDATIONS_2026-11-18.md#71-legal-references-where-anyone-can-find-them)) | **Abdul Muqtadir to confirm**; CEO |
| 32 | **The user's LinkedIn ID**: collect it or not, when it is asked (not at registration), whether it is required, what it is used for, and how it is erased | Product owner |
| 33 | **Copy button and templates**: confirm in the week-1 test what WhatsApp and Discord really allow for a copy button on free-form drafts. When the WhatsApp 24-hour window is closed, is a prompt also delivered by a paid template message, or only in the web app? | CTO / CEO |
| 34 | **Capacity assumptions**: 1,000 subscribers, 200 agent runs at once and 1,000 web sessions are working numbers; confirm with the first beta and the load test | CTO |
| 35 | **Prompts on both surfaces**: if the user only uses the web app, do chat prompts stop after some quiet period? | Product owner |

## 11. Release plan

| Stage | Who gets it | Exit condition |
|---|---|---|
| 1. Internal | The build team and TrunkQ staff, on test payments | Full flow works on both channels; zero invented facts on the test set |
| 2. Closed paid beta | A small invited group paying the real price **[TBD: size, market]** | Cost per user measured; refund and support process exercised; no top-severity incidents |
| 3. Public launch | Open sign-up in the first market **[TBD]** | — |
| 4. Second market | If a second market is decided (question 1) | — |

Each release follows the Release Checklist (C5), with a person approving every production deploy and database change.

---

## Change log

| Date | Version | Change | By |
|---|---|---|---|
| 2026-11-16 | Draft v0.1 | First draft from planning session | Abdul Ahad (with Claude Code) |
| 2026-11-16 | Draft v0.1 | Added open questions 17 (WhatsApp AI rule) and 18 (Discord first message) after checking the platforms' current rules | Abdul Ahad (with Claude Code) |
| 2026-11-18 | Draft v0.1 | Launch market set to India (question 1); legal entity left for later (question 14); second Meta answer recorded and the team decided to build the WhatsApp connection (question 17) | Abdul Ahad (with Claude Code) |
| 2026-11-18 | Draft v0.2 | Product owner's answers recorded: two channel options and no switching, web app does everything, mobile app planned, passwords stored, short registration, resume read before payment with no AI call, two plans (classic and own AI key), daily application limit, no deletion in V1, tracker prompts, Scout and Researcher rules, India first, about 100 users. Currency, payment provider, model, backend language, preferences and limits left open. Meta reply wording corrected (accepted risk, not approval) | Abdul Ahad (with Claude Code) |
| 2026-11-25 | Draft v0.4 | Plans are now JobsQ AI and Your own AI (Claude Code or Codex through a connector) instead of an AI key; resume saved before payment; order of work changed to resume → apply → referrals → messages → interview; LinkedIn connections for referrals; WhatsApp needs an active plan to connect; Interview Prep built | Abdul Ahad (with Claude Code) |
| 2026-11-18 | Draft v0.3 | Second set of answers recorded: India first with global scaling later; production readiness for 100 to 1,000 users at once (section 9a); one shared history for the web app and the chat with edge cases (7.5); outreach wording with a copy button; tailored resume as PDF and Word; the activity log and invoices kept and the rest erased on request; follow-up prompts kept with limits open; daily limit and AI model marked crucial (cost); the user's LinkedIn ID added as an open question. Backend, frontend and mobile recommendations added (question 19) | Abdul Ahad (with Claude Code) |
| 2026-11-18 | Draft v0.3 | Follow-up: backend Python 3.12 with FastAPI and frontend Next.js with TypeScript decided (question 19); erasure time 30 days and unpaid-account data erased after 30 days (to be confirmed by Abdul Muqtadir); law references added (DPDP Act 2023, Act No. 22 of 2023; DPDP Rules 2025; CGST Act 2017 s. 36) | Abdul Ahad (with Claude Code) |
