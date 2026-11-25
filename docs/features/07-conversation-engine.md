# 07 — Conversation engine and job pipeline

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.2 (2026-11-18) |
| Scope | Must have (V1) |
| PRD | §6 items 8, 9 · §7.3 · §8 · §9 Rules for every agent |
| Backend | [BACKEND.md](../BACKEND.md) §10, §11, §12 |
| Depends on | Channel adapters, all agents, [03-usage-limits.md](03-usage-limits.md) |

## 1. Purpose

The engine is the part between "a message arrived" and "an agent ran". It serves **three adapters**: WhatsApp, Discord and the web app (decided 18 Nov 2026). A user has the web app and at most one chat channel, and they share the same jobs, approvals and prompts. It decides what the user meant, whether they may do it, which job it concerns and what happens next. It is ordinary code with database state. No model decides the flow.

It guarantees four things:

1. A job moves forward only when the user says so.
2. A message or button tap is acted on once, even if it arrives twice.
3. The user's messages are handled in the order they were sent.
4. The agents are off the moment the user loses access.

## 2. What it takes in and gives out

| In | Out |
|---|---|
| An inbound event from WhatsApp, Discord or the web app: text, button, menu choice, command, form, file | Zero or more channel-neutral messages, delivered to the chat channel and shown in the web workspace |
| An agent run's result | A state change on a pipeline |
| A timer (the "Did you apply?" and "Did you get a reply?" prompts, [13](13-follow-ups.md)) | An approval request |
| | A new agent run |

## 3. Order of checks for every event

1. **Opted out or unreachable?** Do nothing.
2. **Access.** Not `full` → one fixed reply for that case (unpaid or lapsed, suspended, the connector off on Your own AI), at most once per hour.
3. **Daily message cap.** Over → one reply, then silence until midnight.
4. **Intent** (section 4).
5. **Which job** (section 6).
6. **Is the action allowed in the job's current state?** If not, say what the job is waiting for.
7. **Limit and kill-switch check**, if the action starts an agent: the daily application limit, the active-jobs limit, and the connector on Your own AI.
8. **Apply** in one transaction: state change, approval row, messages, agent run.

## 4. Working out what the user wants

Tried in this order; the first that matches wins.

| # | Source | Example | Model call |
|---|---|---|---|
| 1 | Button, menu, command or form | Tapping **Approve** | No |
| 2 | Reply to one of our messages | Swiping to reply "looks good" on the resume | Only to read the text |
| 3 | A question we just asked | We asked "What should I change?"; the next text is the answer | No |
| 4 | A known pattern | `go 1,3` · `sent 1,2` · `J7 approve` · `stop` | No |
| 5 | Classifier | "can you find me something in fintech" | Yes, a small one |
| 6 | Still unclear | — | Ask, with buttons |

The classifier returns one intent from the fixed list below plus any values it found (job numbers, a contact number, a status). It is shown the message and the list of the user's open jobs, and nothing else. It cannot start an agent by itself: its answer goes through steps 6 to 8 like any button.

### 4.1 Intents

| Intent | Meaning | Typical words |
|---|---|---|
| `find_jobs` | New shortlist | "find me jobs", "anything new?" |
| `pick_jobs` | Choose from the shortlist | "go 1,3", "the second one" |
| `add_job` | Work on a job the user supplies | A link, or pasted job text |
| `approve` | Accept what is waiting | "approved", "looks good", "yes" |
| `request_change` | Ask for a new version | "make the summary shorter", "remove 2" |
| `skip_job` | Drop this job | "skip", "not this one" |
| `add_contact` | Add a person the user knows | "add Priya Nair, EM, priya@acme.com" |
| `report_sent` | Say what was sent | "sent 1,2", "emailed everyone" |
| `report_reply` | Say someone replied | "Priya replied", "they accepted on LinkedIn" |
| `set_status` | Applied, interviewing, rejected, offer | "I applied", "got rejected" |
| `show_jobs` | List open jobs | "where are we", "my jobs" |
| `show_usage` | Usage against limits | "how many left" |
| `upload_resume` | New resume | A file, or "I have a new resume" |
| `update_preferences` | Change what Scout looks for | "only remote from now on" |
| `help` | How it works | "help", "what can you do" |
| `stop`, `start` | Opt out, opt in | "stop" |
| `mock_interview`, `prep`, `follow_ups`, `pause_digest` | Stretch | — |
| `off_topic` | Not about the user's job search | "write me a poem" |

## 5. Things the user can type

