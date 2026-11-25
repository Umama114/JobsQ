# 11 — Admin console

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.2 (2026-11-18) |
| Scope | Must have (V1), basic |
| PRD | §5 Administration · §6 item 12 · §8 Admin · §9 Kill switch |
| Backend | [BACKEND.md](../BACKEND.md) §7.3, §7.4, §8.8, §8.10, §9.9, §13.8 |
| Depends on | Company single sign-on, [02](02-subscriptions-and-billing.md), [12](12-data-export-and-deletion.md) |

## 1. Purpose

Give TrunkQ staff the smallest set of controls needed to support paying users and to stop a misbehaving agent, without giving anyone a view of users' resumes, contacts or conversations.

## 2. The firm rule

**An admin cannot read a user's resume, contacts, drafts or messages unless that user has opened a support request and granted access.** The grant is for a chosen scope and time, the user can withdraw it, and every view is logged. The rule is enforced in the database, not only in the interface.

## 3. Roles

| Capability | Support | Super admin |
|---|---|---|
| Search users by email or id | Yes | Yes |
| View account, subscription, payments, usage, channel status, suspension history | Yes | Yes |
| Suspend and unsuspend, with a reason | Yes | Yes |
| Ask a user for permission to view their content | Yes | Yes |
| View content under a live grant | Yes | Yes |
| View each agent's on or off state and the overview numbers | Yes | Yes |
| Cancel a subscription | — | Yes |
| Extend a subscription by days | — | Yes |
| Refund a payment | — | Yes |
| Set a user's daily application limit and active-jobs limit | — | Yes |
| Set the other limits, including Interview Prep (rules open) | — | Yes |
| Switch an agent off or on for everyone | — | Yes |
| Read the audit log | — | Yes |
| Add, change or remove admins | — | Yes |

Who holds each role is PRD open question 16.

## 4. Signing in

- A separate address (for example `admin.` on the JobsQ domain), a separate sign-in and separate sessions. An admin account is never a user account.
- Company single sign-on, restricted to the company's domain, with two-factor authentication required.
- Only addresses listed in `admin_users` with status `active` get in.
- Sessions last 12 hours and end on browser close.
- Optional: restrict to the office or VPN addresses **[TBD]**.

## 5. Screens

| Screen | Content |
|---|---|
| **Overview** | Sign-ups, paying users by plan, agent runs and failure rate today, cost today, WhatsApp number health, any agent switched off |
| **Users** | Search box; results with email, status, plan |
| **User** | Account (email, country, created, status); subscription and payments; usage against limits; channel and its state; suspension history; support-access state. **No content.** Action buttons by role |
| **User content** | Shown only under a live grant, and only the granted scope: jobs, resume, or messages. A banner shows the grant's expiry |
| **Agents** | The six agents, each on or off, with who changed it, when and why. Run counts and failure rates |
| **Audit log** | Every admin action: who, what, on whom, reason, time, address. Filterable. Read-only |
| **Admins** | List of admin users and roles |

## 6. Actions

Every action asks for a **reason**, shows what will happen, and writes an audit row before it takes effect.

