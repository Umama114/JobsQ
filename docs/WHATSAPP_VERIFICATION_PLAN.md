# JobsQ — WhatsApp approval track (runs in parallel with the build)

> **What is built today** is in [CURRENT_BUILD.md](CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

Status: Draft v0.1 (2026-11-16). Dates assume the 8-week cycle starts **Monday 16 November 2026**; shift every date by the same amount if the start moves.

Facts about Meta's rules were read from Meta's own pages on 2026-11-16 where possible. Each one is sourced in [section 13](#13-sources). Items marked **[verify]** come from third-party guides or from memory and must be confirmed in Meta's dashboards before they drive a decision.

---

## 1. Summary

"WhatsApp verification" is not one approval. It is **seven separate items**, and only some of them block launch. The build does not need any of them to start: the team develops against a local simulator and Meta's free test number from day 1.

Two questions must be answered in week 1 because everything else depends on them:

| Gate | Question | Why it comes first | Decide by |
|---|---|---|---|
| **Gate 0** | Does Meta allow a product like JobsQ on WhatsApp at all? | Meta's terms prohibit "AI Providers" on WhatsApp when AI is the main thing offered. JobsQ is in a grey area ([section 2](#2-gate-0-is-jobsq-allowed-on-whatsapp)). **Status 17 Nov 2026:** Meta's developer assistant said the use is permitted; Meta gives no binding written confirmation ([section 2.4](#24-answer-received-17-november-2026)). Proposed: accept the remaining risk and build. **18 Nov 2026:** a second answer from Meta AI in WhatsApp points the same way ([evidence](evidence/META_AI_IN_WHATSAPP_2026-11-18.md)); the team has decided to go ahead with the WhatsApp build | Decision record by Fri 4 Dec (end of week 3) |
| **Gate 1** | Which legal entity applies, and do its documents exist today? | Business verification needs registration documents whose name and address match the website. | Wed 18 Nov |

**Recommendation:** start every item in week 1 and build so that **Discord can carry the launch alone**. The Gate 0 question was put to Meta's developer assistant on 17 Nov 2026 and answered "permitted", but Meta offers no pre-approval or written confirmation, so some risk stays. A second answer, from Meta AI in WhatsApp on 18 Nov 2026, points the same way ([evidence](evidence/META_AI_IN_WHATSAPP_2026-11-18.md)). The team has decided to go ahead with building the WhatsApp connection on that basis. WhatsApp joins the closed beta, and the account's quality rating is watched from the first day. Nothing in the build is wasted if Meta objects later, because both channels sit behind one adapter.

---

## 2. Gate 0: is JobsQ allowed on WhatsApp?

### 2.1 What the terms say

Meta's Terms for the WhatsApp Business Platform, section 4.7 (page last modified 23 September 2026):

- Providers and developers of AI or machine-learning technologies are prohibited from using the platform, directly or indirectly, when those technologies are **"the primary (rather than incidental or ancillary) functionality being made available for use"**.
- Meta decides what counts as primary **"in its sole discretion"**.
- The exception is a list of countries where Meta is legally required to allow it: Italy, Brazil, the EU and EEA countries, and Türkiye. **India and the United States are not on the list.**

The rule took effect on 15 January 2026 and was aimed at general-purpose assistants such as ChatGPT and Perplexity on WhatsApp. Third-party guides agree that a business using AI to serve its own customers (support, bookings, order updates) is still allowed.

### 2.2 Where JobsQ sits

| Points towards "allowed" | Points towards "prohibited" |
|---|---|
| JobsQ is a job-application service with paying customers who sign up on its own website | What the customer receives on WhatsApp is produced by AI agents; the AI is the service, not a side feature |
| The conversation is narrow: job search steps, approvals and documents | Meta's test is "primary functionality", not "general purpose"; it does not exempt narrow AI products |
| The agents refuse anything unrelated to job hunting | The mock interview (stretch) is open-ended conversation with an AI |

**Nobody outside Meta can say how this will be ruled.** The terms give Meta sole discretion, and none of the sources I read covers a paid, single-purpose AI service. This is why it is a gate and not an assumption.

### 2.3 What to do

1. **Ask Meta in writing in week 1.** Where to ask: Meta developer support (from the [WhatsApp Business Platform support page](https://developers.facebook.com/documentation/business-messaging/whatsapp/support)); Business Support Home in Meta Business Suite (Direct Support at business.facebook.com/direct-support, not available to every business); and one Meta business partner (a "Business Solution Provider" such as 360dialog, Twilio or Gupshup), since partners have account managers who can get an answer. Meta's developer assistant can also be asked, but it is an AI assistant and not a policy decision. Send this description, which **does not name the product**:

   > We run a subscription job-application service. Customers register and pay for a plan on our website. They never pay or sign up inside WhatsApp.
   >
   > After subscribing, a customer connects their own WhatsApp number to their account. In that chat, we send them: a shortlist of open jobs that match the preferences they set on our website; a tailored one-page version of their own resume for a job they choose; and draft referral emails and LinkedIn notes for people at that company.
   >
   > The conversation is limited to these steps. Customers answer with buttons (Approve, Change, Skip, Sent) and every step needs the customer's approval. We never contact employers or other people on the customer's behalf. The customer sends everything personally.
   >
   > Our software controls every step of the conversation: the flow, the buttons, the approvals and what is sent. AI models are used inside those fixed steps to draft text, specifically job summaries, tailored versions of the customer's own resume, and draft referral messages. We do not offer an open-ended or general-purpose AI assistant, and requests unrelated to the customer's job applications are declined. AI is a tool inside our job-application service, not the product we sell.
   >
   > WhatsApp is only the delivery and approval channel for this service. We message only customers who have opted in on our website and started the chat themselves. We honour STOP immediately, and we do not use WhatsApp conversations to train AI models.
   >
   > Question: Is this use permitted under section 4.7 of the Meta Terms for the WhatsApp Business Platform, for customers in India and the United States?

   Tell Meta the truth about the AI. Describing the service as something else risks a misrepresentation finding, which is worse than a "no". The product name is given only where a form asks for the display name or website.

2. **Keep the answer.** A written reply goes into the decision log (template A2).
3. **Decide by Fri 4 Dec:**
   - Yes, or "permitted as described" (the 17 Nov answer, see 2.4) → WhatsApp is in the closed beta, with the account watched from day one.
   - No → launch on Discord and the web app; revisit WhatsApp with the reply in hand. A backup channel (Telegram) fits the same adapter if the team wants a second mobile channel.
   - No answer → Meta does not give pre-approval, so this is the case now: the decision is whether to accept the risk (proposed: yes, with the Discord fallback).
4. **Build these guardrails regardless.** They are already PRD rules, and they are what makes JobsQ look like a business service and not an assistant:
   - The subscription is sold and managed only on the website.
   - Every WhatsApp conversation is tied to the customer's own account and a job step.
   - Off-topic requests get a polite refusal and no model output.
   - The WhatsApp business profile describes a job-application service.
   - Opt-in is recorded on the website, and STOP is honoured immediately.
   - WhatsApp conversation data is never used to train a model (also required by the terms).

   None of these guarantees approval.

### 2.4 Answer received (17 November 2026)

The description in 2.3 was put to Meta's AI developer assistant, with a follow-up stating plainly that AI agents write the content. Record, to be replaced by screenshots in the decision log (template A2):

- **Reply to the first question:** permitted under the Meta Business Terms and the WhatsApp Business Messaging Policy, provided the user opts in on the website, starts the chat, keeps control of outgoing messages and STOP is honoured, and local labour, recruitment and consumer laws are followed in India and the United States.
- **Reply after the AI detail was added:** using AI within a strict, developer-controlled fixed workflow to draft job summaries, resumes and referral messages is permitted globally, including India and the United States, provided the AI works as an internal generation tool and not as an independent, open-ended assistant, and consent rules are met.
- **On written confirmation:** Meta has no manual pre-approval queue, no custom written confirmation and no pre-launch review for a proposed use case. Compliance is judged against the published policies.
- **Follow-up pointers from the assistant:** keep verifiable opt-in (business name and scope stated), send free-form messages only inside the 24-hour window and templates outside it, and watch the quality rating and policy compliance in Business Support Home after launch.

**What this means.** The reply is encouraging but it comes from an AI assistant and binds Meta to nothing. Gate 0 therefore becomes an **accepted risk**, for the CEO and CTO to confirm: build and run the closed beta on WhatsApp, keep the guardrails in 2.3, and keep Discord ready. Meta's published rule still gives it sole discretion, and enforcement can happen after launch.

### 2.4a Second answer: Meta AI in WhatsApp (recorded 18 November 2026)

The same facts, including the plain statement that AI agents write the content, were put to Meta AI inside WhatsApp. The full question and both replies are in [evidence/META_AI_IN_WHATSAPP_2026-11-18.md](evidence/META_AI_IN_WHATSAPP_2026-11-18.md). In short:

- **Permitted on the facts given.** A paid job-application service where AI drafts text inside fixed, customer-approved steps is the "incidental or ancillary" case that section 4.7 leaves allowed. India and the United States get the same answer. Neither is on the carve-out list, and none is needed.
- **No written pre-approval exists.** Meta AI says Meta has no advisory channel for section 4.7. Its review channels (Business Support Home "Request Review", template review) act after the fact.
- **The remaining risk is presentation and drift.** Do not market JobsQ as an AI assistant or AI coach. Do not let the bot answer unrelated requests. Get written no-training terms from any vendor or partner.
- **Suggested paper trail:** a Business Support case, an email to one partner, early template submission, and a short opinion letter from counsel. The draft text for the case and the partner is in the evidence file.

**Decision recorded on 18 Nov 2026:** the replies are **not** treated as pre-approval. Because of them, the team accepts the remaining risk and goes ahead with building the WhatsApp connection, while following Meta's guidelines and making sure the product has the best chance of approval (fixed workflow, no "AI assistant" wording, templates submitted early, STOP honoured). Both answers come from AI assistants and bind Meta to nothing, so the CEO and CTO confirmation (task 12, Fri 4 Dec) stays in the plan. **Both WhatsApp and Discord are channel options for users, and the web app works either way.**

### 2.5 What is at stake if this is skipped

Launching without an answer risks Meta disabling the number while paying customers depend on it. Users cannot switch channel (decided 18 Nov 2026), but the web app does everything the chat does, so a WhatsApp user keeps working there; support can move a user to Discord as a one-off exception. It is still a bad first month. Asking costs one message.

---

## 3. Gate 1: which legal entity

Business verification checks a real, registered business. Meta compares four things, and they must match **exactly**:

1. The legal name, address and phone number in Meta Business Suite → Business Info.
2. The same details shown on a live website with SSL.
3. A business email address on the same domain as that website (a Gmail address fails).
4. Documents: one proving the legal name (certificate of incorporation, tax registration, business licence) and one proving address or phone (utility bill or bank statement in the business name).

Two points specific to JobsQ:

- **The company OKRs list "Registration complete by Dec 31".** If that means TrunkQ's legal registration is still in progress, verification cannot be *submitted* until the certificate exists. Everything else in this plan can still start now, and WhatsApp can run a closed beta unverified ([section 8](#8-what-unverified-means-in-practice)). If another registered entity is available today (for example a founder's existing company), using it gets verification done sooner but ties the WhatsApp account to that entity. That trade-off is the CEO's decision.
- **The brand is JobsQ; the legal entity is TrunkQ.** Meta accepts a display name that differs from the legal name only when the relationship is visible. Put a line such as "JobsQ is a product of TrunkQ [legal suffix]" in the website footer and on the contact page.

Accepted documents differ by country. The upload dialog in Security Centre lists the ones Meta accepts for the selected country **[verify there]**. Typical examples: India — certificate of incorporation, GST certificate, Udyam registration; United States — IRS EIN confirmation letter, articles of incorporation.

---

## 4. What "WhatsApp verification" is made of

| # | Item | What it is | Needed for | Typical wait | Depends on |
|---|---|---|---|---|---|
| 1 | Meta business portfolio | The company's account in Meta Business Suite, with Business Info filled in | Everything | Minutes | Gate 1 decision |
| 2 | Developer app + WhatsApp product | Gives the test number, API access and the webhook settings | Development from day 1 | Minutes | Item 1 |
| 3 | WhatsApp Business Account + production phone number | The number users will chat with | Internal test and launch | Minutes to a day | A phone number never used on WhatsApp |
| 4 | Display name review | Meta approves the name "JobsQ" for the number | Launch | Reviewed automatically; Meta gives no duration | Item 3, website showing the brand |
| 5 | Payment method on the account | A card for message charges | Launch. Without it, free-form replies stop after the first 1,000 a month per number | Minutes | CEO |
| 6 | **Business verification** | The document check in [section 3](#3-gate-1-which-legal-entity) | Raising the limit on messages outside the 24-hour window from 250 to 2,000 users a day; trust | Up to 14 business days (provider estimate) | Gate 1, website, domain email |
| 7 | Message templates | Pre-approved wording for messages sent outside the 24-hour window | Only for notifications after a long silence | Up to 24 hours | Item 3 |

Not needed: the green "official business" badge (a separate, optional application) and Meta's App Review, which applies to companies that manage WhatsApp accounts for *other* businesses **[verify for our own-account use]**.

**Launch-critical: items 1 to 5 and Gate 0.** Item 6 is needed for scale, not for the closed beta. Item 7 is needed for the timed prompts ("Did you apply?", "Did you get a reply?") **when the 24-hour window is closed and the product owner decides to deliver them to the chat by template** (open, PRD question 33; the web app always shows them), for the stretch features (follow-up drafts, daily digest) and for one edge case in V1.

---

## 5. Prerequisite checklist

- [ ] Gate 1 decided: legal entity named, documents in hand or expected date known
- [ ] Domain bought; website live over HTTPS showing legal name, address, phone, and the JobsQ-to-entity relationship
- [ ] Privacy policy, terms and refund policy pages published (also required by the payment provider, Google sign-in and Discord)
- [ ] Business email on the same domain as the website
- [ ] Meta business portfolio owned by an authorised representative of the company, with **two** admins, each with two-factor authentication on
- [ ] A phone number that is not registered on any WhatsApp account (consumer or Business app), can receive an SMS or a voice call, and that the company will keep
- [ ] A card for the WhatsApp account's payment method
- [ ] Logo (square), one-line business description, support email for the WhatsApp business profile
- [ ] A secret manager ready for the access token, app secret and the number's two-step PIN

---

## 6. Two tracks, week by week

| Week | Dates | Build track | WhatsApp track | Other long-lead items |
|---|---|---|---|---|
| 1 | 16–22 Nov | PRD sign-off; engineering requirements and design review; repo, CI, environments; channel simulators | Gate 1 decision. Business portfolio, developer app, test number working. **Gate 0 question sent.** Phone number chosen | Domain and email; legal pages drafted; payment provider account opened; Discord app created and its direct-message behaviour tested; Claude API organisation and spend limits |
| 2 | 23–29 Nov | Registration with password, resume reading, plans (JobsQ AI and Your own AI) and checkout (test mode); inbound pipeline; adapters echoing messages | Website checks done. WhatsApp account created, number registered, display name submitted, payment method added. **Verification submitted** if documents exist | Payment provider identity checks (provider open); Google sign-in brand verification only if Google sign-in is chosen; email domain authenticated |
| 3 | 30 Nov–6 Dec | Channel choose and connect (no switching); web workspace; conversation engine; resume upload; Scout | System-user token in the secret manager; production webhook pointed at staging; templates submitted. **Gate 0 decision, Fri 4 Dec** | Job-search and email-lookup provider terms confirmed |
| 4 | 7–13 Dec | Researcher and approval; Resume Tailor, checker and PDF | Verification follow-up; template approvals checked | — |
| 5 | 14–20 Dec | Email and LinkedIn agents; tracker; usage limits; dashboard | Internal test on the real number with team phones; quality rating and limit alerts set | Legal review of policies finished |
| 6 | 21–27 Dec | Admin console; export and the erasure procedure; billing edge cases; agent evals pass | Verification expected to be complete if submitted in week 2 | — |
| 7 | 28 Dec–3 Jan | Hardening, load test, security review, internal dogfood; stretch items start | If registration was pending: **submit verification the day the certificate arrives** | Payment provider live mode |
| 8 | 4–10 Jan | Closed-beta preparation, release checklist, stretch items finish | **Go / no-go for WhatsApp in the closed beta, Mon 4 Jan** | — |

The build track is a summary; the task plan (template C9) will replace it once the design is approved. Six agents, two channels, billing, a dashboard and an admin console in eight weeks for two people is tight. The scope rule in the PRD (must-haves first, stretch only if it can be finished) is what keeps it honest.

---

## 7. Task sheet (TRA-TRS, template A10)

**Project:** JobsQ WhatsApp approval track · **Sheet owner:** [TBD] · **Linked:** PRD open question 14

Names are proposals so that every row has an owner and a different reviewer, as the framework requires. Confirm or replace them.

| # | Task (what) | Responsible (who, proposed) | Action steps (how) | Timeline (when) | Reviewer | Supporter | Status |
|---|---|---|---|---|---|---|---|
| 1 | Decide the legal entity and list its documents | Abdul Kabeer | Confirm registration status; choose entity; gather name proof and address proof | Wed 18 Nov | Abdul Muqtadir | — | Not started |
| 2 | Send the Gate 0 question to Meta and to one partner | Abdul Ahad | Use the text in section 2.3 (no product name); open a developer-support or Business Support case; email one partner's sales contact; log the case numbers; save the assistant's replies (section 2.4) | Thu 19 Nov | Abdul Kabeer | Abdul Muqtadir | Meta's developer assistant answered 17 Nov and Meta AI in WhatsApp on 18 Nov ([evidence](evidence/META_AI_IN_WHATSAPP_2026-11-18.md)); support case and partner email not sent |
| 3 | Create the business portfolio and fill in Business Info | Abdul Kabeer | Business Suite → Settings → Business Info; add a second admin; turn on two-factor authentication for both | Tue 17 Nov | Abdul Muqtadir | Abdul Ahad | Not started |
| 4 | Create the developer app and get the test number working | Abdul Ahad | Create a Business-type app; add the WhatsApp product; send and receive one message through the test number; record ids in the secret manager | Wed 18 Nov | Abdul Muqtadir | Zuhair | Not started |
| 5 | Choose and secure the production phone number | Abdul Kabeer | Buy or assign a number never used on WhatsApp; confirm it receives SMS or voice | Fri 20 Nov | Abdul Muqtadir | — | Not started |
| 6 | Publish website details and legal pages | [TBD] | Footer with legal name, address, phone and the JobsQ relationship; privacy, terms and refund pages; HTTPS; domain email | Mon 23 Nov | Abdul Kabeer | Abdul Ahad | Not started |
| 7 | Create the WhatsApp account, register the number, submit the display name | Abdul Ahad | WhatsApp Manager → add number → verify by SMS or call → set display name "JobsQ" → fill in the business profile → set and store the two-step PIN | Tue 24 Nov | Abdul Muqtadir | Abdul Kabeer | Not started |
| 8 | Add the payment method | Abdul Kabeer | WhatsApp Manager → payment settings → add card | Tue 24 Nov | Abdul Muqtadir | — | Not started |
| 9 | Submit business verification | Abdul Kabeer | Security Centre → Start verification → confirm details → confirm by domain or email code → upload both documents | Wed 25 Nov, or the day the certificate arrives | Abdul Muqtadir | Abdul Ahad | Blocked on task 1 |
| 10 | Create the system-user token and connect the webhook | Abdul Ahad | Create a system user; grant the WhatsApp permissions; generate a non-expiring token; store it; subscribe the app to the account; point the webhook at staging | Wed 2 Dec | Abdul Muqtadir | Zuhair | Not started |
| 11 | Write and submit the templates | Abdul Ahad | Section 9 wording; submit; note the category Meta assigns | Fri 4 Dec | Abdul Muqtadir | — | Not started |
| 12 | Record the Gate 0 decision (accept the risk, or not) | Abdul Kabeer | Decision record (A2): Meta's replies including the 17 Nov and 18 Nov assistant answers, the choice, who needs to know. Also decide whether to ask counsel for a section 4.7 opinion letter | Fri 4 Dec | Abdul Muqtadir | Abdul Ahad | Team decided to build on 18 Nov; CEO and CTO confirmation not yet recorded |
| 13 | Internal test on the production number | Zuhair | Each team member connects their own number and runs one job end to end; file bugs | Fri 18 Dec | Abdul Ahad | — | Not started |
| 14 | Set monitoring for limit and quality rating | Abdul Ahad | Hourly health check job; alerts on rating drop, limit change, template status change | Fri 18 Dec | Abdul Muqtadir | — | Not started |
| 15 | Go / no-go for WhatsApp in the closed beta | Abdul Muqtadir | Review Gate 0, items 1 to 5, test results, cost per user | Mon 4 Jan | Abdul Kabeer | Abdul Ahad | Not started |

Status key: not started · in progress · blocked · done.

---

## 8. What "unverified" means in practice

Unverified does not mean "cannot launch". From Meta's messaging-limits page:

- A new business portfolio may message **250 unique users per moving 24 hours outside a customer-service window**. That is the limit on messages we start, which need a template.
- The page describes the limit as applying outside the window. Replies inside the 24 hours after a user writes to us are therefore not counted against it (my reading of the wording, not an explicit statement).
- The limit rises to 2,000 by any one of: business verification; verification by a partner that onboarded us; or 2,000 delivered, good-quality messages to unique users in 30 days. Meta then checks quality before approving.
- Above 2,000 it scales automatically (10,000, then 100,000, then unlimited) when quality is good and at least half the limit was used in the last 7 days. Limits are shared by all numbers in the portfolio.

For JobsQ this means:

- **Closed beta works unverified.** Users always write first (the connect flow makes them send the first message), and agent results come back within minutes, inside the window.
- **Verification matters once we message first at scale:** the timed prompts (Must) if they are sent by template, and the follow-up drafts and daily digest (stretch).

Cost, from Meta's pricing page: since 1 October 2026 free-form replies are free only for the first **1,000 per business phone number per month**, then charged per delivered message. Utility templates are charged even inside the window. A payment method must be on the account or delivery stops after the free allowance. The exact rates and a per-user estimate are in [section 14](#14-prices-and-limits-read-from-meta-on-2026-11-17).

---

## 9. Templates to submit

Wording is deliberately plain and transactional. Meta assigns the final category and can move a template from utility to marketing, which costs more.

| Name | Intended category | Body | Buttons | Needed for |
|---|---|---|---|---|
| `jobsq_update_ready` | Utility | "Your {{1}} for {{2}} is ready." | Quick reply: "Show me" | V1 edge case: a result that finished after the 24-hour window closed |
| `jobsq_prompt_due` | Utility, at risk of being classed as marketing | "You have {{1}} job update(s) waiting." | "Show me", "Later" | The timed prompts when the window is closed (only if decided; PRD question 33) |
| `jobsq_followups_due` | Utility | "{{1}} follow-ups are due for your outreach." | "Draft them", "Later" | Stretch: follow-up reminders |
| `jobsq_daily_digest` | Utility, likely to be classed as marketing | "{{1}} new jobs match your profile today." | "Show me", "Pause" | Stretch: daily digest |

Billing notices (payment failed, subscription ending) go by **email**, not WhatsApp templates. That avoids per-message cost and keeps the WhatsApp number's quality rating away from messages users may dislike.

---

## 10. How the build proceeds without waiting

| Need | Available from | Notes |
|---|---|---|
| Local **simulator** for WhatsApp and Discord | Week 1 | A small tool that posts fake webhooks to the API and displays what the sender would have sent. All automated tests run against it. No Meta account needed |
| Meta **test number** | Week 1, task 4 | Free. Sends only to a short list of phone numbers you register **[verify the current cap]** |
| Production number, unverified | Week 2 | Good for the team and the closed beta |
| Production number, verified | Week 6 at the earliest | Needed for scale |

The channel adapter is the same code in all four cases; only credentials change.

---

## 11. Risks and fallbacks

| Risk | Effect | Fallback |
|---|---|---|
| Meta restricts or disables the account later, despite the 17 and 18 Nov answers (which are not binding), or its answer changes | WhatsApp users lose their channel | Users keep working in the web app, which does everything the chat does; support can move a user to Discord as an exception. Keep the WhatsApp adapter behind a flag. Consider Telegram as the mobile channel. Appeal through Business Support Home |
| Company registration is not complete in time | Verification cannot be submitted | Run the closed beta unverified; submit the day the certificate arrives |
| Verification rejected | Limit stays at 250 | Read the rejection email, fix the mismatch (it is almost always name, address or email domain), resubmit. Partner-led verification is the alternative path |
| Display name rejected | The number cannot go live under "JobsQ" | Make the brand-to-entity relationship more visible on the website; resubmit |
| Template rejected or re-classed as marketing | Stretch features cost more or wait | Reword more plainly; the V1 core does not depend on templates |
| Quality rating drops (users block or report us) | Limit lowered, number flagged | Only message users who opted in; cap reminders; make STOP and "Pause" one tap |
| Number disabled after launch | WhatsApp users cut off | Tell them by email; they keep working in the web app, and support can move them to Discord as an exception |
| WhatsApp message charges higher than modelled | Margin | Fewer, fuller messages; a typing indicator in place of "working on it" texts; measure cost per user from the first test |

---

## 12. Other long-lead items to start in week 1

These have the same shape as WhatsApp: someone outside the team has to approve something, and it takes days.

| Item | Why it takes time | Blocks |
|---|---|---|
| Payment provider account (Stripe, Razorpay or both) | Identity and business checks; needs the legal entity, a bank account and the legal pages | Taking real payments |
| Google sign-in (only if offered; open) | Brand verification of the consent screen (name, logo, domain, privacy policy) | Public launch without Google's "unverified app" warning |
| Email sending domain | SPF, DKIM and DMARC records; reputation builds over days | Sign-in codes reaching inboxes |
| Discord application | Privacy policy and terms links; one test to confirm whether the bot may message a user first | Discord connect flow design |
| Claude API organisation | Spend limits and rate limits grow with usage history | Load test and launch capacity |
| Job-search and email-lookup providers | Commercial-use and data-storage terms must be read and, where needed, agreed | Scout and Researcher in production |
| Legal review | Privacy policy, terms, refund policy for each launch market | All of the above |

---

## 13. Sources

- [Meta Terms for WhatsApp Business Platform](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform) — section 4.7, AI Providers; last modified 23 September 2026
- [Meta: pricing policy for AI Providers](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers) — the country list and dates
- [Meta: pricing on the WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) — the 1,000 free replies and the 1 October 2026 change
- [Meta: messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) — 250, 2,000 and the scaling paths
- [360dialog: Meta business verification](https://docs.360dialog.com/docs/resources/meta-business-verification/standard-business-verification) — steps, matching rules, the 14-business-day estimate (a partner's guide, not Meta's own page)
- [respond.io: WhatsApp's 2026 AI policy explained](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban) — interpretation of the AI rule (third party)

---

## 14. Prices and limits read from Meta on 2026-11-17

Read from Meta's [pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) and from the rate-card files it links to. Fetch tools hide those links, so the page was opened in a browser and the files were read directly. They are Excel sheets, not CSV, headed "effective October 1, 2026". The limits come from Meta's pages on [messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits), [throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput), [phone numbers](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers), [templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) and [getting started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).

### 14.1 Price per delivered message

| Market | Currency | Marketing | Utility | Authentication | Service |
|---|---|---|---|---|---|
| India | INR | 0.8631 | 0.115 | 0.115 | 0.115 |
| India | USD | 0.0118 | 0.0014 | 0.0014 | 0.0014 |
| North America (US and Canada) | INR | 1.8313 | 0.2491 | 0.2491 | 0.2491 |
| North America (US and Canada) | USD | 0.025 | 0.0034 | 0.0034 | 0.0034 |

JobsQ does not use authentication-international messages (India: ₹2.4971 or $0.0304 each).

Rules that decide our bill:

- A message is charged only when **delivered**. Messages from users are free.
- The first **1,000 service messages per business phone number per month** are free. The allowance does not roll over, and it is per number, not per user.
- Utility templates are charged at the utility rate even inside the 24-hour window (since 1 October 2026).
- In India, **service, utility and authentication all cost ₹0.115**. Only marketing costs more, about 7.5 times as much. A provider blog's figure of ₹0.145 for service messages is not on Meta's card.
- Messages inside a free entry point window (the user came from a click-to-WhatsApp ad) are free for up to 7 days. JobsQ does not run those ads.
- Volume discounts apply to utility and authentication only, and marketing has none. They do not matter at our volume.
- A payment method must be on the account (Meta's Billing Hub). Without one, service messages stop being delivered once the free 1,000 are used.
- **The billing currency is chosen when the WhatsApp account is created and cannot be changed.** Decide it before creating the account, together with the launch market.
- GST for Indian customers is not in Meta's cards. Third-party sources say 18% is added; confirm in Billing Hub.
- The two cards imply about ₹73 per dollar (a figure I derived from the cards, not stated by Meta). At a market rate above that, billing in INR is cheaper than billing in USD.

### 14.2 What it costs JobsQ (estimate)

The current, fuller version of this section (per message type, per user, per month, limits) is [WHATSAPP_PRICING.md](WHATSAPP_PRICING.md). This table uses 250 messages per user; the pricing file uses 250 to 500.

Assumption: **250 delivered messages a month per user** (about 12 per application, 15 applications, plus shortlists and replies). It is an estimate from the message catalogue in [features/05](features/05-whatsapp-channel.md), not a measurement. All of them are service messages, apart from the occasional template.

| Users | Messages a month | Charged (after 1,000 free) | India, INR card | India, USD card | United States, USD card |
|---|---|---|---|---|---|
| 100 | 25,000 | 24,000 | ₹2,760 | $34 | $82 |
| 1,000 | 250,000 | 249,000 | ₹28,635 | $349 | $847 |
| 10,000 | 2,500,000 | 2,499,000 | ₹287,385 | $3,499 | $8,497 |

That is about ₹29 or $0.35 per user a month in India and $0.85 in the United States, before GST and any provider fee. Model usage is roughly $7 to $12 per user, so WhatsApp is a small part of the bill in India.

**Watch the daily digest.** If Meta classes `jobsq_daily_digest` as marketing, 30 digests a month cost about ₹26 per user, about as much as all the other messages together. As utility it costs about ₹3.45.

### 14.3 Limits

| Limit | Value |
|---|---|
| Messaging limit: unique users we may start a conversation with outside the 24-hour window, per moving 24 hours, shared by every number in the business portfolio | 250 at the start, then 2,000, 10,000, 100,000, unlimited |
| Reaching 2,000 | Verify the business, or have a partner that onboarded us verify it, or send 2,000 delivered high-quality template messages to unique users within a moving 30 days. Meta then checks quality and approves or declines |
| Above 2,000 | Automatic, when quality is good and at least half the limit was used in the last 7 days. The limit rises one level within 6 hours |
| Replies inside the 24-hour window | Not counted against the limit. This is my reading of Meta's wording ("outside of a customer service window") |
| Registered phone numbers | 2 until verified. 20 after verification or after reaching a 2,000 limit |
| Throughput | 80 messages per second per number, inbound and outbound together. Automatic rise to 1,000 for very large senders. At 10,000 users our average is about 1 message per second |
| Templates | 250 per WhatsApp account until verified. 6,000 once verified and a number has an approved display name. At most 100 created per hour. Review takes up to 24 hours. Categories: authentication, marketing, utility |
| Display name | Required at registration and reviewed automatically. 10 changes per 30 days. After approval the number must be registered again within 14 days |
| Phone number rules | Owned by us. Country and area code (no short codes). Able to receive an SMS or voice call. Not already on WhatsApp (delete the account first). A two-step PIN is set at registration |
| Test number | Created automatically. How many recipients it can message was not on the pages read **[verify]** |

### 14.4 Direct, or through a partner

| | Direct to Meta's Cloud API (our plan) | Through a Business Solution Provider |
|---|---|---|
| Who hosts the API | Meta | The provider, between us and Meta |
| What we pay | Meta's per-message price. Meta's pricing page lists no monthly fee | Meta's price plus the provider's fee: a monthly plan, a per-message markup, or both |
| Set-up | We do every step in 14.5 | The provider guides onboarding and can run business verification for us. Meta counts partner verification toward the 2,000 limit |
| Control | Full | Limited to what the provider's product allows |

Provider prices from comparison and vendor pages, **not verified**: Twilio about $0.005 per message on top of Meta's fee; 360dialog about €49 per number per month; AiSensy plans from about $49 a month; Interakt about $99 a month; Gupshup's figures conflict between sources. Sources: [quickreply.ai](https://www.quickreply.ai/whatsapp-api/whatsapp-api-providers), [go4whatsup](https://www.go4whatsup.com/compare/whatsapp-business-api-providers-2026/), [MyOperator](https://myoperator.com/blog/whatsapp-business-api-pricing-india-2026).

At 250 messages per user, a $0.005 markup is about $1.25 per user a month, more than three times Meta's own charge in India. Going direct is cheaper. A partner is worth it only if it gets us through verification or the policy question faster.

### 14.5 Steps to get access, direct

1. Create or confirm the Meta business portfolio, with two admins and two-factor authentication.
2. Create a Meta app with the "Connect with customers through WhatsApp" use case and link it to the portfolio.
3. In the app's API Setup, connect or create the WhatsApp account. Meta creates a test number. Send a first test message with the temporary token (it is not suitable for development).
4. Set up the webhook: our HTTPS address and a verify token. Subscribe to messages.
5. Create a system user with full control of the app and the WhatsApp account, and generate a token with `business_management`, `whatsapp_business_messaging` and `whatsapp_business_management`. Store it in the secret manager.
6. Choose the billing currency (it cannot be changed) and add a payment method in Billing Hub.
7. Register the production number: verify it by SMS or voice, set the two-step PIN, submit the display name.
8. Start business verification in Security Centre, as soon as the documents exist (section 3).
9. Create and submit the templates (section 9).
10. Point the production webhook at staging, then run the internal test (task 13).

Not found on the pages read: whether our own use needs Meta's App Review **[verify]**.