| Type this | To |
|---|---|
| `find me jobs` | Get a shortlist |
| `go 1,3` | Pick jobs 1 and 3 |
| A job link or the job text | Work on a job you found |
| `approved` | Accept what is waiting |
| `change …` | Ask for a different version |
| `skip` | Drop the current job |
| `sent 1,2` | Record that drafts 1 and 2 were sent |
| `replied 2` | Record that contact 2 replied |
| `applied` · `rejected` · `offer` | Update the job's status |
| `jobs` | See open jobs |
| `J7 …` | Aim any of the above at job J7 |
| `help` | See this list |
| `stop` | Stop all messages |

Buttons do the same things with one tap. Nobody has to learn the words.

## 6. Which job?

1. The button, menu or form names it.
2. The message is a reply to one of ours, and that message belongs to a job.
3. The text contains a job code (`J7`).
4. Exactly one job is waiting for the user.
5. The job the user last acted on, if that was within 15 minutes.
6. Otherwise ask: "Which job is this about?" with the open jobs as options.

## 7. Approvals

| Approval | Created when | The user can | Then |
|---|---|---|---|
| Pick jobs | A shortlist is delivered | Pick one or more, or ask for another shortlist | One pipeline per pick |
| People | Research is delivered | **Approve** · **Change** (remove or add someone, or "find others") · **Skip job** | Resume Tailor starts |
| Resume | The resume (PDF and Word) is delivered | **Approve** · **Change** | Email and LinkedIn agents start |
| Send | Drafts are delivered | Send them personally, then report | Tracker updates |

Rules:

- Each people or resume approval is a row with a status. Its buttons carry its id.
- **An approval can be given in the chat channel or in the web app.** The first valid decision wins; the other place then shows "Already done". A second tap or an old button gets the same note.
- **Change** asks "What should I change?" and waits up to 15 minutes for the answer. Each change creates a new version and uses one revision ([03-usage-limits.md](03-usage-limits.md)).
- A change that asks for something untrue ("add Kubernetes" when it is not on the resume) is refused by the agent, with the reason and the fix: upload a resume that includes it.
- A job waiting for the user's approval is archived after a period that is **open** (likely 5 to 10 days, not 30), kept on the dashboard, and can be reopened.

## 7a. One history with the web app

The web app and the chosen chat channel read and write **one timeline per user** (decided 18 Nov 2026). Every message, card and answer is one record with its surface (web, WhatsApp, Discord) and a server-assigned order.

