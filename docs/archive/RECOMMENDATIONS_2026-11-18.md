# Recommendations of 18 November 2026

Status: proposals for the CTO (Abdul Muqtadir) and CEO (Abdul Kabeer). Nothing here is decided until they confirm, **except** the backend and frontend choices in sections 2 and 3, which the product owner decided on 18 Nov 2026 (decision D30). Decisions already taken are in [DECISIONS_2026-11-18.md](DECISIONS_2026-11-18.md). Figures are estimates, not measurements.

## 1. Can the resume be read before payment with no AI cost? Yes

**Answer.** Yes. Reading text out of a PDF or Word file is ordinary code, not AI. It costs nothing per call beyond a few milliseconds of server time. The plan already does this (decision D10).

**What "reading" means before payment.** A rules-based reading, in three steps:

1. **Extract the text** with pdfplumber (PDF) and python-docx (Word).
2. **Find the obvious parts by rules:** email and phone number (patterns), section headings such as Experience, Education, Skills (heading words), date ranges (patterns), and skills (a list of known tech terms).
3. **Show the user a preview** ("Here is what we found: name, contact, N roles, these skills, these sections") and a "Looks right" button. The user confirms that the file was **read correctly**, not that it was understood.

**What stays after payment.** The AI **Intake** step turns the text into structured facts with ids (roles, dates, skills, achievements). This is the accurate reading the agents rely on. It costs about one model call per resume: roughly $0.01 to $0.05 on the models in the working cost basis (a resume of about 3,000 input tokens and 2,000 output tokens), so the price is small. The risk is **abuse**, not price: many free uploads by people who never pay.

| Option | Before payment | Cost to JobsQ | Verdict |
|---|---|---|---|
| **A. Rules only (recommended)** | Text extraction and a rules-based preview | None | Matches decision D10. Preview is rougher than AI |
| B. Light AI before payment | One cheap AI call for a better preview | About $0.01 or less per upload with a small model, but unpaid users can run it repeatedly | Only with hard caps (per day, per IP, per account) and the CEO's approval |
| C. Nothing before payment | Only "file received" | None | Worst for conversion; the user sees nothing |

**Limits of option A** (told to the user plainly): a scanned or image-only PDF has no text, and reading it would need OCR (more cost and more code). V1 refuses it with "we can't read scanned files, please upload a text PDF or a Word file". Unusual layouts (two columns, tables) can scramble the order of text; the preview says so and the user can fix it by uploading another file.

**The "frontend only" point.** pdfplumber and python-docx are Python. They cannot run in a browser. With a **Python backend** (section 2) this stops being a problem: the "reading" is one small route in the same API (`/v1/resume/read`) that reads the file in memory, returns the preview and stores nothing until the user pays. To the user it is still a pre-payment step in the web app. No second language and no separate service are needed.

## 2. Backend language: Python 3.12 with FastAPI (recommended)

> **Decided 18 Nov 2026 (D30): the backend is Python 3.12 with FastAPI.** The reasoning below stays as the record of why.

| Reason | Why it matters for JobsQ |
|---|---|
| **Resume reading is Python** | pdfplumber and python-docx are the libraries you chose. In a TypeScript backend you would need a separate Python service just for this |
| **Word output is Python** | The tailored resume is delivered as **PDF and Word** (decision D26). python-docx writes Word files; PDF can be made from the same content with a PDF library or an HTML-to-PDF tool |
| **The AI work is mostly waiting** | An agent run is long calls to a model, job APIs and web search. Async Python (FastAPI with `asyncio`) holds thousands of such waits at once on a few machines. 1,000 users is well inside what it handles |
| **Strong AI tooling** | The model providers' official SDKs, structured output validation (Pydantic) and the evals are first-class in Python. The checks that stop invented facts (JSON schemas, claim validation) are Pydantic models |
| **The contract writes itself** | FastAPI produces an OpenAPI description of the API automatically. The web app and the mobile app generate their typed client from it, so web, mobile and API never drift apart |
| **Small team** | Abdul Ahad and Zuhair work with Claude Code. One backend language, with a very large pool of libraries and examples, keeps the team small |

**Honest downsides and the answer to each**

