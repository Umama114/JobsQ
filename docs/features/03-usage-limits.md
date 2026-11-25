# 03 — Usage limits

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.2 (2026-11-18) |
| Scope | Must have (V1) |
| PRD | §6 item 10 · §8 Agents (plan limit reached) · open question 4 |
| Backend | [BACKEND.md](../BACKEND.md) §8.4, §12.4, §16 |
| Depends on | [02-subscriptions-and-billing.md](02-subscriptions-and-billing.md) |

## 1. Purpose

Limits keep the work per user predictable. This protects margin on the JobsQ AI plan (one application costs roughly $0.41 to $0.70 in AI cost, an estimate with Claude prices as a working basis) and stops one account from running up cost. The user can always see where they stand, and is told clearly when they reach a limit.

**Decided 18 Nov 2026:** the main limit is a **daily limit on applications (5 or 10 per day)** and a limit on **active jobs** (applied, replied or at interview). **The super admin sets both, per user**, and can set the other limits too. The values are open.

> **Crucial decision (open): the daily application limit (5 or 10).** It is decided together with the AI model, because the reason is cost: the limit multiplies the cost of every application. At 5 a day a JobsQ AI user can cost about $60 to $105 a month in AI, at 10 a day about $120 to $210, against $18 to $24 for a typical user ([recommendations §8](../archive/RECOMMENDATIONS_2026-11-18.md#8-the-two-crucial-decisions-both-about-cost)). The price of the JobsQ AI plan, the limit and the model are set together.

## 2. What is counted

| Unit | One unit is… | Counted when | Given back when | Resets |
|---|---|---|---|---|
| `application` | One job taken through the pipeline | The research is delivered to the user | The step fails for a system reason, or the posting turns out to be closed | **Each day, at the user's local midnight** (decided; the daily value is 5 or 10) |
| `active_job` | One job in the state applied, replied or interview | The user says they applied | The job is closed (rejected, offer taken or dropped) | Not a counter. It is the current number of active jobs |
| `shortlist` | One Scout shortlist | The shortlist is delivered | Scout fails | Each day, at the user's local midnight |
| `prep_session` (stretch) | One Interview Prep guide, with its mock interview | The guide is delivered | Prep fails | Each billing month. The rules are open and the super admin can set them |
| `revision` | One "change" request on research, a resume or drafts | The new version is delivered | The new version fails its checks | Per item; does not reset |

Not counted: approvals, tracker updates, status questions, help, anything refused as off-topic, and any step that fails on our side.

The **application** is the main unit. The others are fair-use caps that stop a single account from running up cost. On Your own AI the AI cost is the user's, but the same limits apply, because search, messages and our own load still cost us.

## 3. Limits per plan

Limits live in two places: a **default per plan** (`plans.limits`) and a **per-user override** set by the super admin (`user_limit_overrides`). The override wins. Changing either needs no code change. **All numbers marked open are placeholders until the CEO sets them** (PRD open question 4).

| Limit | JobsQ AI | Your own AI | Status |
|---|---|---|---|
| Applications per day | 5 or 10 | 5 or 10 | **Plan decided, value open** |
| Active jobs at once (applied, replied, interview) | Open | Open | **Open.** How many applications in process one user may have |
| Shortlists per day | 5 | 5 | Placeholder |
| Interview Prep sessions (stretch) | Open | Open | Open. Super admin can set |
| Revisions per item | 5 | 5 | Placeholder |
| Contacts researched per application | 3 | 3 | Placeholder (2 or 3 people) |
| Messages the user may send per day | 300 | 300 | Placeholder |
| Jobs in one shortlist | 10 | 10 | Decided |

```json
{
  "application_per_day": 10,
  "active_jobs": null,
  "shortlist_per_day": 5,
  "prep_session_per_period": null,
  "revision_per_item": 5,
  "contacts_per_application": 3,
  "inbound_messages_per_day": 300,
  "shortlist_size": 10
}
```

`null` means not yet decided: the system treats it as the safest stricter default set by the CTO until the CEO decides. The old monthly application limits (30 and 100) are withdrawn.

## 4. How it works

1. Before a counted step starts, the engine calls `can(user, unit)`.
2. If allowed, it writes `+1` to `usage_ledger` with a reference to the thing being made (a **reservation**), then starts the step.
3. If the step fails for a reason that is not the user's, it writes `-1` (a **release**).
4. Usage for a period is the sum of the ledger rows for that user, unit and period. Nothing else is stored, so the number cannot drift from the facts.

Two requests arriving together cannot both take the last unit: the check and the reservation run in one transaction under the per-user lock.

## 5. What the user sees

| Moment | In chat | On the web |
|---|---|---|
| Any time | "You've used 4 of 10 applications today" on request | A usage bar per limit, with the reset time |
| At 80% of the daily limit | One line added to the next result: "2 applications left today" | The bar changes colour |
| At the daily limit | The step does not start. "You've reached today's 10 applications. They reset at midnight." | The same |
| At the active-jobs limit | The step does not start. "You have the maximum of N active jobs. Close one (rejected, offer or dropped) to start another." | The same, with a link to the tracker |
| Daily shortlist limit | "That's today's 5 shortlists. More tomorrow, or send me a job link to work on now" | — |
| Revision limit | "This is the last change I can make to this resume. You can still approve it or skip the job" | — |

Reaching a limit does not stop work already under way. Jobs that have been counted continue through resume, drafts and tracking. The same messages appear in the web app.

## 6. Safety limits (not plan features)

| Guard | Rule | Effect |
|---|---|---|
| Daily cost ceiling per user | Measured cost over 24 hours passes a configured amount | Agent runs pause for that user, an alert goes to the team, the user is told to contact support |
| Messages per day | The inbound cap in section 3 | One "slow down" reply; further messages are dropped until midnight |
| System-wide ceiling | Total spend per hour passes a configured amount | New agent runs are queued, not started; alert |

These exist to catch bugs and abuse, and should rarely be seen by a real user.

## 7. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| LIM-01 | check the plan limit before every counted step | Must | A step at the limit never starts and makes no model call |
| LIM-02 | count a unit only when its result reaches the user | Must | A failed research step leaves the application count unchanged |
| LIM-03 | prevent two concurrent requests from both using the last unit | Must | A test firing 10 simultaneous picks at 1 remaining unit starts exactly 1 |
| LIM-04 | reset daily units at the user's local midnight and any monthly units on the billing date | Must | Verified for a user in a non-UTC timezone |
| LIM-05 | show usage and reset dates on the web and on request in chat | Must | Numbers match the ledger |
| LIM-06 | tell the user which limit was reached, when it resets and how to upgrade | Must | Message contains all three |
| LIM-07 | warn once at 80% of the application limit | Should | Sent once per period |
| LIM-08 | apply a higher plan's limits immediately on upgrade | Must | Usage so far carries over |
| LIM-09 | let already-counted jobs finish after the limit is reached | Must | A job in `resume_review` at the limit can still be approved and drafted |
| LIM-10 | pause a user whose measured cost passes the daily ceiling, and alert the team | Must | Triggered in a test with a lowered ceiling |
| LIM-11 | read all limits from the plan record, with a per-user override | Must | Changing a number in `plans.limits` or an override takes effect without a deploy |
| LIM-12 | let the super admin set the daily application limit and the active-jobs limit per user | Must | The change takes effect on the next check and is written to the audit log with a reason |
| LIM-13 | count active jobs as those in applied, replied or interview | Must | A job moves out of the count when it is rejected, closed or an offer is accepted |
| LIM-14 | let the super admin set the other limits, including Interview Prep | Should | Open question 3 |

## 8. Edge cases

| Case | Behaviour |
|---|---|
| User picks 3 jobs with 1 application left today | The first is started; for the other two: "1 application left today, so I started J7. The others can wait until tomorrow" |
| Posting found closed after research was delivered | The unit stays counted (the work was delivered) |
| Posting found closed before research | No unit counted |
| Downgrade takes effect with usage above the new limit | No new applications until the next reset; nothing is taken away |
| Yearly plan | Any monthly limits reset on the same day each month |
| Super admin lowers a limit below current usage | Nothing is taken away; no new applications until usage falls below the new limit |
| Refund | Usage is not reset; the account is `limited` anyway |
| Clock change or timezone edit | The daily reset uses the timezone on the account at the time of the check |

## 9. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | The numbers in section 3: the daily application value (5 or 10) and **how many applications may be in process (active) per user** | CEO, with cost data from the CTO |
| 2 | Should unused daily applications roll over? (Proposed: no) | CEO |
| 3 | Interview Prep limits (the super admin can set them) | Product owner |
| 4 | Daily cost ceiling value | CTO |
| 5 | Do Your own AI's limits differ from JobsQ AI's? | CEO |
