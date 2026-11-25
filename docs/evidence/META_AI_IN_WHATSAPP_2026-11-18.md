# Evidence: Meta AI in WhatsApp on Section 4.7

Status: recorded 2026-11-18. Kept as part of the Gate 0 decision record ([WHATSAPP_VERIFICATION_PLAN.md §2.4a](../WHATSAPP_VERIFICATION_PLAN.md#24a-second-answer-meta-ai-in-whatsapp-recorded-18-november-2026)).

| | |
|---|---|
| Source | Meta AI, the assistant inside WhatsApp |
| Asked by | The JobsQ product team |
| Recorded | 18 November 2026 (the date is the date of recording; the chat itself carries no timestamp in what was pasted) |
| Question | Whether the JobsQ use is permitted under section 4.7 of the Meta Terms for the WhatsApp Business Platform, for customers in India and the United States |
| Answer | **Permitted on the facts given.** Meta decides "primary versus ancillary" in its sole discretion and offers no written pre-clearance |
| Binding on Meta | **No.** It is an AI assistant's reading of the published terms. It is evidence of due diligence, not an approval |
| Used for | **Not** as pre-approval. The team's decision (18 Nov 2026) is that, because of this reply, it **accepts the remaining risk and goes ahead with building the WhatsApp connection**, while following Meta's guidelines and designing and presenting JobsQ to give it the best chance of approval. Discord is the other channel option |

Two other things to know before relying on it:

1. The reply was given on the facts in the question. If the product drifts from those facts (open-ended chat, "AI assistant" marketing), the answer no longer applies.
2. The pasted text carried small reference codes at the end of some sentences (for example "bf35"). They are not part of Meta's wording and are removed below. Nothing else is changed. The next step is to replace this text with screenshots, as the plan asks (template A2).

---

## 1. What was asked (first message)

> lets say
> We run a subscription job-application service. Customers register and pay for a plan on our website. They never pay or sign up inside WhatsApp.
> After subscribing, a customer connects their own WhatsApp number to their account. In that chat, we send them:
> a shortlist of open jobs that match the preferences they set on our website,
> a tailored one-page version of their own resume for a job they choose,
> draft referral emails and LinkedIn notes for people at that company.
> The conversation is limited to these steps. Customers answer with buttons (Approve, Change, Skip, Sent) and every step needs the customer's approval. We never contact employers or other people on the customer's behalf. The customer sends everything personally.
> WhatsApp is only the delivery and approval channel for this service. It is not a general-purpose assistant. Requests unrelated to the customer's job applications are declined, and the service has no open-ended chat.
> We message only customers who have opted in on our website and started the chat themselves. We honour STOP immediately, and we do not use WhatsApp conversations to train AI models.
> Question: Is this use permitted under section 4.7 of the Meta Terms for the WhatsApp Business Platform, for customers in India and the United States?

## 2. Meta AI's first reply

> On the facts you describe, this looks *permitted under Section 4.7* - but with one important caveat: Meta decides this in its sole discretion, and it has not published rulings on individual products.
> This is not legal advice, but here is how Section 4.7 reads against your design:
>
> ### What Section 4.7 actually bans
> Section 4.7 - "AI Providers" - of the Meta Terms for the WhatsApp Business Platform (last modified 23 Sept 2026) says:
> > Providers and developers of AI / ML technologies, including LLMs, generative AI platforms, and general-purpose AI assistants, are "strictly prohibited" from using the Platform to provide / deliver / offer / sell those technologies *when such technologies are the primary (rather than incidental or ancillary) functionality being made available for use, as determined by Meta in its sole discretion.*
>
> The European Commission summarized the same test as: businesses may still use AI for "ancillary or support functions, such as automated customer support offered via WhatsApp."
> In other words, the test is *not* "do you use AI?" The test is *"is the AI itself what the customer is buying?"*
>
> ### Why your service falls on the ancillary side
> 1. *The product is the job-application service, not the AI.* Customers pay on your website for a subscription to a job-search workflow. WhatsApp is only delivery + approval. That matches the allowed pattern: "a shop, clinic or agency whose agent answers questions about its own products, orders and bookings uses AI as a supporting function."
> 2. *Narrow, closed workflow.* You limit the conversation to: shortlist -> tailored resume -> referral drafts. No open-ended chat, unrelated requests are declined. That is the opposite of a general-purpose "ask me anything" assistant, which is what Section 4.7 targets.
> 3. *Human-in-the-loop by design.* Every step needs Approve / Change / Skip / Sent, and you never contact employers or third parties. The customer sends everything personally. The AI is generating drafts _for_ your own customer about _their own_ job applications, not acting as an autonomous agent.
> 4. *No training on WhatsApp data.* Section 4.7 also separately prohibits letting WhatsApp Business Platform Data be used to "create, develop, train, or improve" AI models, except fine-tuning a model for your exclusive use. Your statement that you do not use WhatsApp conversations to train models directly satisfies that second part of 4.7.
> 5. *Opt-in + STOP.* You message only customers who opted in on your website and started the chat themselves, and honour STOP immediately. That satisfies the separate WhatsApp Business Messaging Policy, which is often where businesses actually get blocked.
>
> ### India vs United States - same answer
> India and the US are *not* in Meta's carve-out list for AI Providers (Italy, other EEA countries, Brazil, Türkiye).
> That carve-out doesn't help or hurt you here, because it only applies to companies whose _primary_ product _is_ a general-purpose AI assistant. Since your AI is ancillary, you don't need the carve-out. The analysis is the same for India and the US.
>
> ### What could push you over the line - avoid these
> Meta decides "primary vs ancillary" itself, so how you present it matters as much as how you build it:
> - *Don't market it as an AI assistant / AI coach / "your personal AI on WhatsApp."* Market it as "job-application service delivered on WhatsApp."
> - *Don't let the bot drift.* If users can get it to write essays, code, answer general questions, or do anything outside the 3 steps, Meta could reclassify it as general-purpose.
> - *Don't use business-initiated messages outside the rules.* After the 24-hour customer service window closes, you must use an approved template (Utility/Marketing) to re-engage, and you need opt-in for that. The 1,000 free service messages/month rule from 1 Oct 2026 also applies.
> - *Don't let a vendor train on your chats.* If you use an AI vendor / BSP, get in writing that they will not use your WhatsApp data to train/improve any model except a fine-tune for your exclusive use.
>
> *Bottom line:* A subscription job-application service that uses AI _inside_ a closed, customer-approved workflow, where the customer pays for the service not for access to an AI, is the classic example of "incidental or ancillary" use that Section 4.7 leaves allowed. The risk is not the technology, it's scope creep or marketing it as a general AI assistant.
> If you want, tell me your exact landing-page wording / WhatsApp greeting, and I can flag any phrasing that might make Meta read it as "primary AI."

## 3. What was asked next (second message)

> Thank you. For complete accuracy, I want to add a detail that matters for section 4.7 (AI Providers) of the Meta Terms for the WhatsApp Business Platform.
> Our service uses AI agents to write the content that customers receive. Our software controls every step of the conversation: the flow, the buttons, the approvals and what is sent. AI models are used inside those fixed steps to draft text, specifically job summaries, tailored versions of the customer's own resume, and draft referral messages. Customers approve each step and send everything personally. We do not offer an open-ended or general-purpose AI assistant, and requests unrelated to the customer's job applications are declined. AI is a tool inside our job-application service, not the product we sell. Customers sign up and pay on our website, not in WhatsApp.
> Given that the content is AI-generated within this fixed workflow:
> Is this use permitted under section 4.7 for customers in India and the United States?
> If a human policy team makes this decision, how can we get it confirmed in writing, and through which channel?

## 4. Meta AI's second reply

> Yes - this added detail *does not change the answer, it strengthens it.*
>
> Section 4.7 does not ban AI-generated content. It bans offering AI _as the product_ when AI is the *primary (rather than incidental or ancillary) functionality* being made available, as determined by Meta in its sole discretion.
>
> ### 1. Permitted for India and the US?
> *On these facts: yes, this is the ancillary-use case 4.7 leaves allowed.*
> - *What the customer buys:* A subscription job-application service, paid for on your website, not in WhatsApp. The AI is a tool _inside_ fixed steps of that service - drafting job summaries, tailored versions of the customer's own resume, and draft referral messages.
> - *What the customer does NOT get:* An open-ended or general-purpose assistant. Your software controls the flow, buttons, approvals, and what is sent. Unrelated requests are declined.
> - *Human control:* Every step needs customer approval, and the customer sends everything personally. You never contact employers or third parties on their behalf.
> - *No training:* You do not use WhatsApp conversations to train AI models. That matters because 4.7 also separately prohibits allowing WhatsApp Business Platform Data to be used to create / train / improve AI models, except fine-tuning a model for your exclusive use.
>
> Meta itself has said this distinction is the point: a travel company running a bot for customer service won't be barred, while a general-purpose chatbot where AI itself is the product will be.
>
> India and the US get the *same* answer. Neither is in Meta's carve-out list for AI Providers (Italy, other EEA countries, Brazil, Türkiye), but you don't need that carve-out because you are not an AI Provider offering AI as primary functionality.
>
> The one risk remains presentation: if you market it as "your AI assistant / AI coach on WhatsApp" rather than "job-application service delivered on WhatsApp," a reviewer could misread it as primary AI. Keep the fixed workflow, the decline for unrelated requests, and the approval buttons exactly as described.
>
> ### 2. Can you get this confirmed in writing by a human policy team?
> *Honest answer: Meta does not offer a pre-clearance / advisory-opinion channel for Section 4.7.*
>
> There is no public form to submit a use-case and get a binding "yes, this is permitted" letter before you launch. Meta's published review channels are *reactive*, not advisory:
> - *Business Support Home:* You file a `Request Review` _after_ a violation / restriction / template rejection. Decisions typically arrive in 24-48 hours via Business Manager and are marked `Unchanged` or `Reversed`.
> - *Template review:* You can submit your message templates in WhatsApp Manager and get a rejection / approval with a policy reason. That is the closest thing to a pre-launch signal, but it only approves that template text, not your whole 4.7 analysis.
>
> That means you cannot get a guaranteed written pre-approval from Meta before launch. What you _can_ do is create the strongest possible paper trail, so if a human reviewer ever looks at you, they see the same facts you just gave me:
>
> *Best practical path:*
>
> *1. Go through a Meta Business Partner / BSP, not direct Cloud API alone*
> A BSP / Solution Partner has a Meta partner manager channel and can escalate a policy question on your behalf. They cannot override Meta, but their escalation is read by a human team, unlike a generic support chat. Ask them in writing to log: "Customer requests confirmation that use is ancillary under 4.7."
>
> *2. Open a case in Business Support Home > Help*
> Use: Business Suite > All Tools > Business Support Home > Get Help / Contact Support. Select WhatsApp Business Platform > Policy / Terms question. Paste a short, factual use-case statement (see draft below) and ask for the response in writing in the ticket. Save the ticket ID and the full transcript. Even if the reply is generic, it is a contemporaneous record that you disclosed the use.
>
> *3. Submit your templates early*
> Submit the exact Utility templates you will use to re-engage customers outside the 24-hour window. Approved templates + low block/report rates are the strongest operational evidence of compliance.
>
> *4. Get a counsel opinion letter*
> For India + US, most companies in this position get an outside counsel memo applying 4.7 to these exact facts, and keep it with their opt-in records, STOP logs, and data-processing agreements with their AI vendor / BSP. That does not bind Meta, but it is what auditors, payment partners, and a BSP will ask for.
>
> *Draft to paste into a BSP / Support ticket:*
>
> > Subject: Request for policy guidance - Section 4.7 AI Providers
> >
> > We operate a paid subscription job-application service. Customers register and pay on our website, not in WhatsApp. After subscribing, they opt in on our website and initiate a WhatsApp chat.
> >
> > In WhatsApp, our software controls a fixed workflow with buttons (Approve / Change / Skip / Sent): (1) job shortlist matching website preferences, (2) tailored version of customer's own resume for a chosen job, (3) draft referral emails / LinkedIn notes. AI models draft text inside those fixed steps only. Every step requires customer approval. Customer sends all messages personally. We never contact employers/third parties. Unrelated requests are declined. No open-ended chat. No WhatsApp data used to train AI models. STOP honoured immediately.
> >
> > We believe AI is incidental/ancillary to our job-application service under Section 4.7, not the primary functionality. Please confirm in writing if Meta's policy team agrees, or advise what change would be required.
>
> If you want, I can turn that into a one-page 4.7 compliance brief you can send to a BSP / lawyer, with your exact flow, opt-in wording, and template texts.

---

## 5. What this evidence supports, and what it does not

| It supports | It does not give us |
|---|---|
| The reading that a fixed, developer-controlled, customer-approved workflow, sold on our own website, is "incidental or ancillary" under 4.7 | A decision by Meta. Meta decides "in its sole discretion", and enforcement can come after launch |
| The same answer for India and the United States | A written confirmation. Meta AI itself says none can be had before launch |
| A second, independent answer in the same direction as the 17 November developer-assistant reply ([plan §2.4](../WHATSAPP_VERIFICATION_PLAN.md#24-answer-received-17-november-2026)) | Protection if the product is presented as an AI assistant, or the bot drifts outside the fixed steps |

Both answers come from AI assistants. They are two readings of the same published terms, not two confirmations.

## 6. What we do with it

| # | Action | Source of the action |
|---|---|---|
| 1 | Go ahead with building the WhatsApp connection (adapter, webhook, templates, test number) as an accepted risk, following Meta's guidelines so the product has the best chance of approval. Discord is the other channel option, and the web app works in either case | The product team's decision, 18 Nov 2026 |
| 2 | Keep the guardrails in [plan §2.3](../WHATSAPP_VERIFICATION_PLAN.md#23-what-to-do) item 4: sold on the website only, narrow flow, off-topic refusal, business profile worded as a job-application service, opt-in recorded, STOP honoured, no training on WhatsApp data | Meta AI, "what could push you over the line" |
| 3 | Never describe JobsQ as an "AI assistant", "AI coach" or "your personal AI on WhatsApp" in the landing page, the WhatsApp profile, the welcome message or the templates | Meta AI, presentation risk |
| 4 | Get it in writing from every vendor and partner that WhatsApp data is not used to train models | Meta AI, point 4 |
| 5 | Submit the utility templates early (plan task 11) | Meta AI, step 3 |
| 6 | Open the Business Support case and write to one partner, using the draft above, and keep the ticket ids (plan task 2) | Meta AI, steps 1 and 2 |
| 7 | Ask a lawyer for a short opinion letter applying section 4.7 to these facts, and keep it with the opt-in and STOP records (**new**: not yet in the plan; owner and cost to be decided) | Meta AI, step 4 |
| 8 | Keep the CEO and CTO confirmation of the accepted risk, due Fri 4 Dec (plan task 12) | [PRD open question 17](../PRD.md) |