- *Python is slower than Go or Rust for heavy computation.* Our heavy work is waiting on other services, not computing. The only CPU-heavy parts (reading files, making PDFs) run in **worker processes**, never in the web API.
- *Python's global interpreter lock limits one process to one CPU core.* We run several processes behind a load balancer (standard practice). Capacity grows by adding processes and machines.
- *Type safety is weaker than TypeScript.* Use type hints with a checker (mypy or pyright) in CI, and Pydantic at every boundary.

**Alternatives considered**

| Alternative | Verdict |
|---|---|
| TypeScript (Node, Fastify or NestJS) | Good for a team that already knows it, and shares types with a web and mobile app. But it needs a Python service for resume reading and weaker Word handling. **Pick it only if the team's strongest language is TypeScript.** Then run the resume reader as a tiny Python function |
| Go | Best raw speed, not needed at this scale. Slower to build, thinner AI and document libraries |
| Java or C# | Strong, but heavier and slower to build for a two-person team |

**Supporting parts (proposal):** PostgreSQL (data), Redis (queues and cache), a worker library for background jobs (Arq or Celery), the Argon2id password hash, and a PDF renderer in its own container. These are unchanged from [BACKEND.md](../BACKEND.md).

**Decided.** The product owner confirmed this on 18 Nov 2026 (D30).

## 3. Frontend and mobile: Next.js with TypeScript, and React Native later (recommended)

> **Decided 18 Nov 2026 (D30): the frontend is Next.js (React) with TypeScript.** The mobile app (React Native with Expo) is still a recommendation; platform and date are open.

| Part | Recommendation | Why |
|---|---|---|
| Website and web app | **Next.js (React) with TypeScript**, styled with Tailwind | The landing page needs to load fast and be found by search (server-rendered pages). The workspace is an interactive app with live updates (React). One of the most widely used stacks, so help and hires are easy to find |
| API client | Generated from the backend's OpenAPI description | No hand-written, drifting request code |
| Live updates | Server-sent events (simple) or WebSocket | When the user approves in the chat, the web page updates at once and the other way round (shared history, section 5) |
| Copy button | The browser's clipboard function | A real one-tap copy for emails and LinkedIn messages |
| Mobile app (planned) | **React Native with Expo** | Same language (TypeScript) and the same generated API client as the web app, one team, both iOS and Android. **Flutter** is the alternative if the team prefers one UI toolkit for everything, but it shares no code with the web app |
| Admin console | Same Next.js app, a separate protected area | One deployment, shared components |

## 4. Production readiness: 100 to 1,000 users at once

The plan must be built and tested for **up to 1,000 users active at the same time** and about 100 on launch day. "Production ready" is defined as the targets below, each with a test before launch.

**How to read "1,000 at once".** Our working assumption: 1,000 subscribers, of whom up to 200 may have an agent run going in the same minute (a run lasts about 1 to 2 minutes). So the system must sustain about **200 agent runs at once**, **1,000 open web sessions**, and a burst of several hundred chat messages per minute. These are assumptions to confirm with the first beta data.

