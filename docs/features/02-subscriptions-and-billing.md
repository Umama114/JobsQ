# 02 — Subscriptions and billing

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.3 (2026-11-25) |
| Scope | Must have (V1): two plans (JobsQ AI and Your own AI), monthly. Stretch: yearly billing |
| PRD | §5 Account and subscription · §6 items 3, 4 · §7.2 · §8 Registration and payment |
| Backend | [BACKEND.md](../BACKEND.md) §7.2, §8.4, §9.3, §16 |
| Depends on | A payment provider account (**provider open**), legal pages, a tax decision |

## 1. Purpose

There is no free plan. A registered user sees the plans, pays on the payment provider's page, and gets access. This feature keeps that access correct for the life of the subscription: renewals, failed payments, cancellation, plan changes and refunds.

## 2. Plans

| | JobsQ AI (`jobsq_ai`) | Your own AI (`own_ai`) |
|---|---|---|
| Agents | All six | All six |
| Who pays for the AI | **JobsQ** | **The user**, through their own Claude Code or Codex subscription |
| Setup | Nothing | Run the JobsQ Connector on their computer; it must be on while agents work |
| Price | Higher. **[TBD — CEO]** | Cheaper. **[TBD — CEO]** |
| Limits | [03-usage-limits.md](03-usage-limits.md) | [03-usage-limits.md](03-usage-limits.md) |
| Billing | Monthly (V1), yearly (stretch) | Monthly (V1), yearly (stretch) |
| Currency | **Open** | **Open** |

Plan names, prices, currency, payment provider and limits are open CEO decisions (PRD open questions 2 to 5). Plans are rows in the database.

### 2.1 The Your own AI plan

| Rule | Detail |
|---|---|
| What the user does | Makes a connector key in Settings and runs the connector on their computer. No AI API key is entered |
| Key | A JobsQ connector key; only its hash is stored. Making a new one stops the old one |
| Connector | Makes only outgoing requests; runs Claude Code or Codex in an empty folder; Claude Code gets only web search and fetch for agents that need the web; Codex runs read-only |
| Off or failing | The step stops and the user is told. JobsQ never uses its own AI for this user |
| What JobsQ still pays | Job search, email lookup, WhatsApp messages and hosting (PRD question 25) |
| Quality | Depends on the user's tool. Claude Code is checked; Codex is not yet tested |
| Switching plans | Either way, as the plan allows; limits carry over |
| Terms | Get written approval from Anthropic (and OpenAI) before charging for it: their terms restrict third-party use of subscription logins |

## 3. Flows

### 3.1 First purchase

1. The plans screen shows the two plans and their prices (currency open). A user who picks Your own AI connects the connector after payment, and the agents stay off until it is running.
2. The user picks a plan. We create a checkout with the provider and send the user to the provider's page.
3. The user pays there. Card or UPI details never reach JobsQ.
4. The provider sends a signed webhook. We fetch the subscription from the provider and record it as `active`.
5. The provider sends the user back. The page polls until access is `full`, then shows the Connect screen.

Access is granted by step 4, never by the redirect in step 5.

### 3.2 Renewal

The provider charges on the renewal date and tells us. We move the period forward. Usage for monthly limits starts again.

### 3.3 Failed renewal and grace period

1. The provider reports a failed charge. Status becomes `past_due`; `grace_until` is set to now plus the grace period (**[TBD]**, 5 days proposed).
2. The user keeps full access during the grace period. They get an email, a banner in the web app, and a short note in chat the next time they write (no paid template is spent on it).
3. The provider retries on its own schedule. A successful retry returns the status to `active`.
4. When the grace period ends unpaid, the subscription is cancelled with the provider and becomes `canceled`. Access drops to `limited`. Jobs in progress are kept and resume if the user pays again.

### 3.4 Cancellation

The user cancels on the Billing page. The subscription ends at the end of the paid period, not at once. Until then the user can undo the cancellation. A confirmation email states the last day of access.

### 3.5 Changing plan

- **Your own AI to JobsQ AI:** at once. The provider charges the difference for the rest of the period. Usage so far still counts.
- **JobsQ AI to Your own AI:** at the next renewal.

