# WhatsApp pricing

> **What is built today** is in [CURRENT_BUILD.md](CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

Status: Draft v0.1 (2026-11-17)

Meta's prices, read from its [pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) and rate cards (effective 1 October 2026), and what they mean for JobsQ. Only Meta's figures are marked as such. Anything marked **assumption** is ours and must be replaced by a measured number after the first internal test.

**Launch market: India (decided 18 Nov 2026).** The India rows are the planning basis. The US rows stay as a reference for a later market. The billing currency (INR or USD) is fixed when the WhatsApp account is created and is still to be chosen.

Related: [WHATSAPP_VERIFICATION_PLAN.md §14](WHATSAPP_VERIFICATION_PLAN.md#14-prices-and-limits-read-from-meta-on-2026-11-17) (limits and set-up steps) · [features/05-whatsapp-channel.md](features/05-whatsapp-channel.md) (messages and buttons).

## 1. How Meta charges

| Rule | Detail |
|---|---|
| Unit | **Per delivered message.** Conversation-based pricing is deprecated and was replaced on 1 July 2025 |
| Who pays for what | Messages from a user to us are free. Only messages from us to the user are charged |
| Charged when | Delivered. Messages that are sent but not delivered are not charged |
| Rate depends on | The message's **category** and the user's country. Not on length, buttons, tokens or file size |
| Free tier | **1,000 service messages per business phone number per month.** One shared pool for all users of that number. It resets monthly and does not roll over. Charging starts at the 1,001st |
| Payment method | Required. Without one, service messages stop being delivered after the free 1,000 |
| Billing currency | Chosen when the WhatsApp account is created and cannot be changed |
| Tax | Not on Meta's cards. Confirm in Billing Hub |
| Setup or monthly fee | None listed on the pricing page or the rate cards |

Meta's developer assistant described the old conversation-based model ("1,000 free service conversations"). That is out of date; the page above is the source.

## 2. Price per message (Meta's rate card)

| Market | Currency | Marketing | Utility | Authentication | Service |
|---|---|---|---|---|---|
| India | INR | 0.8631 | 0.115 | 0.115 | 0.115 |
| India | USD | 0.0118 | 0.0014 | 0.0014 | 0.0014 |
| US and Canada | INR | 1.8313 | 0.2491 | 0.2491 | 0.2491 |
| US and Canada | USD | 0.025 | 0.0034 | 0.0034 | 0.0034 |

Authentication-international (not used by JobsQ): India ₹2.4971 or $0.0304.

## 3. Which category each JobsQ message falls into

| JobsQ message | How it is sent | Category | Charged |
|---|---|---|---|
| Replies, shortlist, summaries, draft text, status updates | Free-form, inside the user's 24-hour window | Service | Yes, after the free 1,000 |
| Message with reply buttons or a list (Approve, Change, Pick a job) | Free-form, inside the window | Service | Yes, same price as text. Buttons add no cost |
| Tailored resume PDF with its caption | Free-form document, inside the window | Service | Yes, one message |
| Image (not in our plan) | Free-form, inside the window | Service | Yes, same as text. The page lists no media surcharge |
| Template with a "Show me" button, sent after the window closes (follow-ups, digest) | Template | Utility, if Meta accepts that category | Yes, from the first message, and not drawn from the free pool |
| A template Meta classes as marketing | Template | Marketing | Yes, 7.5 times the India utility rate |
| Message from the user | Any | None | No |

Utility templates are charged even inside an open window (since 1 October 2026). The category of a template is Meta's decision. **The daily digest is the one at risk of being classed as marketing.**

## 4. Length limits

Price does not depend on length, but a message over a limit is split by our adapter and each part is charged as a message. These limits come from [features/05](features/05-whatsapp-channel.md) and are **[verify]** against Meta's pages.

| Part | Limit |
|---|---|
| Text message | 4,096 characters |
| Message with buttons, body | 1,024 characters |
| Reply buttons | Up to 3, label up to 20 characters |
| List | Up to 10 rows, title up to 24 characters, description up to 72 |
| Header and footer | 60 characters each |
| Document caption | 1,024 characters |
| Image and file size limits | Not read yet **[verify]** |

Drafts longer than the limits are sent as a link to the full draft on the web (one message) and not as several parts.

## 5. Cost per user per month

Basis: **250 to 500 messages we send per user per month, all service messages, all in the window.** This is a planning figure given by the product owner, not a measurement (**assumption**). Cost = messages × rate. The free pool is not subtracted here.

**Added 18 Nov 2026.** Two decisions add messages: each outreach draft is sent as its own text-only message plus an optional "send as plain text" re-send (WhatsApp has no confirmed free-form copy button), and a prompt due while the 24-hour window is closed may need a template message if the product owner decides the chat should get it as well as the web app (open, PRD question 33). Because the web app does everything and shows the same history, some users will send and receive fewer WhatsApp messages than this planning figure. Measure from the first test.

| Market and currency | 250 messages | 375 (midpoint) | 500 messages |
|---|---|---|---|
| India, INR | ₹28.75 | ₹43.13 | ₹57.50 |
| India, USD | $0.35 | $0.53 | $0.70 |
| US and Canada, INR | ₹62.28 | ₹93.41 | ₹124.55 |
| US and Canada, USD | $0.85 | $1.28 | $1.70 |

If every message were marketing (not our case), India INR would be ₹215.78 for 250 messages and ₹431.55 for 500.

## 6. Monthly bill for all users, one business number

Formula: (users × messages per user − 1,000) × rate. Midpoint of 375 messages per user.

| Users | Messages sent | Charged | India, INR | India, USD | US and Canada, USD |
|---|---|---|---|---|---|
| 100 | 37,500 | 36,500 | ₹4,197.50 | $51.10 | $124.10 |
| 1,000 | 375,000 | 374,000 | ₹43,010 | $523.60 | $1,271.60 |

The free pool saves at most 1,000 × rate per number per month: ₹115, $1.40 (India) or $3.40 (US). Per user, the effective cost is ₹41.98 at 100 users and ₹43.01 at 1,000.

## 7. Not included

- GST or other tax.
- A partner (Business Solution Provider) fee. We plan to go direct; partner prices are unverified ([WHATSAPP_VERIFICATION_PLAN.md §14.4](WHATSAPP_VERIFICATION_PLAN.md#144-direct-or-through-a-partner)).
- Claude and search cost, which is much larger: [BACKEND.md §23](BACKEND.md#23-cost).
- Meta Business Agent (Meta's own AI product, charged per token): not used.

## 8. What to measure in the first internal test

1. Messages we send per user per month, by type.
2. How many templates Meta classes as utility and how many as marketing.
3. The real bill in Billing Hub, with tax, for the first month.
