# 05 — WhatsApp channel

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Scope | Must have (V1), **subject to Gate 0** in the [WhatsApp approval track](../WHATSAPP_VERIFICATION_PLAN.md#2-gate-0-is-jobsq-allowed-on-whatsapp) |
| PRD | §6 item 5 · §7.3 · §8 Channels |
| Backend | [BACKEND.md](../BACKEND.md) §11, §15.3, §15.6 |
| Depends on | [04-channel-connection.md](04-channel-connection.md), [07-conversation-engine.md](07-conversation-engine.md), Meta approvals |

## 1. Purpose

Deliver the whole JobsQ experience inside a normal one-to-one WhatsApp chat with the JobsQ business number, using Meta's official Cloud API, within Meta's rules and at a predictable cost per user.

## 2. Platform rules we design around

Rows marked "Meta" were read from Meta's pages on 2026-11-16. Rows marked **[verify]** come from memory or third-party guides and must be checked in Meta's documentation during the build.

| Rule | Source | Consequence |
|---|---|---|
| Only the official Business Platform may be used | Meta terms | No unofficial libraries; they get numbers banned |
| Free-form messages may be sent only within 24 hours of the user's last message. After that, only pre-approved templates | Meta | We track the window per user and hold anything that would break it |
| Messages from users are free. Our free-form replies are free for the first 1,000 per business number per month, then charged per delivered message. Utility templates are charged even inside the window. A payment method must be on the account | Meta pricing | Fewer, fuller messages. No "working on it" texts. Cost is measured per user from the first test |
| A new business may message 250 unique users per moving 24 hours **outside** the window; verification or good volume raises it to 2,000, then it scales | Meta | Irrelevant while users always write first; matters for reminders and digests |
| AI Providers are prohibited where AI is the primary functionality, at Meta's discretion | Meta terms §4.7 | Gate 0. Guardrails in section 11 |
| There are no threads | — | Job codes and reply routing (section 3) |
| Reply buttons: up to 3, title up to 20 characters. List: up to 10 rows, row title up to 24 characters, description up to 72. Text body up to 4,096 characters; interactive body up to 1,024; header and footer up to 60; document caption up to 1,024 | **[verify]** | The adapter enforces every limit and splits or shortens |
| Users must opt in, and STOP must be honoured | Meta policy | Opt-in is the connect step; STOP is handled before anything else |
| Webhooks may be repeated or arrive out of order | Meta | De-duplicate on the message id; process each user's events in order |
| Links to received media expire | **[verify]** | Download a received file immediately |

## 3. Keeping jobs separate without threads

Three mechanisms, used together:

1. **Job code and header.** Each job gets a short code (`J7`). Every message about it starts with `📌 J7 · Acme – Backend Engineer`.
2. **Reply routing.** When the user replies to one of our messages (swipe to reply), WhatsApp tells us which message. We stored the job against that message, so "approved" or "make the summary shorter" lands on the right job with no code typed.
3. **Buttons carry the job.** A button's hidden id holds the approval it belongs to. A tap can never act on another job.

If none of these identifies the job and several are open, we ask once with a list: "Which job is this about?"

## 4. Message catalogue

| Moment | Format | Messages |
|---|---|---|
| Welcome | Text with 2 buttons: Find me jobs · How it works | 1 |
| Ask for a new resume file (only when the user says they have a newer one, or has none on file) | Text | 1 |
| Summary of a resume sent in chat, to confirm (the first resume is confirmed on the web at registration) | Text with buttons: Looks right · Fix something | 1 |
| Working on a step | Typing indicator, no message **[verify availability]** | 0 |
| Shortlist | Text listing the jobs, then a list message to pick one by tap. Several can be picked by replying `1,3` | 2 |
| Research and people | Text (company summary), then a message with the people and buttons: Approve · Change · Skip job | 2 |
| Tailored resume | PDF document with a caption, then a message with what changed, gaps and the apply link, with buttons: Approve · Change | 2 |
| Email draft | One text per contact: who, email status, subject, body, "Open in Gmail" link | 1 per contact |
| LinkedIn note | One text per contact containing only the note, so it can be copied whole | 1 per contact |
| After the drafts | "When you've sent them, reply `sent 1,2`" with buttons: Sent all · Not yet | 1 |
| Tracker update, limit reached, error | Text | 1 |

A typical application is about **11 to 13 messages** from us. The LinkedIn follow-up for after a connection is accepted is written up front but sent only when the user says the person accepted, which is when it is useful and saves a message.

### 4.1 Examples

Shortlist text:

```
🔎 Scout · 6 jobs for you

1. Acme – Backend Engineer
   Pune · ₹28–35 LPA
   Go and Postgres match your last two roles
   https://jobsq.example/j/…

2. Globex – Senior Software Engineer
   Remote · salary not listed
   …

Reply with numbers to pick, for example 1,3
```

Resume message:

```
📄 Resume Tailor
📌 J7 · Acme – Backend Engineer

What changed
• Moved the payments work to the top
• Shortened the 2019 internship to one line
• Reordered skills to lead with Go and Postgres

Gaps
• Kafka is asked for; it is not on your resume

Apply: https://jobsq.example/j/…
```
Buttons: `Approve` · `Change`

### 4.2 Every button and list

**Reply buttons** (up to 3 per message, label up to 20 characters **[verify]**). A tap shows the label in the chat as the user's own message.

| Message | Buttons | A tap means |
|---|---|---|
| Welcome | **Find me jobs** · **How it works** | Start Scout with the resume already on file (if there is none, reply with a link to upload one) · show the short guide, the same as typing `help` |
| Resume summary | **Looks right** · **Fix something** | Make this resume active and continue the request that asked for it · ask what is wrong |
| People list | **Approve** · **Change** · **Skip job** | Start the Resume Tailor · ask "What should I change?" and wait for text · drop the job |
| Tailored resume | **Approve** · **Change** | Start the Email and LinkedIn agents · ask "What should I change?" and wait for text |
| After the drafts | **Sent all** · **Not yet** | Mark every email drafted for the job as sent · do nothing, the user will report later |

**List messages** (one button that opens a sheet of up to 10 rows):

| Message | Button | Rows |
|---|---|---|
| Shortlist | **Pick a job** | One per job: "Company – Role", with location and salary below. Several jobs are picked by replying `1,3` |
| "Which job is this about?" | **Choose a job** | The user's open jobs. Shown only when the engine cannot tell which job a message concerns |

**Template buttons** (quick replies on messages sent outside the 24-hour window; tapping one opens a new window):

| Template | Buttons | Scope |
|---|---|---|
| `jobsq_update_ready` | **Show me** | V1, for a result that finished after the window closed |
| `jobsq_followups_due` | **Draft them** · **Later** | Stretch ([13](13-follow-ups.md)) |
| `jobsq_daily_digest` | **Show me** · **Pause** | Stretch ([14](14-daily-digest.md)) |

**Not buttons.** "Open in Gmail" and the apply link are plain links in the message text. Everything else the user does is typed: `go 1,3` · `sent 1,2` · `replied 2` · `accepted 1` · `applied` · `rejected` · `offer` · `jobs` · `J7 status` · `help` · `stop` · `start` ([07 §5](07-conversation-engine.md#5-things-the-user-can-type)).

### 4a. Outreach drafts and the copy button

The LinkedIn message and the email to a referral reach the user **in the chat with a copy button** (decided 18 Nov 2026). WhatsApp's session messages have **no confirmed free-form copy button** (the copy-code button belongs to authentication templates; whether it can be used here must be checked in the week-1 test). Until confirmed, each draft is sent as **its own text-only message** (subject and body as two messages, so each can be selected alone; a long-press selects all of it) with a **"Send as plain text"** quick-reply button that sends it again alone. Each draft is one message, so the cost is one service message more per draft; this is counted in [WHATSAPP_PRICING.md](../WHATSAPP_PRICING.md). The same text with a real Copy button is in the web app.

## 5. The 24-hour window

- Every inbound message sets `window_expires_at` to 24 hours later.
- Before sending free-form content, the sender checks the window. Inside: send. Outside: mark the message `held`.
- For a held result, if the template `jobsq_update_ready` is approved and none was sent to this user in the last 24 hours, send it: "Your tailored resume for Acme – Backend Engineer is ready." with a **Show me** button.
- When the user taps or writes, the window opens and held messages go out in order.
- Held messages are always visible on the web dashboard. They are dropped from the chat queue after 7 days.

In V1 this is rare: users write first and results arrive in minutes. It happens when a parked job resumes later (an agent was switched back on, or a limit reset), and with the stretch features.

## 6. What users send us

| Type | Handling |
|---|---|
| Text | To the conversation engine |
| Button or list reply | The hidden id names the action; no interpretation needed |
| Document (PDF or Word) | Resume intake ([08-resume-and-profile.md](08-resume-and-profile.md)) |
| Image | "I can't read photos of a resume yet. Please send the PDF or Word file." |
| Voice note or audio | "I can't listen to voice notes yet. Please type your message." |
| Video, sticker, location, contact card | One short "I can't use that here" reply |
| Reaction | Ignored |
| STOP / START | Opt-out and opt-in, handled before anything else |

## 7. Sending rules

1. Every job message starts with the header line; every agent message names the agent.
2. One step's messages are sent in order, each after the API has accepted the previous one.
3. Long text is split at paragraph breaks, never mid-sentence.
4. Formatting is limited to what WhatsApp renders: bold, italic, lists.
5. Links go through our short-link domain, so they are short and never contain personal text in the address.
6. Anything meant to be copied (a LinkedIn note) is sent alone in its own message.
7. A step sends no more than its row in section 4 allows.

## 8. Delivery statuses and errors

Meta reports `sent`, `delivered`, `read` and `failed` for each message; all update the message record. Error codes below are to be confirmed against Meta's error reference **[verify]**.

| Signal | Meaning | Action |
|---|---|---|
| Failed: outside the window | More than 24 hours since the user wrote | Mark `held`; template path in section 5 |
| Failed: undeliverable | Number not on WhatsApp, blocked us, or app too old | Count the failure; after repeats mark the link `unreachable` |
| Rate or throughput limit | Sending too fast | Back off and retry |
| Spam or policy flag | Meta is restricting the number | Slow down, raise a high-priority alert |
| Token invalid | Access token problem | Alert; sends pause |

## 9. Opt-in and opt-out

- **Opt-in** is the connect step: the user sends us a message from their own WhatsApp after reading, on the Connect screen, that JobsQ will reply there. A `consents` row records it.
- **STOP** (also "unsubscribe") sets the link to `opted_out`. One confirmation is sent. Nothing else is sent until START or a reconnect.
- Stretch reminders and digests each carry a one-tap **Pause** or **Later** button.

## 10. Cost control

| Lever | Effect |
|---|---|
| Typing indicator, not a progress text | Removes a charged message from every step |
| Fuller messages (the catalogue in section 4) | Roughly halves the message count compared with the reference project's chat style |
| LinkedIn follow-up sent on demand | One message saved per contact |
| Billing notices by email | No template charges |
| One template per user per 24 hours | Caps the most expensive message type |
| `cost_events` row per delivered message | Cost per user is known from the first internal test |

## 11. Policy guardrails

These keep the WhatsApp experience a job-application service and not an open assistant (see Gate 0):

1. The agents handle job search for the user's own account and nothing else. Off-topic requests get a fixed, polite refusal with no model output.
2. Every exchange is tied to a job step or the user's profile.
3. The WhatsApp business profile describes a job-application service and links to the website.
4. Subscription, payment and account management happen only on the website.
5. WhatsApp conversation content is never used to train a model.
6. `channel.whatsapp.enabled` is a flag: if Meta objects, the channel can be turned off at once and users are told by email and in the web app to use the web app and, if they wish, to move to Discord (an exception to the "no switching" rule, handled by support).

## 12. Number health

An hourly job reads the number's quality rating, messaging limit and template statuses, stores them, and alerts on any drop or rejection. The admin overview shows the current values.

## 13. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| WA-01 | verify the signature of every webhook on the raw body | Must | A tampered body is rejected with 401 |
| WA-02 | acknowledge webhooks in under one second and process later | Must | 99th percentile under 1 second in the load test |
| WA-03 | ignore a repeated webhook | Must | The same message id three times produces one event |
| WA-04 | track the 24-hour window per user and never send free-form content outside it | Must | A test with an expired window results in `held`, not an API error |
| WA-05 | announce a held result with an approved template, at most once per user per 24 hours | Should | Template sent once; held content follows the user's reply |
| WA-06 | render each message type within the platform's size limits | Must | Oversize content is split or shortened; no send is rejected for length |
| WA-07 | attach the job to every outbound message so replies route to it | Must | Replying "approved" to a resume message approves that job when three jobs are open |
| WA-08 | send resumes as PDF documents with a readable file name | Must | `Firstname_Lastname_Acme_Backend_Engineer.pdf` |
| WA-09 | download received files immediately to our storage | Must | The file is available after the platform link has expired |
| WA-10 | honour STOP and START | Must | See CHAN-13 |
| WA-11 | reply helpfully to unsupported message types | Must | Each type in section 6 gets its stated reply |
| WA-12 | show activity with a typing indicator, not a text | Should | No "working on it" message in a normal step |
| WA-13 | rate-limit sends per phone number | Must | No throughput errors in the load test |
| WA-14 | update message status from delivery reports and map errors to actions | Must | Each row in section 8 is covered by a test with a recorded payload |
| WA-15 | record the cost of each delivered message | Must | `cost_events` totals match Meta's billing export for a test week |
| WA-16 | monitor quality rating, messaging limit and template status | Must | An alert fires in a simulated drop |
| WA-17 | switch the whole channel off with one flag | Must | With the flag off, no WhatsApp sends occur and inbound messages get one "moved" reply |
| WA-18 | send each outreach draft as its own text-only message with a "Send as plain text" button, and use a real copy button if the week-1 test confirms one is allowed | Must | A 120-word email draft can be selected and pasted whole; the extra messages are counted in the cost |
| WA-19 | deliver a prompt or follow-up to the chat only when the 24-hour window is open or an approved template is used; the web app always gets it | Must | Window closed, no template: the web app shows it, the chat gets nothing |

## 14. Testing

- The local simulator replays recorded Meta payloads for every inbound type and status.
- Contract tests compare rendered outbound payloads with stored expected ones.
- End-to-end runs use Meta's test number in `dev` and `staging`.
- Before launch, each team member runs one full job on the production number.

## 15. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Gate 0: Meta's developer assistant said yes on 17 Nov 2026 for a fixed, developer-controlled workflow, but Meta gives no binding confirmation ([plan §2.4](../WHATSAPP_VERIFICATION_PLAN.md#24-answer-received-17-november-2026)). Do we accept the remaining risk? | CEO, CTO |
| 2 | Confirm every limit marked [verify] and the typing-indicator feature | Build team |
| 3 | Will Meta class `jobsq_daily_digest` as marketing? | Build team, at submission |
| 4 | Should a second number be registered as a spare? | CTO |