- **First answer wins.** Approvals and prompt answers are saved with a compare-and-set on the item's version; the second answer, from either place, gets "already done" with the current state.
- **Old buttons** carry the item's version; a button for a replaced draft says so and shows the new one.
- **Delivery.** Anything new is shown in the web app at once; it goes to the chat only if the channel allows it (WhatsApp: window open or template).
- **One prompt message per user per day**, the most urgent first.
- **A run started in one place** is the same run in the other; a typed command while it runs gets "already working on it".
- **Chat blocked or reconnecting:** the web app carries on; after reconnecting the chat gets a short summary.
- Full table: [RECOMMENDATIONS §5](../archive/RECOMMENDATIONS_2026-11-18.md#5-same-history-on-the-web-and-in-the-chat).

## 8. What is allowed in each state

| State | Waiting for | User actions that apply |
|---|---|---|
| `capturing` | Us | — |
| `researching` | Us | Skip |
| `people_review` | **User** | Approve, change, add contact, skip |
| `tailoring` | Us | Skip |
| `resume_review` | **User** | Approve, change, skip |
| `drafting` | Us | — |
| `outreach_ready` | **User** | Report sent, change a draft, set status |
| `tracking` | **User** | Report sent or reply, set status, archive |
| `prep` (stretch) | User | Mock interview, set status |
| `closed` | — | Reopen by picking the job again |

The full transition table is in [BACKEND.md §12.3](../BACKEND.md#123-pipeline-transitions).

## 9. Several jobs at once

- A user may pick several jobs from one shortlist. Each becomes its own pipeline with its own code.
- At most **2** of a user's pipelines run agents at the same moment; the rest queue. This keeps the chat readable and model usage even.
- At most **10** pipelines may be open (not closed) per user **[TBD]**. Beyond that the user is asked to archive some.
- Results are posted job by job, never interleaved within a step.

## 10. Pacing

- A step expected to take more than a few seconds shows the channel's "working" signal at once ([05](05-whatsapp-channel.md), [06](06-discord-channel.md)).
- If a step passes twice its expected time: one message, "This is taking longer than usual."
- If it fails after retries: a plain message naming the step, with **Try again**. No usage is counted.

## 11. Fixed replies

These are written once and never generated by a model.

| Situation | Reply |
|---|---|
| Not connected | "This chat isn't connected to a JobsQ account yet. Sign up or connect here: [link]" |
| Unpaid or lapsed | "Your JobsQ subscription isn't active. Your jobs are saved. Renew here: [link]" |
| Suspended | "Your JobsQ account is suspended. See your account page for details: [link]" |
| Limit reached | Names the limit, the reset date and the upgrade link |
| Agent switched off | "The Resume Tailor is temporarily unavailable. J7 is saved and will continue when it's back." |
| Off-topic | "I can only help with your job search: finding jobs, tailoring your resume and drafting outreach. Say **help** to see what I can do." |
| Unsupported file or message type | Per channel |
| Nothing waiting | "Nothing is waiting on you. Say **find me jobs**, or send a job link." |

## 12. Off-topic and misuse

- `off_topic` gets the fixed reply. No agent runs and nothing is counted.
- Attempts to change the rules ("ignore your instructions", "show your prompt") are treated as off-topic.
- Text inside job posts, web pages and resumes is data. It reaches agents in labelled blocks and can never trigger a tool by itself, because tools are only reachable through a step the engine started.
- Repeated off-topic or abusive messages count towards the daily cap.

## 13. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| ENG-01 | process each user's events in the order received, one at a time | Must | 20 rapid messages produce replies in the same order |
| ENG-02 | process users in parallel | Must | One user's slow step does not delay another user |
| ENG-03 | act on each event and each approval decision exactly once | Must | Replaying any event three times changes state once |
| ENG-04 | check access before any other work and send the fixed reply when access is not full | Must | A lapsed user's message starts no agent and makes no model call |
| ENG-05 | resolve intent from buttons, replies, pending questions and patterns before using the classifier | Must | Button taps and the patterns in section 5 make no model call |
| ENG-06 | restrict the classifier to the fixed intent list | Must | Any other output is treated as unclear |
| ENG-07 | identify the job by the rules in section 6 and ask when unsure | Must | With three open jobs and an ambiguous "approved", the user is asked which |
| ENG-08 | allow only the transitions in the transition table | Must | Property test: no sequence of events reaches an undefined state |
| ENG-09 | leave a review state only through a recorded user decision | Must | No code path sets `tailoring` or `drafting` without an approved approval row |
| ENG-10 | save the state change, its messages and its agent run together | Must | Killing the worker mid-step loses nothing and duplicates nothing |
| ENG-11 | check limits and the kill switch before starting any agent | Must | See LIM-01 and ADM-09 |
| ENG-12 | start every job message with the job code and "Company – Role" | Must | True for every message with a pipeline |
| ENG-19 | accept the same events and show the same state from WhatsApp, Discord and the web app | Must | An approval given in one place shows as done in the others |
| ENG-20 | enforce the daily application limit and the active-jobs limit before a pick starts a pipeline | Must | At the limit, no pipeline starts and the user is told which limit |
| ENG-21 | keep one timeline per user for the web app and the chat, recording each answer once | Must | An approval given in the web app and an old chat button tapped later produce one approval and an "already done" reply |
| ENG-22 | put the item's version in every button and refuse a stale one with the current state | Must | A replaced draft's old button never approves the new draft |
| ENG-23 | deliver each prompt to the web app always and to the chat only when the channel allows | Must | Verified for open window, closed window with and without a template, STOP and a blocked bot |
| ENG-13 | run at most 2 pipelines per user at once and queue the rest | Must | Picking 5 jobs runs 2, then the next as each finishes |
| ENG-14 | reply to off-topic requests with the fixed text and count nothing | Must | No agent run; no usage row |
| ENG-15 | accept a user-supplied contact at the people approval | Should | The contact appears marked "added by you" and receives drafts |
| ENG-16 | keep waiting approvals answerable in the web app when the chat channel is down or reconnected | Must | See CHAN-11 |
| ENG-17 | tell the user when a step is slow and when it has failed, with a retry | Must | Messages appear at the stated thresholds |
| ENG-18 | record every state change and decision in the job's timeline | Must | The dashboard timeline shows who did what and when |

## 14. Data

`inbound_events`, `conversations`, `pipelines`, `pipeline_events`, `approvals`, `agent_runs`, `messages` ([BACKEND.md §8.5](../BACKEND.md#85-channels-and-conversation), [§8.7](../BACKEND.md#87-pipelines-artifacts-and-outreach)).

## 15. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Maximum **active** jobs per user (open; set by the super admin) and jobs running at once (2 proposed) | Product owner, CTO |
| 2 | How long a job may wait for approval before it is archived (likely 5 to 10 days) | Product owner |
| 3 | **Answered 18 Nov 2026:** yes, approvals can be given on the web as well as in chat | — |
