# 12 — Data export and erasure on request

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.3 (2026-11-18) |
| Scope | **Export: Must have (V1). Erasure on request: a written procedure run by the super admin at launch (proposed). The self-service Delete button: postponed, not in V1 (decided 18 Nov 2026). What is kept and what is erased: decided 18 Nov 2026** |
| PRD | §6 item 13 · §7.2 · §8 Admin (deletion) |
| Backend | [BACKEND.md](../BACKEND.md) §8.8 (`data_requests`), §8.11, §9.6, §18 |
| Depends on | File storage, the payment provider, legal review |

## 1. Purpose

A user can take a copy of everything JobsQ holds about them without asking anyone. This works in every account state, including unpaid, lapsed and suspended.

> **The self-service Delete button is not in V1.** The product owner decided on 18 Nov 2026 that there are no delete functions for now; they will be added later. Sections 3 and 4 and DATA-05 to DATA-14 are the design for that later button.
>
> **What is decided (18 Nov 2026).** When a user asks for their data to be deleted, JobsQ **keeps the activity log and the payment invoices and receipts, linked to the user by user ID, and erases everything else.** I checked this against India's data-protection law and tax record rules (see [the recommendations](../archive/RECOMMENDATIONS_2026-11-18.md#7-data-protection-what-we-must-keep-and-what-must-be-deleted-on-request)): it is broadly right, erasure has an exception for data the law requires us to keep, and the activity log and invoices fall under it. Counsel must confirm the periods.
>
> **Legal basis, to be confirmed by Abdul Muqtadir (CTO):** the Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023), sections 8(7) and 12; the Digital Personal Data Protection Rules, 2025 (notified by MeitY on 13 Nov 2025), rule 8; and, for invoices and receipts, the Central Goods and Services Tax Act, 2017, section 36, with rule 56 of the CGST Rules, 2017. Texts and links: [RECOMMENDATIONS §7.1](../archive/RECOMMENDATIONS_2026-11-18.md#71-legal-references-where-anyone-can-find-them).
>
> **What is proposed (PRD question 31).** Because erasure on request is a legal duty (the Rules' main duties are reported to start about May 2027), launch with the **manual procedure in section 2a**, run by the super admin. The button follows later.
>
> JobsQ stores passwords, phone numbers and users' resumes and uploaded LinkedIn connections, so the legal review in PRD question 15 is still needed before launch.

## 2. Export

1. Account page → **Export my data**.
2. A background job builds a ZIP file. Usually minutes; within 24 hours at most.
3. The user gets an email and the Account page shows **Download**. The link works for 7 days, only when signed in.
4. One export per 24 hours.

Contents:

| Path in the ZIP | Content |
|---|---|
| `account.json` | Name, phone, email, timezone, plan, consents with dates. Never the password or a connector key |
| `preferences.json` | Job preferences |
| `subscription.json` | Plan, period, payment dates and amounts. No card details (we never have them) |
| `usage.json` | Usage per period |
| `resumes/` | Each original file and its parsed facts |
| `jobs/J7-acme-backend-engineer/` | `job.json`, `research.json`, `contacts.json`, `drafts.json`, `tracker.json`, `timeline.json`, each resume PDF |
| `shortlists.json` | Shortlists and the reasons given |
| `messages.json` | Chat messages still within the retention period |
| `README.txt` | What each file is |

## 2a. Erasure on request at launch (procedure)

1. The user writes from the logged-in account (a **Request deletion** link on the Account page that sends the request) or from the registered email. Nobody else can ask for them.
2. Support records the request and confirms identity (the same account or email). The user is told the time limit: **30 days**.
3. The super admin runs the **erasure checklist** (a script plus a manual check): stop agents, close the channel link, cancel the subscription with the provider, end sessions, and erase everything in the "Erased" column of section 3.3.
4. **Kept:** the activity log (user ID, event type, time, result, no personal content) and the payment invoices and receipts, linked by user ID. The account row becomes a shell: user ID, erasure date, nothing personal.
5. An audit-log entry records who ran it and when. The user gets an email saying what was erased, what was kept and why, and that backups age out within 35 days (working value).
6. Meta and Discord keep their own copies of the chat inside the user's own app; JobsQ cannot remove those and says so.

## 3. Self-service deletion (postponed, design for later)

### 3.1 What the user does

1. Account page → **Delete my account**.
2. The page states what will be deleted, what is kept and why, that the subscription ends at once, and what the refund policy says.
3. The user confirms with a code sent to their email.
4. The account enters a **waiting period of 7 days [TBD]**. Logging in shows only "Your account will be deleted on [date]" and **Cancel deletion**.
5. After the waiting period the data is removed.

Asking in chat ("delete my data") gets a link to the Account page. Deletion is never carried out from chat alone, because a chat can be forwarded or left open on a shared device.

### 3.2 What happens immediately

| Step | Detail |
|---|---|
| Status | `deletion_pending` |
| Agents | Off; running steps cancelled |
| Channel | One last message where allowed ("Your JobsQ account is scheduled for deletion"), then the link is closed |
| Subscription | Cancelled with the provider at once, so no further charge is made |
| Sessions | All others ended |

### 3.3 What is removed after the waiting period

| Data | Action |
|---|---|
| Resume files, tailored PDFs, exports | Deleted from storage |
| Resume facts, preferences, shortlists, jobs, research, contacts, drafts, tracker, timeline | Deleted |
| Chat messages, the shared timeline and inbound events | Deleted |
| Name, email, phone, password hash, LinkedIn ID (if collected), connector key, channel links, link codes, sessions, consents, preferences | Deleted (the connector key at once) |
| Usage ledger (counts per period, ids only) | Kept with the activity log, with no personal content |
| The user row | Reduced to an id and a deletion date; email and name removed |

### 3.4 What is kept, and why

| Data | Why | For how long |
|---|---|---|
| Payment invoices and receipts, and payment records (date, amount, provider reference), linked by user ID | Tax and accounting law. Most sources say about six years in India; the accountant confirms | As the law requires **[TBD per market]** |
| The activity log (user ID, event type, time, result; no personal content) | Legal logging duty (commentary on India's DPDP Rules says at least one year) and our own accountability | The legally required period **[TBD, counsel]** |
| Cost records, with the user id removed | Our own cost accounting | Indefinitely, anonymous |
| Admin audit-log entries about the account | Accountability | The audit-log retention period |
| A record that deletion happened (ids only) | To re-apply the deletion if a backup is ever restored | Indefinitely |

Private jobs the user pasted are deleted. Shared job postings and company summaries are not personal data and stay.

### 3.5 Backups and third parties

- **Backups** expire after 35 days (working value). If a backup is restored, the deletion record is replayed so deleted accounts are removed again before the system serves traffic.
- **Meta and Discord** keep their own copies of the chat inside the user's app. We cannot remove those; the deletion screen says so.
- **The payment provider** keeps its own transaction records under its own legal duties.
- **The model provider** keeps request data only as its terms state; nothing is retained by us on its side.

## 4. Deletion by an admin (postponed)

When a user asks support to delete their data (for example because they cannot log in), a super admin confirms the requester controls the account's email address, then starts the same process from the admin console. The waiting period applies unless the user asks in writing to skip it.

## 5. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| DATA-01 | let any signed-in user request an export, in any account state | Must | Works for unpaid, lapsed and suspended users |
| DATA-02 | produce a ZIP with the contents in section 2 | Must | Every listed file is present and matches the database |
| DATA-03 | deliver the export only to the signed-in owner, through a link that expires | Must | Another user's request is refused; the link fails after 7 days |
| DATA-04 | limit exports to one per 24 hours | Should | A second request shows when the next is allowed |
| DATA-05 | let any signed-in user start deletion, confirmed by an emailed code | Later (not in V1) | Deletion does not start without the code |
| DATA-06 | on confirmation, stop agents, close the channel, cancel the subscription and end other sessions at once | Later (not in V1) | No further charge and no further message after confirmation |
| DATA-07 | let the user cancel during the waiting period | Later (not in V1) | The account returns to its previous state, except that the subscription stays cancelled and must be bought again |
| DATA-08 | after the waiting period, remove everything in section 3.3 | Later (not in V1) | A scan of every tenant table and the storage prefix finds nothing for that user |
| DATA-09 | keep only what section 3.4 lists | Later (not in V1) | The retained rows contain no name, email, phone, resume or message text |
| DATA-10 | re-apply recorded deletions after a backup restore | Later (not in V1) | Shown in a restore drill |
| DATA-11 | answer a chat request for deletion with a link, not an action | Later (not in V1) | No deletion can be triggered from chat |
| DATA-12 | let a super admin start deletion on a verified request | Later (not in V1) | Audit row written with the reason |
| DATA-13 | email the user when the export is ready (and, later, when deletion is scheduled and complete) | Must for export | One email for the export in V1 |
| DATA-14 | finish removal within 24 hours of the waiting period ending | Later (not in V1) | Measured by the purge job |
| DATA-15 | provide a written erasure procedure the super admin runs on a verified request (section 2a) | Must (proposed) | A drill erases a test account within the limit and the checklist is signed off |
| DATA-16 | erase on request everything personal except the activity log and the payment invoices and receipts | Must | A scan of every tenant table and the storage prefix finds only the kept rows, and they hold no name, email, phone, resume or message text |
| DATA-17 | keep the activity log and invoices linked by user ID | Must | An invoice can be traced to the user's activity log by the ID after erasure |
| DATA-18 | write no personal content into the activity log | Must | The log test seeds fake personal data and fails the build if any appears |
| DATA-19 | delete the connector key at once on an erasure request | Must | The connector row is gone before the checklist ends |

## 6. Edge cases

| Case | Behaviour |
|---|---|
| Deletion requested with an export in progress | The export finishes and stays downloadable until the waiting period ends |
| Deletion requested during the money-back window | The deletion screen points to the refund request first; deletion does not refund by itself |
| The user signs in again after deletion completed | A new, empty account is created. Nothing is restored |
| Storage deletion fails part-way | The purge job retries; the account is not marked complete until the check in DATA-08 passes |
| A support-access grant is live | Revoked at confirmation |
| The same person re-registers to claim the money-back guarantee twice | See the open question below |

## 7. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Waiting period length (7 days proposed), or none | CEO, legal |
| 2 | How long must payment records be kept in each launch market? | Accountant, legal |
| 3 | To stop repeat use of the money-back guarantee, may we keep a one-way hash of the email, phone number and Discord id after deletion? It conflicts with full erasure | Legal |
| 4 | Chat-message retention period (30 days proposed) | CEO, legal |
| 5 | Should a user be able to delete a single job's data without deleting the account? Proposed: later | Product owner |
| 6 | The resume is uploaded at registration, so some accounts will hold a resume and never pay. **Working value: erased after 30 days** (the product owner, 18 Nov 2026; 90 days was the earlier proposal). To be confirmed by Abdul Muqtadir | Abdul Muqtadir, CEO |
| 7 | **Confirm the manual erasure procedure at launch (section 2a)** and when the self-service button is built | CEO, legal |
| 8 | Exact retention periods for the activity log and for invoices and receipts, per market (India first) | Counsel, accountant |
| 9 | Working limits: erase within **30 days** of a verified request (the product owner's value, 18 Nov 2026); backups age out in 35 days. Unpaid accounts: data erased after **30 days** (the product owner's reading, to be confirmed by Abdul Muqtadir). The legal basis is in the box at the top | Abdul Muqtadir, counsel |