### 3.6 Refunds

- **By a super admin**, from the admin console, for any payment, with a reason. Access ends when the refund is issued.
- **Money-back guarantee [TBD — PRD open question 5]:** if adopted, a user may ask within 7 days of their first ever payment. It is granted automatically when usage is under a cap (**[TBD]**) and the person has not used the guarantee before, judged by email, payment method, WhatsApp number and Discord account. Otherwise it goes to support.

## 4. Subscription states

| Our status | Meaning | Access |
|---|---|---|
| `incomplete` | Checkout started, not paid | `limited` |
| `active` | Paid and current | `full` |
| `past_due` | Renewal failed, inside the grace period | `full`, with a banner |
| `canceled` | Ended: grace expired, or the period ended after a cancel | `limited` |
| `refunded` | Refunded | `limited` |

A user has at most one subscription that is `active` or `past_due`; the database enforces it. Suspension is separate and overrides access whatever the subscription says.

## 5. Provider events

One interface, one adapter per provider ([BACKEND.md §16](../BACKEND.md#16-billing-and-entitlements)). On any event we fetch the subscription from the provider and store what it says, so the exact event matters less than the fact that something changed. Event names below are to be confirmed against each provider's documentation at build time **[verify]**.

| What happened | Stripe | Razorpay |
|---|---|---|
| First payment succeeded | `checkout.session.completed`, `invoice.paid` | `subscription.activated`, `subscription.charged` |
| Renewal succeeded | `invoice.paid` | `subscription.charged` |
| Renewal failed | `invoice.payment_failed` | `subscription.pending` |
| Retries exhausted | `customer.subscription.deleted` | `subscription.halted` |
| Cancelled | `customer.subscription.updated`, `customer.subscription.deleted` | `subscription.cancelled` |
| Plan changed | `customer.subscription.updated` | `subscription.updated` |
| Refunded | `charge.refunded` | `refund.processed` |

## 6. Rules

1. The provider is the source of truth for money. We never mark a payment as made on our own.
2. Each provider event is processed once, keyed on the provider's event id.
3. A daily job compares our subscriptions with the provider's and repairs any difference.
4. Payment never happens in chat. Chat only links to the web app.
5. Billing notices go by email and in-app banner, not WhatsApp templates.
6. No card or bank details are stored or logged.
7. Access is computed from the subscription and the user's status on every request; it is never a stored flag.

## 7. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| BILL-01 | show plans and prices in the chosen currency (open) | Must | Prices come from `plan_prices`; a price change needs no deploy |
| BILL-02 | create a provider-hosted checkout for the chosen price | Must | The user lands on the provider's page with the right plan and amount |
| BILL-03 | grant access only on a verified provider confirmation | Must | Closing the tab after paying still results in access; a forged redirect grants nothing |
| BILL-04 | process each provider event once and tolerate events out of order | Must | Replaying any event three times, in any order, leaves the same final state |
| BILL-05 | allow one live subscription per user | Must | A second checkout while one is live is refused; a duplicate created in a race is cancelled and refunded automatically and raises an alert |
| BILL-06 | on a failed renewal, keep access for the grace period and notify the user | Must | Email sent; banner shown; chat note on the next message; status `past_due` |
| BILL-07 | end access when the grace period ends unpaid | Must | Status `canceled`; agents off; jobs kept |
| BILL-08 | let the user cancel at period end and undo it before then | Must | Access continues to the stated date; undo restores renewal |
| BILL-09 | show plan, renewal date, payment history and invoice links | Must | Matches the provider |
| BILL-10 | reconcile with the provider daily | Must | A deliberately corrupted test row is repaired by the job |
| BILL-11 | let a super admin refund a payment with a reason | Must | Refund appears at the provider; access ends; audit row written |
| BILL-12 | move Your own AI to JobsQ AI at once and JobsQ AI to Your own AI at renewal | Should | The change applies at the stated time; usage carries over |
| BILL-13 | support two payment providers behind one interface | Must only if two providers are chosen | The same test suite passes against both adapters in test mode |
| BILL-14 | offer the money-back guarantee with its conditions | TBD | Depends on PRD open question 5 |
| BILL-15 | offer yearly billing | Stretch | A yearly price can be chosen; monthly limits reset each month within the year |
| BILL-16 | let only a Your-own-AI user with an active plan create and replace a connector key and see whether the connector is running | Must | The key is shown once; replacing it stops the old one |
| BILL-17 | store only a hash of the connector key and never log it | Must | A scan of the database and logs finds no readable key |
| BILL-18 | stop a Your-own-AI agent step when the connector is off, and tell the user | Must | The step fails with a message naming the problem and counts no usage |
| BILL-19 | never use JobsQ's own AI for a Your-own-AI user | Must | With the connector off, the agents are off, not working on our AI |

## 8. Screens and emails

| Screen | Content |
|---|---|
| Plans | Two cards (JobsQ AI, Your own AI) with price, limits and a "Choose" button; for Your own AI, a line saying the AI runs on the user's own subscription and their computer must be on; a line stating there is no free plan; the refund terms if adopted |
| Returning from checkout | "Confirming your payment…" then "You're in" with a button to connect a channel |
| Billing | Current plan, renewal or end date, usage summary, change plan, cancel or undo, payment history; for Your own AI, whether the connector is running |
| Banners | Payment failed (with "Update payment"); subscription ending on a date; suspended |

| Email | Sent when |
|---|---|
| Receipt | Each successful payment (the provider's own receipt may cover this) |
| Payment failed | A renewal fails; again 1 day before the grace period ends |
| Subscription ending | A cancel is confirmed |
| Subscription ended | Access has dropped to limited |
| Refund issued | A refund is processed |

## 9. Data and API

Tables: `plans`, `plan_prices`, `billing_customers`, `subscriptions`, `payments`, `billing_events` ([BACKEND.md §8.4](../BACKEND.md#84-billing-and-usage)).

Routes: `/v1/plans`, `/v1/billing/*`, `/webhooks/stripe`, `/webhooks/razorpay`, and the admin refund, cancel and extend routes ([BACKEND.md §9.3](../BACKEND.md#93-billing), [§9.9](../BACKEND.md#99-admin)).

## 10. Edge cases

| Case | Behaviour |
|---|---|
| Checkout abandoned | Status stays `incomplete`; the user returns to the plans screen with their details kept |
| Webhook arrives before the user returns | Normal: the return page finds access already on |
| Webhook delayed by minutes | "Confirming your payment…" keeps polling; the reconcile job is the last resort |
| Paid in two tabs | BILL-05 |
| Renewal fails while a job is mid-step | The step finishes (access is `full` during grace) |
| Grace ends while a job waits for approval | The approval stays; the chat reply explains and links to billing |
| Refund after heavy use | Allowed for a super admin; the guarantee's automatic path refuses and routes to support |
| Chargeback or dispute | Treated as a refund: access ends; an alert goes to the team |
| User asks to delete their account | No self-service button in V1. The user can cancel the subscription; the erasure request follows the procedure in [12](12-data-export-and-deletion.md#2a-erasure-on-request-at-launch-procedure): everything personal is erased, **payment invoices and receipts stay** (linked by user ID) as the tax law requires |
| Your-own-AI user closes the connector mid-job | The running step fails; the user is told and no usage is counted; the job waits |
| Suspended user's subscription renews | It renews normally. Whether a suspension should pause billing is an open question |
| Currency or price change for existing subscribers | Existing subscriptions keep their price until changed deliberately |

## 11. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | **Payment provider** and **currency** (both open; India is the launch market) | CEO, CTO |
| 2 | Prices for JobsQ AI and Your own AI | CEO |
| 3 | Grace period length (5 days proposed) | CEO |
| 4 | Money-back guarantee: yes or no, window, usage cap | CEO |
| 5 | Tax: GST invoices in India, sales tax elsewhere, who is merchant of record | CEO with an accountant |
| 6 | Does suspension pause billing or trigger a refund? | CEO |
| 7 | Are the plan names "JobsQ AI" and "Your own AI" final? | CEO |
| 8 | Your own AI: Anthropic and OpenAI approval, what JobsQ still charges for, Codex testing | CEO, CTO |
