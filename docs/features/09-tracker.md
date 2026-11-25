# 09 — Tracker

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.2 (2026-11-18) |
| Scope | Must have (V1) |
| PRD | §5 The agents (tracker story) · §6 item 9 · §7.3 step 5 |
| Backend | [BACKEND.md](../BACKEND.md) §8.7 (`outreach_messages`, `pipelines`, `pipeline_events`), §9.5 |
| Depends on | [07-conversation-engine.md](07-conversation-engine.md), Email and LinkedIn agents |

## 1. Purpose

Keep one accurate record of what the user has sent, who replied and where each application stands, so the user does not need a spreadsheet and so later steps (follow-ups, interview prep) know what is due.

## 2. The one rule

**Only the user updates the tracker.** JobsQ never sends anything and never reads the user's mailbox or LinkedIn, so it cannot know a message was sent or answered unless the user says so. Every "sent" and "replied" in the tracker is the user's report. JobsQ does ask at set times (section 4a), and the user answers with a button.

## 3. What is tracked

### 3.1 Per contact, per message

| Message | States |
|---|---|
| Referral email | `drafted` → `sent` → `replied` |
| LinkedIn connection note | `drafted` → `sent` → `replied` (meaning the request was accepted) |
| LinkedIn message after acceptance | `drafted` → `sent` → `replied` |
| Follow-ups (stretch) | `drafted` → `sent` → `replied` |

### 3.2 Per job

| Application status | Meaning |
|---|---|
| `saved` | Not applied yet ("To apply") |
| `applied` | The user submitted the application |
| `replied` | The company replied (not yet an interview) |
| `interviewing` | An interview is planned or under way |
| `rejected` | Closed without an offer |
| `offer` | An offer was made |

**Active jobs** are those in `applied`, `replied` or `interviewing`; they count against the active-jobs limit ([03](03-usage-limits.md)). `rejected` and `offer` close the job. `rejected` is set by the user's "No" to "Did you apply?", by "Not shortlisted", or by the user saying so. The pipeline state and the application status are separate: the first is where JobsQ's work stands, the second is where the user's application stands.

## 4. How the user updates it

### In chat

| The user says | Effect |
|---|---|
| `sent 1,2` | Emails to contacts 1 and 2 → `sent` |
| `sent all` | Every drafted email for this job → `sent` |
| `connected 1` | LinkedIn request to contact 1 → `sent` |
| `accepted 1` | LinkedIn request to contact 1 → `replied`. We then post the after-acceptance message to copy |
| `replied 2` or "Priya replied" | Email to contact 2 → `replied` |
| `applied` | Application status → `applied` |
| "they want to interview on Friday" | Status → `interviewing`; the date is saved; Interview Prep is offered (stretch) |
| `rejected` · `offer` | Status set; the job closes |
| `not sent 2` · `undo` | Reverses the last report, if nothing later depends on it |

After the drafts are posted, a menu ("Which did you send?" with every draft as an option) does the same with taps.

### In the web app

On a job's page each draft has **Mark sent** and **Mark replied**, and the job has a status selector. Changes there and in chat are the same records.

## 4a. Timed prompts

JobsQ asks the user, with buttons, in the chosen channel and in the web app ([13](13-follow-ups.md)):

| When | Question | Buttons | Effect |
|---|---|---|---|
| 2 hours after the resume is approved | "Did you apply?" | **Yes** · **Not yet** · **No** | Yes: `applied`, active, schedule the next prompt. Not yet: ask again for up to 2 days. No: job closed as `rejected` |
| 4 days after Yes | "Did you get a reply? I can help you prepare for the interview." | **Got a reply** · **Not yet** · **Not shortlisted** | Got a reply: `replied`. Not yet: repeat for the next 30 days. Not shortlisted: `rejected` and the follow-ups stop |

The day counts (2, 4, 30) are working values; the final limits are open.

## 5. Seeing it

| Where | What |
|---|---|
| Chat: `jobs` | Each open job: code, company, role, stage, and what is waiting |
| Chat: `J7 status` | That job's contacts with each message's state |
| Dashboard: Jobs list | Stage and application status per job, filterable |
| Dashboard: Job page | Contacts, drafts, states, and a timeline of every event |

Example reply to `J7 status`:

```
📌 J7 · Acme – Backend Engineer · applied 12 Nov

1. Priya Nair, Engineering Manager
   Email: sent 12 Nov · LinkedIn: accepted 14 Nov
2. Rahul Verma, Staff Engineer
   Email: sent 12 Nov, no reply yet · LinkedIn: not sent
3. Sara Khan, Senior Engineer
   No email found · LinkedIn: sent 13 Nov
```

## 6. Rules

1. A state only moves forward, except through an explicit undo.
2. `replied` implies `sent`: reporting a reply to a message still marked `drafted` sets both.
3. Dates are recorded when reported. The user may give a date ("sent yesterday"); otherwise it is now.
4. Every change writes a timeline event with who made it and where (chat or web).
5. Closing a job does not delete its tracker data.
6. Numbers shown to the business (sent, reply rate) are self-reported and labelled so.

## 7. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| TRK-01 | record each drafted message as `drafted` when it is delivered | Must | Rows exist for every draft posted |
| TRK-02 | let the user mark messages sent or replied in chat by number, by name or by menu | Must | Each form in section 4 updates the right rows |
| TRK-03 | let the user set the application status in chat and on the web | Must | Both write the same field |
| TRK-04 | post the after-acceptance LinkedIn message when the user reports an accepted request | Must | Arrives as its own copyable message |
| TRK-05 | show a job's contacts and message states on request | Must | Matches the database |
| TRK-06 | list open jobs with stage and what is waiting | Must | `jobs` output is correct with 5 open jobs |
| TRK-07 | let the user undo the last report | Should | State returns to its previous value |
| TRK-08 | write a timeline event for every change | Must | Visible on the job page |
| TRK-09 | accept a reported date and default to now | Should | "sent yesterday" stores yesterday's date in the user's timezone |
| TRK-10 | close the job when the status becomes rejected or offer | Must | The job leaves the open list |
| TRK-11 | never mark anything sent without the user's report | Must | No code path sets `sent` from a link click or a timer |
| TRK-12 | let the user mark sent and replied on the web | Should | Buttons on the job page |

## 8. Edge cases

| Case | Behaviour |
|---|---|
| `sent 4` when there are 3 contacts | "There are 3 people on J7. Which did you mean?" |
| `sent 1` with two jobs in `outreach_ready` | The engine asks which job |
| The user reports a reply from someone not on the list | Offer to add them as a contact; set the status if they say it was the company |
| The user opens a Gmail link | Recorded as opened for our own analytics only; **not** treated as sent |
| The user reports sending a draft they later asked to change | The latest version is marked sent |
| Rejected, then the company comes back | The user picks the job again; it reopens with its history |

## 9. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | **Answered 18 Nov 2026:** yes. Two hours after the resume is approved, with Yes / Not yet / No (section 4a). The final day limits are open | Product owner |
| 2 | Is a spreadsheet export of the tracker wanted in V1? It is part of the full data export already | Product owner |
