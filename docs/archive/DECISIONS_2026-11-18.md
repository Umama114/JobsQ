# Decisions of 18 November 2026

Status: Draft v0.3. These are the product owner's answers to the planning questions (Q1–Q21) and the plan changes stated on 18 Nov 2026, in two messages (D1–D22 from the first, D23–D29 from the second, D30–D31 from the follow-up the same day). The CTO's and CEO's proposals are in [RECOMMENDATIONS_2026-11-18.md](RECOMMENDATIONS_2026-11-18.md). Where another document disagrees with this one, this one is newer. Every document in this folder has been updated to match.

## 1. Decided

| # | Topic | Decision |
|---|---|---|
| D1 | Launch market | **India first. Later the product scales globally** (D23). The date and the countries are open |
| D2 | Legal entity | Decided later. The closed beta can run on a test or unverified WhatsApp number |
| D3 | Meta's reply on WhatsApp (section 4.7) | The reply is **not** pre-approval. Because of it, the team **accepts the remaining risk** and goes ahead with building the WhatsApp connection, while following Meta's guidelines and designing and presenting JobsQ so that it has the best chance of approval. See [the evidence](../evidence/META_AI_IN_WHATSAPP_2026-11-18.md) |
| D4 | Channels | The user chooses **WhatsApp or Discord**. Both are in the plan. The choice is made once and **there is no switching** |
| D5 | Web app | The web app does **everything** the chat channel does (shortlists, approvals, drafts, tracker, prompts). It is a third adapter on the same engine. A user can use JobsQ through the web app alone |
| D6 | Mobile app | **Planned** after the web app. Platform and date open. The API is built so it can be added |
| D7 | Passwords | **JobsQ stores passwords** (hashed, never in plain text). Reset by email |
| D8 | Registration fields | Name, phone number, email (and the password). Nothing else, to keep it short |
| D9 | Details and preferences | **Not** collected at registration. How they are collected is open |
| D10 | Resume at registration | Uploaded before payment, read with **pdfplumber** (PDF) and **python-docx** (Word) as a pre-payment step in the web app, shown for the user to confirm. **No AI call before payment** (rules-based reading; the AI parse runs after payment). With a Python backend this is one small route that stores nothing until payment ([recommendation](RECOMMENDATIONS_2026-11-18.md#1-can-the-resume-be-read-before-payment-with-no-ai-cost-yes)) |
| D11 | Resume formats | PDF and Word are both accepted as input. Scanned (image-only) files are refused in V1 |
| D12 | Plans | **Two plans.** (a) **Classic:** everything provided by JobsQ, including the AI cost. (b) **Cheaper:** the user enters their own AI key and pays the AI provider directly, so the AI cost goes to the user. Working names: Classic and Own key |
| D13 | Scale at launch | About **100 users** |
| D14 | Daily limit | A user applies to **5 or 10 jobs per day** (value open). The super admin can set it per user |
| D15 | Active jobs | The super admin can limit the number of active jobs per user. Active means applied, replied or at interview. The value is open |
| D16 | Scout | As recent as possible. Up to **10** jobs. **Reason only, no score** (a score invites arguing over 78 against 82; the reason is the useful part) |
| D17 | Researcher | Recruiters only when no engineer is found. A referral from someone on the team carries more weight. The list stays at 2 or 3 people |
| D18 | Approvals | Q11 was "from chat only for now". D5 supersedes it: approvals happen in the chosen channel and in the web app |
| D19 | Deleting | **No self-service delete function in V1.** It will be added later. D28 sets what is kept and what is erased on request; a manual erasure procedure at launch is proposed (open question 31) |
| D20 | Super admin powers | Limit applications per day; limit active jobs; and the other limits, including Interview Prep (open) |
| D21 | Tracker prompts | Two hours after the resume is approved: "Did you apply?" with **Yes / Not yet / No**. *No* closes the job as rejected. If not answered, ask again for **2 days** (working value) |
| D22 | Reply prompts | Four days after the user says Yes: "Did you get a reply? I can help you prepare for the interview." Repeated for the next **30 days** (working value). A **Not shortlisted** button marks the job rejected and stops the follow-ups |
| D23 | Launch and growth | **India first; global scaling later.** Build with that in mind: currency and tax per country, a country field on the user, text that can be translated, a WhatsApp number per country, hosting that can be added in another region. Nothing global is built in V1 |
| D24 | Production readiness | The plan must be **production ready for 100 to 1,000 users at once** (100 on launch day). Targets and tests are in [RECOMMENDATIONS §4](RECOMMENDATIONS_2026-11-18.md#4-production-readiness-100-to-1000-users-at-once) and PRD section 9a |
| D25 | One history | The web app and the chosen chat channel share **one history per user**. Follow-up prompts and approvals appear in both; the first answer wins. The edge cases are specified ([RECOMMENDATIONS §5](RECOMMENDATIONS_2026-11-18.md#5-same-history-on-the-web-and-in-the-chat)) |
| D26 | Tailored resume format | **PDF and Word both** are delivered for now. The user will be given the choice of format; how (a setting or per download) is open |
| D27 | Outreach wording | The LinkedIn message and the email to a referral are sent **in the chat with a copy button** (web: a real Copy button; WhatsApp and Discord: see the platform limits, [RECOMMENDATIONS §6](RECOMMENDATIONS_2026-11-18.md#6-outreach-text-with-a-copy-button)) so the user copies and pastes it. JobsQ still sends nothing |
| D28 | Data protection | **Kept** after a deletion request: the **activity log** and **payment invoices and receipts**, linked by **user ID**. **Everything else is deleted on request.** Checked against India's DPDP Act, 2023 (Act No. 22 of 2023) ss. 8(7) and 12, the DPDP Rules, 2025 r. 8 and the CGST Act, 2017 s. 36; **to be confirmed by Abdul Muqtadir** ([RECOMMENDATIONS §7](RECOMMENDATIONS_2026-11-18.md#7-data-protection-what-we-must-keep-and-what-must-be-deleted-on-request)) |
| D29 | Follow-up prompts | **Kept in V1 (Must).** Only their **limits** are open (D22's day counts are working values) |
| D30 | Stack | **Backend: Python 3.12 with FastAPI. Frontend: Next.js (React) with TypeScript.** Decided on 18 Nov 2026 as recommended. The mobile app (React Native with Expo) is recommended, not decided |
| D31 | Erasure time | **30 days** from a verified request. The product owner's reading: without a request JobsQ may keep user data for 30 days; applied to accounts that never paid. **The legal basis is to be confirmed by Abdul Muqtadir** (DPDP Act 2023 ss. 8(7) and 12; DPDP Rules 2025 r. 8; CGST Act 2017 s. 36; [references](RECOMMENDATIONS_2026-11-18.md#71-legal-references-where-anyone-can-find-them)) |

## 2. Left open on purpose

| # | Topic | Note |
|---|---|---|
| O1 | Currency | Open |
| O2 | Payment provider | Open. Razorpay is only a candidate |
| O3 | Prices for both plans | Open |
| O4 | Mobile platform | Backend and frontend are decided (D30). The mobile app: React Native (Expo) is recommended; platform and date are open ([RECOMMENDATIONS §3](RECOMMENDATIONS_2026-11-18.md#3-frontend-and-mobile-nextjs-with-typescript-and-react-native-later-recommended)) |
| O5 | Tailoring engine and model | Open (Q6) |
| O6 | Agent owners | Open (Q7) |
| O7 | Who designs the screens | Open (Q8). Likely Abdul Ahad, to be confirmed |
| O8 | **Daily limit value (5 or 10) and the active-jobs limit** | **Open and crucial.** Decided together with the model (O14), because the reason is cost. How many applications may be in process per user |
| O9 | How long a job may wait for approval | Open (Q10). Likely 5 to 10 days, not 30 |
| O10 | Resume size and page limits | Open (Q12). May depend on the user's experience. (The tailored resume is delivered as PDF and Word for now, D26; how the user chooses is open) |
| O11 | Interview Prep rules | Open (Q20). The super admin can set them |
| O12 | Follow-up limits | The prompts are kept (D29). The 2-day, 4-day and 30-day values are working values; how often a prompt repeats and the final limits are open |
| O13 | Preferences and details collection | Open |
| O14 | **AI model** | **Open and crucial.** Decided when the cost is reviewed, together with the daily limit (O8). Reason: cost |
| O15 | Own-key plan details | Which providers, what JobsQ still charges for, key storage |
| O16 | Email and LinkedIn wording (Q16) | Not answered; the proposal stands |
| O17 | **The user's LinkedIn ID** | Open: collect it or not, when, whether required, and how it is deleted. Not part of registration |
| O18 | Erasure at launch | Proposed: a written manual procedure run by the super admin from day one; self-service later (PRD question 31). Law references and the 30-day value: Abdul Muqtadir to confirm |
| O19 | Copy button on WhatsApp and Discord | The platform's real options are checked in the week-1 test; web has a real Copy button. Whether to spend a WhatsApp template message to deliver a prompt when the 24-hour window is closed is open (cost) |
| O20 | Capacity numbers | 1,000 subscribers and 200 simultaneous agent runs are working assumptions to confirm with beta data |

## 3. Points to watch

1. **"Frontend only" and Python libraries.** pdfplumber and python-docx are Python and do not run in a browser. Recommendation: a Python backend with one small route that reads the file in memory, stores nothing until payment, and costs no AI. The alternative is a browser-side tool. The CTO decides (PRD question 24).
2. **Deleting.** India's data-protection law gives users a right to erasure, with exceptions for data the law requires us to keep (logs, tax records). JobsQ now stores passwords, phone numbers and (on the cheaper plan) users' own AI keys. D28 sets the policy; counsel must confirm it, and the Rules' main duties are reported to start about May 2027. Legal review should happen before launch.
3. **Own-key plan.** The user's key must be stored encrypted, never logged, never shown again after entry, and never replaced by JobsQ's own key. Quality depends on the model behind the user's key, and the agents' tests (evals) must cover each allowed model.
4. **Meta wording.** The reply from Meta AI is recorded as evidence that informed the decision. It is not an approval, and JobsQ must not describe itself as an AI assistant or coach in its WhatsApp materials.
