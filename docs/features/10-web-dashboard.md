# 10 — Web app and dashboard

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.3 (2026-11-25) |
| Scope | Must have (V1) |
| PRD | §5 Dashboard · §6 item 11 · §7.1 · §7.2 · §7.4 |
| Backend | [BACKEND.md](../BACKEND.md) §7, §9 |
| Depends on | Every other feature; designs **[TBD — no Figma file yet]** |

## 1. Purpose

The web app is where the user manages their account and **also does everything the chat channel does** (decided 18 Nov 2026). A user can register, pay, run the agents, approve every step, track jobs and read the prompts, entirely on the web, with or without a connected WhatsApp or Discord chat. It is a third adapter on the same conversation engine, so an approval, button or prompt in one place is the same record in the others. A mobile app is planned and will use the same API.

## 2. Pages

### 2.1 Public

| Page | Content |
|---|---|
| Landing | What JobsQ does, how it works in three steps, the "we never send anything for you" promise, a sign-up button |
| Pricing | The two plans. States there is no free plan |
| Terms, Privacy, Refund policy | Required by the payment provider, Meta and Discord (and Google, if Google sign-in is offered) |
| Contact | Company legal name, address and contact details. Meta's verification compares these with the registration documents |

### 2.2 Getting started

| Page | Content | Spec |
|---|---|---|
| Register / Log in | Resume upload that fills in the form (no AI); name, phone, email, password | [01](01-registration-and-login.md) |
| Resume | Add (if missing) or replace; correct and save | [01](01-registration-and-login.md), [08](08-resume-and-profile.md) |
| Plans | Plan cards, checkout | [02](02-subscriptions-and-billing.md) |
| Confirming payment | Waits for confirmation, then moves on | [02](02-subscriptions-and-billing.md) |
| Choose a channel | WhatsApp or Discord, once, or "use the web app only" | [04](04-channel-connection.md) |
| Preferences | Job preferences (how collected: open) | PRD question 10 |

### 2.3 The app

| Page | Shows | The user can |
|---|---|---|
| **Home** | Channel status; what is waiting on the user; usage today (applications and active jobs); the 5 most recent jobs | Open the chat; answer waiting prompts and approvals; jump to a job |
| **Workspace** | The same conversation as the chat channel, as cards and buttons: ask for jobs, paste a job link, shortlist, research, resume review, drafts, prompts | Do everything the chat does: pick jobs, approve, ask for changes, skip, answer "Did you apply?" and "Did you get a reply?" |
| **Jobs** | Every job: code, company, role, stage, application status, last activity | Filter by stage and status; search by company |
| **Job** | Header with the posting link; timeline; company research with sources; contacts with email status; every resume version with a download; each draft with a copy button and "Open in Gmail"; tracker states | Download; copy; mark sent or replied; set the application status; archive |
| **Shortlist** | The latest shortlist (up to 10) with the reason for each and links | Pick jobs; the same as in chat |
| **Resume** | The active resume's summary, upload date, and all versions | Download any version. Upload a newer resume; the same summary and "Looks right" confirmation as at registration ([08](08-resume-and-profile.md)) |
| **Preferences** | The preference fields (list open) | Edit and save |
| **Channel** | Chosen channel, masked handle, status | Reconnect or disconnect. No switching |
| **Billing** | Plan, renewal or end date, usage bars with reset times, payment history, invoices; for Your own AI, whether the connector is running | Change plan; cancel or undo; update payment method; connector key |
| **Account** | Name, phone, email, active sessions | Edit name and timezone; change password; log out other sessions; export data |
| **Support access** | Any request from support to view the user's content | Allow for a set time; refuse; revoke |

### 2.4 Limited states

| Access | What replaces the app |
|---|---|
| Registered, not paid | Resume and Plans only |
| Lapsed or refunded | A banner with "Renew"; Jobs, Job, Resume and Shortlist are **read-only**; Billing and Account work |
| Suspended | A suspension notice with the reason category; Billing and Account work |
| Your own AI with the connector off | A notice to start the connector; the agents are off; Billing and Account work |

Built today: Start, Scout, Applications (grouped by stage), a thread per job, Settings. See [CURRENT_BUILD.md](../CURRENT_BUILD.md).

## 3. Rules