| Area | Target | How |
|---|---|---|
| Web and API responses | 95% of ordinary requests under 300 ms; 99% under 1 s | Stateless API, at least 2 instances behind a load balancer, database connection pooling, indexes on every filter |
| Chat webhooks | Reply "received" to WhatsApp and Discord within 1 s, always | Save the message, put it on a queue, answer at once; the work happens afterwards (already the design) |
| Agent runs | 200 at once, none lost | Worker pool that scales out; **one active run per user**; a queue with a depth alarm and a per-user daily cost ceiling |
| Model provider limits | Never exceed the provider's requests-per-minute and tokens-per-minute | A global rate gate in front of every model call; retries with waiting; a request for a higher limit tier before launch. On the own-key plan each user's calls use the user's own limits |
| Job and lookup APIs | Same: a shared rate gate and a cache of company data | Shared company cache (already planned) |
| Database | Survives a restart with no loss; restore tested | Managed PostgreSQL with automatic backups and a standby copy |
| Availability | 99.5% a month at launch | Two or more instances in different zones; health checks; automatic restart |
| Overload | Degrade, do not fall over | New agent runs wait in the queue and users are told "queued"; the web app and tracker keep working |
| Cost safety | No user or bug can run up an unlimited bill | Daily limit per user, per-user cost ceiling, global spend alarm and a kill switch |
| Security | Passwords hashed, keys encrypted, data separated per user | See [BACKEND.md §18](../BACKEND.md#18-security-and-privacy) |

**Tests before launch**
1. **Load test:** 1,000 simulated sessions and 200 simultaneous agent runs against a copy of production with the model providers replaced by a stand-in that answers after a realistic delay (so the test costs nothing). Pass: the targets above hold for 30 minutes.
2. **Provider limit test:** a short real run at the planned peak to confirm the provider's limits and the queue behaviour.
3. **Failure drills:** kill an API instance, a worker and the database standby while the load test runs; nothing is lost and users see no error beyond "queued".

**Cost of being ready.** The shared and fixed cost estimates in the plan (section 9.4) were sized for about 100 to 1,000 users. Real figures come from the load test and the first beta.

## 5. Same history on the web and in the chat

**Decision (18 Nov 2026):** the web app and the chosen chat channel (WhatsApp or Discord) share **one history per user**. A job, an approval, a draft, a prompt or a follow-up exists once; the web app and the chat are two windows onto it.

**How it works**

- One **timeline** per user: every message the user sent, every reply, every card (shortlist, approval request, draft, prompt) and every answer is one record, with the **surface** it came from (web, WhatsApp, Discord) and a server-assigned order number.
- Each surface draws the timeline in its own way. The web app shows all of it, live. The chat shows what is sent to it.
- A prompt, an approval request or a follow-up is created **once** and delivered to the web app always, and to the chat when the channel allows it (for WhatsApp, inside the 24-hour window or with an approved template).
- **First answer wins.** An answer from either place is recorded once; the other place is updated.

**Edge cases and how they are handled**

| Case | Behaviour |
|---|---|
| The user approves in the web app, then taps the old button in the chat | The chat replies "Already approved from the web app at 10:02" and nothing happens twice |
| Both answers arrive at the same moment | The server accepts the first it saves (a compare-and-set on the item's version); the second gets "already done" |
| A prompt ("Did you apply?") is answered on the web; the chat message is still on the phone | The chat tap gets "already answered"; the web card shows the answer. A chat message already sent cannot be edited on WhatsApp, so the late tap is handled, not removed |
| A follow-up is due and the user only uses the web app (the WhatsApp 24-hour window is closed) | It is shown in the web app at once. The chat copy is sent only if the window is open or an approved template exists; whether to spend a template message here is open (cost) |
| Two prompts due the same day | One prompt message per user per day, the most urgent first; the rest wait for the next day, in both places |
| The user types a command in the chat while an agent run started in the web app is going | The run is the same run; the chat gets "already working on it" with its status |
| The chat channel is blocked, STOPped or reconnecting | The web app carries on from the same history; after reconnecting the chat catches up from the timeline with a short summary, not a replay of everything |
| Old messages in the chat refer to a draft that was since replaced | Buttons carry the item's version; an old button answers "this draft was replaced; here is the new one" |
| A message sent from the web while the chat is the user's habit | The result is shown in both, once each, with no duplicate agent work |
| The user has many pending items | The pending list is the same in both places and in the same order |
| Time zone differences | Prompts use the user's time zone, set once, shown the same in both places |
| Two devices open at once (web and mobile later) | Same rules as above: first answer wins, others update live |

## 6. Outreach text with a copy button

**Decision (18 Nov 2026):** the wording for a LinkedIn message or for an email to a referral is delivered **in the chat with a copy button**, so the user presses it and pastes into LinkedIn or their email. The same wording, with the same button, is in the web app.

**What each place can really do** (the platform limits are the part to verify):

| Place | What the user gets |
|---|---|
| **Web app** | A real **Copy** button for each part (subject, body, LinkedIn note). One tap puts the text on the clipboard. An email draft also keeps its "open in my email" link |
| **WhatsApp** | A plain **text-only message** containing just the draft (nothing else in it), so a long-press selects all of it, plus a **"Send as plain text"** quick-reply button to send it again alone. WhatsApp's own copy button exists for authentication-code templates; **whether one can be used for free-form drafts is not confirmed and must be checked in the week-1 test** |
| **Discord** | The draft inside a **code block** in its own message (Discord shows a copy control on code blocks on desktop), plus a button that sends it again as plain text |

**Rules:** one draft per message; subject and body sent as two separate pieces so each can be copied alone; the LinkedIn note and its length limit stated; the user can ask for a rewrite from the same screen; JobsQ never sends it.

## 7. Data protection: what we must keep, and what must be deleted on request

**Your reading (18 Nov 2026):** keep the activity log and payment invoices and receipts, linked to the user by a user ID; delete the rest when the user asks. **I checked it. It is broadly right, with the points below. I am not a lawyer; counsel must confirm before launch** (PRD question 15).

**What I found**

- **India (DPDP Act 2023 and the Rules notified in November 2025).** A user can ask for their personal data to be erased, and consent can be withdrawn. Erasure is **not** required where keeping the data is needed to comply with another law. Commentary on the Rules says logs and traffic data about the processing must be kept **for at least one year**, even if the user deletes the account. Commentary also says most obligations in the Rules start **18 months after** notification (around **May 2027**), which is after the planned launch, so JobsQ should be built for them from the start. Sources: [JSA](https://www.jsalaw.com/wp-content/uploads/2025/11/JSA-Prism-InfoTech-November-2025-DPDP-Rules.Final_.pdf), [Mondaq](https://www.mondaq.com/india/privacy-protection/1707558/digital-personal-data-protection-rules-2025-highlights), [DSCI FAQ](https://www.dsci.in/files/content/documents/2025/faq-on-data-retention-and-data-erasure-v2.pdf). The sources are law-firm and advisory commentary, not the official text, and they differ on details; the Gazette text and Schedules must be read.
- **Invoices and tax records (India).** Most sources say records, including invoices, must be kept about **six years (72 months)** from the due date of the annual return for the year. Some say three years for some record types and the retention can be extended for appeals or inquiries; the sources disagree on the section and start date. The accountant must confirm. Sources: [Masters India](https://www.mastersindia.co/books/indian-gst-a-comprehensive-guide/records-and-accounts/), [Zoho](https://www.zoho.com/in/books/gst/faq/accounts-and-records.html).
- **Later, outside India (GDPR and similar).** Erasure has exceptions for keeping data to meet a legal obligation and to establish or defend legal claims. This matches the plan to keep invoices and the activity log. This point is from general knowledge, not searched here; counsel to confirm when a second market is decided.

**What it means for JobsQ**

| | Rule |
|---|---|
| **Kept after a deletion request** | (1) **Payment records, invoices and receipts**, as the tax law requires, tied to the account by **user ID**. (2) The **activity log** (who did what, when: user ID, event type, time, result), tied by user ID, for the legally required period. The log holds **no personal content**: no resume text, no message text, no names or emails, only IDs and event types |
| **Deleted on request** | Name, email, phone number, password hash, LinkedIn ID (if collected), resume files and parsed facts, tailored resumes, contacts researched and drafts, chat and web history, preferences, channel links, the user's own AI key (deleted at once), and anything else that is personal and not in the "kept" list |
| **After the deletion** | The account becomes an empty shell keyed by the user ID, so the invoice and log still point to something. A **copy of the invoice** keeps only what the invoice law requires (usually name and address on it) |
| **Backups** | Deleted data ages out of backups within a set time (working value: 35 days). The privacy policy says so |
| **Sub-processors** | The AI provider, Meta, Discord and the email service may hold copies under their own terms; JobsQ chooses providers with no-training, short-retention terms, and the privacy policy lists them |
| **Time to act** | **30 days** from a verified request, then confirm to the user by email (the product owner's value, 18 Nov 2026; the legal basis is to be confirmed by Abdul Muqtadir) |
| **Without a request** | The product owner's reading is that JobsQ may keep user data for 30 days without a request. I apply it to accounts that registered and never paid: their data (including the resume) is erased after 30 days. **To be confirmed by Abdul Muqtadir**; the DPDP Act sets no fixed 30-day period for a business like this, it asks that data be erased when its purpose is served or consent is withdrawn, unless a law requires keeping it |
| **Verified request** | The request comes from the logged-in account or the registered email, so nobody can delete another person's account |

### 7.1 Legal references (where anyone can find them)

**All of these are to be confirmed by Abdul Muqtadir (CTO) before launch.** The section numbers below come from official-text listings and legal commentary; I could not open the Gazette text itself, so the exact wording must be read there.

| Law | What it says for us | Where to read it |
|---|---|---|
| **Digital Personal Data Protection Act, 2023** (Act No. 22 of 2023) | Section 8(7): erase personal data when consent is withdrawn or the purpose is served, **unless retention is necessary to comply with a law**. Section 12: a person's right to correction and erasure, with the same exception | India Code, official text: [Act No. 22 of 2023 (PDF)](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf); explained by [FPF](https://fpf.org/blog/the-digital-personal-data-protection-act-of-india-explained/) |
| **Digital Personal Data Protection Rules, 2025** (notified by the Ministry of Electronics and Information Technology on 13 Nov 2025; G.S.R. number not confirmed) | Rule 8: erasure and retention; commentary says personal data, traffic data and logs from processing must be kept **at least one year**, then erased unless another law requires longer. Commentary says rules 3 and 5 to 16 start **18 months after notification (about 13 May 2027)**. Sources disagree on which schedule (Third or Seventh) covers which purpose | Gazette notification on [meity.gov.in](https://www.meity.gov.in); summaries: [Mondaq](https://www.mondaq.com/india/privacy-protection/1707558/digital-personal-data-protection-rules-2025-highlights), [Bar & Bench](https://www.barandbench.com/view-point/meity-notifies-final-digital-personal-data-protection-rules-2025), [DSCI FAQ](https://www.dsci.in/files/content/documents/2025/faq-on-data-retention-and-data-erasure-v2.pdf) |
| **Central Goods and Services Tax Act, 2017**, section 36, and **CGST Rules, 2017**, rule 56 | Accounts and records, including invoices, kept for **72 months (six years)** from the due date of the annual return for the year (longer while an appeal or investigation is open). Section 35 is the general duty to keep records | [CBIC](https://www.cbic.gov.in); summaries: [TaxGuru](https://taxguru.in/goods-and-service-tax/accounts-records-maintained-gst-sec-35-36-rules-56-58-cgst-act.html), [KnowYourGST](https://www.knowyourgst.com/gstlaw/cgst-act/36-period-of-retention-of-accounts-36/) |
| GDPR (only if a market outside India is added) | Article 17: erasure, with exceptions in Article 17(3) for a legal obligation and for legal claims | EUR-Lex, Regulation (EU) 2016/679. From general knowledge, not searched here |

**The conflict with "no deleting in V1".** Decision D19 said there are no delete functions in V1. Because erasure on request is a legal duty (and the Rules' main duties start about May 2027), I recommend: **no self-service delete button in V1, but a written erasure procedure that the super admin runs by hand at launch** (a checklist and a script, with the log entry). The self-service button follows later. This needs the product owner's confirmation (PRD question 31).

## 8. The two crucial decisions, both about cost

These two are the decisions that set whether the business works. Both are **open** and both must be settled **before prices are fixed**, using the cost review.

| # | Decision | Why it is crucial |
|---|---|---|
| **C1** | **The daily application limit** (5 or 10 per day) | AI cost per user scales with applications. In the plan's estimates a user at 5 a day can cost about $60 to $105 a month in AI on the Classic plan, and about $120 to $210 at 10 a day, against about $18 to $24 for a typical user. One heavy user can cost more than they pay |
| **C2** | **The AI model per agent** | The model is most of the AI cost. The same agent on a cheaper model can cost a third or less. Quality must be proven by the evals, not assumed |

Rule: **the price of the Classic plan, the daily limit and the model are decided together.** Ceiling per user per month = applications per day × days × cost per application.

## 9. Follow-up prompts: kept, limits open

The "Did you apply?" and "Did you get a reply?" prompts are **kept** in V1 (Must). What is open is the **limit**: how many times a prompt repeats, how far apart, and how many days it keeps going. The 2-day, 4-day and 30-day values are working values until the product owner sets the limits.

## 10. Open question added: the user's LinkedIn ID

Whether JobsQ collects the user's **LinkedIn profile ID or URL**, and when and why (for example to let the LinkedIn agent mention the user's own profile, or to compare with the resume). It is **not** part of registration (decision D8). Open: yes or no, when it is asked, whether it is required, and how it is deleted on request. It is personal data, so it follows the section 7 rules.
