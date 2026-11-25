# JobsQ documentation

Status on 2026-11-25: the design documents are **drafts, not approved**. A first working build exists: see [CURRENT_BUILD.md](CURRENT_BUILD.md).

JobsQ is a paid job-hunting service. A user registers, adds their resume, picks one of two plans (**JobsQ AI**, or **Your own AI** on their Claude Code or Codex subscription), and works with six AI agents on the web and on WhatsApp (Discord and a mobile app are planned). The agents find jobs, tailor the resume, find referrals, draft outreach and prepare for interviews. They only draft: the user approves and sends everything.

## Read in this order

| # | Document | What it answers |
|---|---|---|
| 0 | [CURRENT_BUILD.md](CURRENT_BUILD.md) | What is built today and the decisions in force. **It wins over older wording** |
| 1 | [JobsQ_architecture_and_flows.md](JobsQ_architecture_and_flows.md) ([PDF](JobsQ_architecture_and_flows.pdf)) | Diagram, tech stack and flows in plain words |
| 2 | [PRD.md](PRD.md) ([PDF](PRD.pdf)) | What we are building, for whom, and what is in V1 |
| 3 | [WORKFLOW.md](WORKFLOW.md) | What connects to what, with diagrams |
| 4 | [BACKEND.md](BACKEND.md) | Services, database, API, queues, agent runtime, security, operations (the V1 design) |
| 5 | [features/](features/) | One document per feature, with testable requirements |
| 6 | [agents/](agents/) | One Agent Spec and Eval Plan per agent, and the agent registry |
| 7 | [WHATSAPP_VERIFICATION_PLAN.md](WHATSAPP_VERIFICATION_PLAN.md), [WHATSAPP_PRICING.md](WHATSAPP_PRICING.md), [evidence/](evidence/META_AI_IN_WHATSAPP_2026-11-18.md) | Meta approvals, message costs, recorded evidence |
| 8 | [BACKEND_IMPROVEMENTS.md](BACKEND_IMPROVEMENTS.md) | Suggested backend work, not done |
| 9 | [archive/](archive/README.md) | Superseded documents, kept as a record only |

## Features

| # | Feature | Scope | Requirement ids |
|---|---|---|---|
| 01 | [Registration and login](features/01-registration-and-login.md) | Must | AUTH |
| 02 | [Subscriptions and billing](features/02-subscriptions-and-billing.md) | Must (yearly billing is stretch) | BILL |
| 03 | [Usage limits](features/03-usage-limits.md) | Must | LIM |
| 04 | [Channel connection](features/04-channel-connection.md) | Must | CHAN |
| 05 | [WhatsApp channel](features/05-whatsapp-channel.md) | Must, subject to Meta's answer | WA |
| 06 | [Discord channel](features/06-discord-channel.md) | Must (own-server mode is stretch) | DC |
| 07 | [Conversation engine and job pipeline](features/07-conversation-engine.md) | Must | ENG |
| 08 | [Resume upload and profile](features/08-resume-and-profile.md) | Must | RES |
| 09 | [Tracker](features/09-tracker.md) | Must | TRK |
| 10 | [Web app and dashboard](features/10-web-dashboard.md) | Must | DASH |
| 11 | [Admin console](features/11-admin-console.md) | Must | ADM |
| 12 | [Data export and erasure](features/12-data-export-and-deletion.md) | Export: Must; erasure by procedure at launch | DATA |
| 13 | [Follow-up prompts](features/13-follow-ups.md) | Must (limits open) | FU |
| 14 | [Daily digest](features/14-daily-digest.md) | Stretch | DIG |

## Agents

| Agent | Scope | Requirement ids |
|---|---|---|
| [Scout](agents/scout.md) | Must | SCT |
| [Researcher](agents/researcher.md) | Must | RSR |
| [Resume Tailor](agents/resume-tailor.md) | Must | TLR |
| [Email](agents/email.md) | Must | EML |
| [LinkedIn](agents/linkedin.md) | Must | LNK |
| [Interview Prep](agents/interview-prep.md) | Stretch | PRP |

The registry and the rules shared by all agents are in [agents/README.md](agents/README.md).

## How these map to the TrunkQ framework

| Framework step | Template | Where it is |
|---|---|---|
| Product requirements | C1 | [PRD.md](PRD.md) — draft |
| Engineering requirements | C1A | The requirement tables in each feature and agent document are its raw material. The C1A itself (with traceability and sign-off) is still to be written |
| System design | C7 | [BACKEND.md](BACKEND.md) and [WORKFLOW.md](WORKFLOW.md) — draft input; needs design review (a first build exists) |
| Data model | C8 | [BACKEND.md §8](BACKEND.md#8-data-model) — draft input |
| Agent spec | D1 | Each file in [agents/](agents/) |
| Eval plan | D3 | Each file in [agents/](agents/); test sets not yet built, results not yet run |
| Agent registry | D4 | [agents/README.md](agents/README.md) |
| Task sheet | A10 | [WHATSAPP_VERIFICATION_PLAN.md §7](WHATSAPP_VERIFICATION_PLAN.md#7-task-sheet-tra-trs-template-a10) |
| Build task plan | C9 | Not written. It follows design approval |

Once a design document is approved it moves to `docs/design/`, as the framework requires.

## Still to be decided

| # | Decision | Owner |
|---|---|---|
| 1 | Confirm the remaining WhatsApp risk ([WhatsApp plan §2](WHATSAPP_VERIFICATION_PLAN.md#2-gate-0-is-jobsq-allowed-on-whatsapp), [evidence](evidence/META_AI_IN_WHATSAPP_2026-11-18.md)): Meta's replies are not pre-approval | CEO, CTO |
| 2 | Written approval from Anthropic and OpenAI before charging for Your own AI | CEO, CTO |
| 3 | Legal entity and its documents | CEO |
| 4 | Payment provider and currency | CEO, CTO |
| 5 | Prices for JobsQ AI and Your own AI; daily application limit and AI model (cost) | CEO, CTO |
| 6 | Job-search and email-lookup providers and their terms | CTO, legal |
| 7 | Erasure on request and retention periods (DPDP Act 2023, DPDP Rules 2025, CGST Act 2017) | CEO, legal |
| 8 | Screen design owner; an owner for each agent | CEO, CTO |
| 9 | Mobile app platform and date; whether Discord stays in V1 | CTO |
| 10 | Confirm the 25 Nov product changes in CURRENT_BUILD.md §1 | CEO, CTO |

Every document ends with its own open questions.

## Making a PDF

Any document here can be rendered in the TrunkQ document style:

```bash
node tools/md-to-pdf.mjs docs/PRD.md docs/PRD.pdf "Nov 16, 2026" "@Abdul Ahad" "Owner: Abdul Muqtadir (CTO)" "Draft v0.1"
```

Diagrams are written in Mermaid and appear as code in a PDF made this way; view them on GitHub or in a Markdown viewer.