1. **Full parity with chat.** Anything a user can do in WhatsApp or Discord they can do here, and the reverse. An answer given in one place is final in the others.
2. **Approvals on the web.** Approve, change and skip are available on the web ([07](07-conversation-engine.md)). This replaces the earlier "chat only" answer.
3. **Phone first.** Users arrive from links in chat. Every page works at phone width.
4. **Live where it matters.** The Connect and Confirming-payment pages update by themselves. Other pages refresh on load.
5. **Files are never public.** A download is a link that works for 5 minutes and only for the signed-in owner.
6. **Nothing sensitive in addresses.** Page addresses contain ids, never names, emails or job text.
7. **Accessibility:** WCAG 2.1 AA (framework requirement).
8. **English only** in V1.

### 3a. Copy buttons and the shared timeline

Every outreach draft (email subject, email body, LinkedIn note, LinkedIn follow-up) has its own **Copy** button that puts the text on the clipboard; the email draft also keeps its "open in my email" link. The workspace shows the same timeline as the chat and updates live, so an approval or prompt answered in the chat appears at once and the other way round. Rules: [PRD 7.5](../PRD.md#75-one-history-for-the-web-app-and-the-chat).

## 4. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| DASH-01 | show only the pages allowed for the user's access level | Must | Each row of section 2.4 verified |
| DASH-02 | list all jobs with stage, status and last activity, with filters | Must | Correct with 30 jobs in mixed states |
| DASH-03 | show one job's research, contacts, resumes, drafts, tracker and timeline | Must | Matches what was posted in chat |
| DASH-04 | let the user download any resume version through a short-lived link | Must | Link stops working after 5 minutes and never works for another user |
| DASH-05 | let the user copy a draft and open it in their email | Must | Copy places the full text on the clipboard; the link opens a pre-filled draft |
| DASH-06 | let the user mark messages sent or replied and set the application status | Must | Same records as chat ([09](09-tracker.md)) |
| DASH-17 | provide a workspace with full parity with the chat channel | Must | Every action in the chat feature list can be done on the web, and a test shows the same result in both |
| DASH-18 | show and accept the timed prompts (Did you apply, Did you get a reply) | Must | Buttons work; an answer on the web cancels the chat prompt |
| DASH-19 | give every outreach draft part its own Copy button | Must | One tap puts the exact text on the clipboard; a test reads it back |
| DASH-20 | show the shared timeline live, updating when the chat changes it | Must | An approval in the chat appears in the web app within 5 seconds |
| DASH-21 | offer both PDF and Word downloads for each tailored resume | Must | Both files open and match |
| DASH-07 | let the user edit preferences | Must | The next shortlist uses the new values |
| DASH-08 | show usage against each limit with reset dates | Must | Matches the ledger |
| DASH-09 | show what is waiting on the user, with a button that opens the chat if one is connected | Must | Opens WhatsApp or Discord at the JobsQ chat |
| DASH-10 | show the channel's state and offer reconnect and disconnect (no switch) | Must | See [04](04-channel-connection.md) |
| DASH-11 | provide billing management | Must | See [02](02-subscriptions-and-billing.md) |
| DASH-12 | provide data export, and a Request deletion link (the self-service button comes later) | Must | See [12](12-data-export-and-deletion.md) |
| DASH-13 | let the user answer support-access requests | Must | See [11](11-admin-console.md) |
| DASH-14 | work at phone width and meet WCAG 2.1 AA | Must | Checked on a 360-pixel-wide screen and with an automated accessibility scan plus a manual keyboard pass |
| DASH-15 | respond within 500 ms at the 95th percentile for data requests | Must | Measured in the load test |
| DASH-16 | show a clear empty state on every list | Should | A new user sees what to do next, not a blank table |

## 5. Not in V1

Editing resume text; notifications by browser push; a mobile app in the first cycle (planned afterwards, on the same API); deleting data or the account (later); languages other than English.

## 6. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Who designs the screens, and by when? (PRD open question 12; likely Abdul Ahad, to be confirmed) | CEO |
| 4 | Mobile app: platform, timing, and whether it mirrors the whole web app | CEO, CTO |
| 2 | Should the resume also be uploadable on the web as a fallback for chat upload problems? Proposed: yes, as a "Should" | Product owner |
| 3 | Domain names for the site, the app and the short links | CEO, CTO |