| Action | What happens |
|---|---|
| **Suspend** | User status becomes `suspended`. Running agent steps are cancelled and their usage released. The next chat message gets the suspension reply. The web app shows a suspension notice with billing and export still available. The subscription itself is untouched |
| **Unsuspend** | Status returns to `active`. Parked jobs continue from where they stopped |
| **Cancel subscription** | Cancelled with the provider, at period end or at once |
| **Extend subscription** | `extended_until` is set; access continues to that date without a charge. For goodwill after an outage |
| **Refund** | Full or partial refund through the provider; access ends on a full refund |
| **Set limits** | Sets, for one user, the **daily application limit** (5 or 10 by default) and the **active-jobs limit** (applied, replied or interview), and optionally the other limits (Interview Prep and others, rules open). The change is an override on top of the plan default, takes effect on the next check, and needs a reason |
| Erase user data on request | Super admin only, by the written procedure ([12](12-data-export-and-deletion.md#2a-erasure-on-request-at-launch-procedure)): everything personal is erased; the activity log and payment invoices and receipts stay. A self-service button comes later |
| **Switch agent off** | No new runs of that agent for anyone. Jobs that need it are parked. Users are told it is temporarily unavailable |
| **Switch agent on** | Parked jobs resume gradually |

## 7. Support access

1. A user contacts support.
2. If the problem needs a look at their content, support sends an access request naming the scope (jobs, resume, messages, or all) and the support ticket.
3. The user sees it on the web app's Support access page and gets an email. They choose a duration (1 hour, 24 hours, 7 days) and allow, or refuse.
4. While the grant is live, the User content screen shows the granted scope. Each view writes an audit row.
5. The grant ends at its expiry, or earlier if the user revokes it. Nothing is cached in the admin's browser beyond the session.

## 8. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| ADM-01 | authenticate admins through company single sign-on with two-factor authentication, separately from users | Must | A user session cannot reach any admin route; an address outside the company domain is refused |
| ADM-02 | enforce the role table in section 3 on the server | Must | A support account calling a super-admin route gets 403 |
| ADM-03 | search users by email or id | Must | Exact and prefix matches |
| ADM-04 | show a user's account, billing, usage, channel and suspension data without any content | Must | The response contains no resume, contact, draft or message fields |
| ADM-05 | suspend a user with a reason, stopping agents at once | Must | A running step is cancelled within 10 seconds; the next chat message gets the fixed reply |
| ADM-06 | unsuspend a user with a reason, resuming parked jobs | Must | Jobs continue without the user repeating anything |
| ADM-07 | let a super admin cancel, extend and refund | Must | Each is reflected at the payment provider and in access |
| ADM-08 | let a super admin set a user's daily application limit and active-jobs limit | Must | The new value is used by the next limit check; an audit row with the reason is written |
| ADM-17 | let a super admin set the other limits, including Interview Prep | Should | Same mechanism as ADM-08. The Interview Prep rules are open |
| ADM-18 | let a super admin see a user's current usage against these limits | Must | Matches the ledger |
| ADM-19 | let a super admin run the erasure procedure for a verified request, with the checklist and a log entry | Must (proposed) | A test account is erased within the limit; the activity log and invoices stay and hold no personal content |
| ADM-09 | let a super admin switch any agent off and on for all users | Must | With an agent off, no run of it starts anywhere; users get the fixed reply; turning it on resumes parked jobs |
| ADM-10 | record every admin action with who, what, target, reason, time and address, in a log that cannot be edited | Must | The database role used by the application has no update or delete permission on the log |
| ADM-11 | let support request content access and let the user grant, refuse and revoke it | Must | Section 7 end to end |
| ADM-12 | block content access without a live grant at the database level | Must | A direct query as the admin role returns no content rows without a grant |
| ADM-13 | require a reason for every action | Must | The action is refused when the reason is empty |
| ADM-14 | show overview numbers | Should | Match the metrics backend |
| ADM-15 | let a super admin manage admin users | Must | Removing an admin ends their sessions |
| ADM-16 | notify the user by email when they are suspended, unsuspended, refunded or have a limit changed by an admin | Should | Email sent with a plain reason category |

## 9. Edge cases

| Case | Behaviour |
|---|---|
| Suspension while an approval is waiting | The approval stays; after unsuspension the user can still answer it |
| Suspension during the grace period | Suspension wins; the grace clock keeps running |
| Refund of a payment from a previous period | Allowed; current access is unaffected unless the current payment is refunded |
| Agent switched off while its runs are in progress | Runs in progress finish; no new ones start **[TBD: or cancel them at once]** |
| An admin leaves the company | Removing them from single sign-on blocks sign-in; a super admin also disables the `admin_users` row |
| Grant expires while an admin has the page open | The next request is refused and the page says the grant has ended |
| Support needs to see content and the user does not respond | Support cannot proceed; they ask the user for screenshots instead |

## 10. Not in V1

Signing in as a user ("impersonation"); editing a user's data; deleting a user's data (later); bulk actions; changing plan prices or the plan default limits in the interface (done in the database by an engineer, with a migration and review). **Per-user limits are in the interface.**; support ticketing itself (use the company's existing tool).

## 11. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Who holds Support and Super admin? | CEO |
| 2 | Does suspension pause billing, or prompt a refund? | CEO |
| 3 | When an agent is switched off, finish or cancel runs in progress? Proposed: finish, unless a second "stop now" option is chosen | CTO |
| 4 | Should a limit change above a set size need a second super admin to confirm? | CEO |
| 6 | Which "other limits" should the super admin be able to set, beyond applications per day, active jobs and Interview Prep? | Product owner |
| 5 | Audit-log retention (2 years proposed) | CEO, legal |
