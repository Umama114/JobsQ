# 13 — Follow-up prompts and reminders

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.3 (2026-11-18) |
| Scope | The two timed prompts below replace the old "5 days, 2 follow-ups" rule. **The prompts are Must (decided 18 Nov 2026); only their limits are open** (PRD open question 26). Follow-up **drafts** to contacts stay Stretch |
| PRD | §6 Must item 9, §7.3 step 5, Stretch item 2 |
| Backend | [BACKEND.md](../BACKEND.md) §10, §13.2 (Batch) |
| Depends on | [09-tracker.md](09-tracker.md); on WhatsApp, an approved template and (at scale) business verification |
| Decisions | [DECISIONS_2026-11-18.md](../archive/DECISIONS_2026-11-18.md) D21, D22 |

## 1. Purpose

JobsQ cannot see whether the user applied or got a reply, so it asks, with buttons, at the right moments. The answers keep the tracker accurate, close dead jobs, count active jobs for the limits, and open the door to interview preparation.

The prompts reach the user in the chosen chat channel **and** in the web app, with the same buttons. An answer in one place is final in the other.

## 2. Prompt 1: "Did you apply?"

| Item | Rule |
|---|---|
| Starts | **2 hours after the user approves the tailored resume** |
| Message | "Did you apply to {Company} – {Role}?" |
| Buttons | **Yes** · **Not yet** · **No** |
| Yes | Application status becomes `applied`; the job now counts as active; prompt 2 is scheduled |
| Not yet | The question is asked again later. It stops after **2 days** (working value; the limit is open) |
| No | The job is closed as **rejected** (the user's own decision) and no more prompts come for it |
| No answer in 2 days | Prompting stops. The job stays at "resume approved" and is shown as "not confirmed" on the dashboard |

## 3. Prompt 2: "Did you get a reply?"

| Item | Rule |
|---|---|
| Starts | **4 days after the user said Yes** to "Did you apply?" |
| Message | "Did you hear back from {Company}? If you got a reply or an interview, I can help you prepare." |
| Buttons | **Got a reply** · **Not yet** · **Not shortlisted** (the other button labels are to be finalised) |
| Got a reply | Application status becomes `replied`; Interview Prep is offered (stretch) |
| Not yet | The question is asked again. Follow-ups continue for the **next 30 days** (working value; the gap between repeats is open) |
| Not shortlisted | The job is closed as **rejected** and **all follow-ups for it stop** |
| No answer in 30 days | Prompting stops and the job is marked "no response" on the dashboard (to be confirmed) |

## 4. Rules

1. All day counts (2, 4 and 30) are **working values. The limits are open** and are stored as settings, not code.
2. A job that is closed, rejected or has an offer is never prompted.
3. At most **one prompt message per user per day**, covering all due jobs, so a user with several jobs gets one message with a list, not many messages.
4. Prompts are sent only between **08:00 and 21:00** in the user's timezone (proposed). A prompt due outside that time waits until 08:00.
5. WhatsApp: inside the 24-hour window a normal message; outside it, an approved template with the same buttons (Meta's category is its decision; this is the template most at risk of being classed as marketing, see [WHATSAPP_PRICING.md](../WHATSAPP_PRICING.md)). Discord: a normal message. Web: a card in the workspace and a badge.
6. The user can turn prompts off per job ("stop asking about this job") and for the account (Preferences).
7. A prompt is never an application sent for the user. JobsQ still only asks and records.
8. Prompts do not count against any plan limit (proposed).
9. **One history.** A prompt is one record on the user's shared timeline, shown in the web app always and in the chat when the channel allows it. The first answer wins; a late tap on the other place gets "already answered" ([PRD 7.5](../PRD.md#75-one-history-for-the-web-app-and-the-chat)).

## 5. Follow-up drafts to contacts (Stretch)

Unchanged from the first plan, and still stretch: for a contact who has not replied, an Email or LinkedIn follow-up draft the user can send. Email follow-up under 60 words with "Re: " plus the original subject; LinkedIn follow-up under 80 words. The user sends it. The timing of these drafts should follow the same working values as prompt 2 once the limits are decided.

## 6. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| FU-01 | schedule "Did you apply?" two hours after a resume is approved | Must | A resume approved at 10:00 produces the prompt at 12:00, or at 08:00 if that falls in quiet hours |
| FU-02 | apply Yes, Not yet and No as defined in section 2 | Must | Each button gives the stated state change; No closes the job as rejected |
| FU-03 | stop "Not yet" repeats after the 2-day limit | Must | The limit is read from settings |
| FU-04 | schedule "Did you get a reply?" four days after Yes | Must | Verified with a fake clock |
| FU-05 | repeat prompt 2 for the 30-day limit and stop at its end | Must | The limit is read from settings |
| FU-06 | stop all follow-ups for a job when **Not shortlisted** is pressed | Must | No further prompt for that job; the job is `rejected` |
| FU-07 | send at most one prompt message per user per day, within the allowed hours | Must | Verified for a user in a non-UTC timezone |
| FU-08 | use a template on WhatsApp outside the window and a normal message otherwise | Must | The sender chooses correctly in both cases |
| FU-09 | show the same prompt and buttons in the web app | Must | An answer given in one place cancels the prompt in the other |
| FU-10 | let the user turn prompts off per job and for the account | Must | Each control works in chat and on the web |
| FU-11 | prepare follow-up drafts to contacts, within word limits | Stretch | Checked by the length and subject validators |
| FU-12 | apply the same fact checks as first drafts | Stretch | No unsupported claim passes |

## 7. Edge cases

| Case | Behaviour |
|---|---|
| Template not approved, or the account is at its messaging limit | No WhatsApp prompt is sent; the prompt is shown in the web app and waits for the user's next message |
| User opted out (STOP) | No chat prompts; the web app still shows them |
| Subscription lapsed | No prompts; due items are kept |
| The user presses a button twice or an old button | Acts once; the second tap gets "already done" |
| The user answers "Yes" long after the 2-day limit | Accepted: the user can still say "applied" in chat or on the web, which starts prompt 2 from that date |
| Many jobs due at once | One message with the list, up to 10 jobs, with "show more" |
| The user already marked the job applied on the web before the prompt | The prompt is cancelled |
| Daily application limit reached | Prompts are not affected; they are not applications |
| The user only uses the web app and the WhatsApp window is closed | The prompt is in the web app at once; whether a paid template also goes to the chat is open (PRD question 33) |
| The user answers on the web while the chat prompt is still on the phone | The chat tap gets "already answered at 10:02 from the web app" |
| The user is erased on request | All prompts stop; the schedule is part of the personal data that is erased |

## 8. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Final limits: the 2-day, 4-day and 30-day values (working values only) and how often prompt 2 repeats | Product owner |
| 2 | ~~Must or Stretch?~~ **Answered 18 Nov 2026: Must.** The limits (how often, how far apart, how many days) are question 1 | Product owner |
| 3 | Final labels for the prompt 2 buttons | Product owner |
| 4 | Do prompts count against any plan limit? Proposed: no | CEO |
| 5 | Default quiet hours (proposed 21:00 to 08:00) | Product owner |
| 6 | If the user only uses the web app, do chat prompts stop after some quiet period? (PRD question 35) | Product owner |
