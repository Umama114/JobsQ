# Agent: Interview Prep

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Templates | Agent Spec (D1) and Eval Plan (D3), AI Engineering framework |
| Scope | **Stretch**, first in the PRD's stretch order |
| PRD | §5 The agents (last story) · §6 Stretch item 1 · §9 |
| Related | [BACKEND.md §13–14](../BACKEND.md#13-agent-runtime), [features/09](../features/09-tracker.md), [features/03](../features/03-usage-limits.md) |

## 1. Agent spec (D1)

| Field | |
|---|---|
| **Agent name & product** | Interview Prep — JobsQ |
| **Owner** | [TBD] |
| **Job** | When a company replies, give the user a prep guide for that interview (process, topics, likely questions, gaps, a day-by-day plan) and run a mock interview one question at a time. |
| **Inputs & data sources** | The job description; the approved company research; the user's resume facts and the approved tailored resume; the interview date and round, if the user gave them; web search results; public pages. **Must never see:** the user's contact details; other users' data. **Must never open:** Glassdoor, AmbitionBox, LinkedIn, Indeed or Naukri pages (search snippets only). |
| **Tools / connectors** | `web_search`, `fetch_page`, `read_tracker` |
| **Output format** | Structured guide (section 4); in mock mode, one question or one piece of feedback per turn. |
| **Autonomy level** | L2 |
| **Human checkpoint** | The user starts prep and each mock session, and can stop at any time. Nothing leaves JobsQ. |
| **Model & estimated cost per run** | `claude-opus-5-5`, effort high (proposal). About $1.10 per session on Opus, about $0.55 on Sonnet. The most expensive single action in the product, so it is limited. **The limits and rules are open (decided later, 18 Nov 2026); the super admin can set them per user.** |
| **Failure handling** | No interview reports found: say so, and build the guide from the job description and resume, with every question marked "likely". Search down: retry, then fail with no usage counted. |
| **Kill switch** | `agent.prep.enabled`. Off: the tracker still records the interview; prep is offered when the agent returns. |

## 2. What it does

### 2.1 Trigger

The user reports a reply: "they want to interview on Friday", or `/prep`. The engine sets the application status to `interviewing`, saves the date if given, and asks: "Want a prep guide for this interview?" On yes, one `prep_session` is counted when the guide is delivered.

### 2.2 The guide

1. **Search** for interview reports for this company and role. Glassdoor and AmbitionBox are used **through search snippets only**. Company engineering blogs, public forum posts and similar pages may be fetched.
2. **Write five sections:**

| Section | Content | Limit |
|---|---|---|
| Process | The rounds candidates report, in order. If nothing is found: what is typical for this kind of role, labelled as typical | Short |
| Topics | What to revise, ranked by how often it appears in reports and in the job description | Up to 8 |
| Questions | Likely questions, each marked **asked before** (with its source) or **likely** (from the job description) | Up to 10 |
| Gaps | Requirements the user's resume does not show, with an honest way to speak to each | All real gaps |
| Plan | What to do each day until the interview. 5 days by default if no date is known | One line per day |

3. The engine posts the sections as separate messages and offers **Start a mock interview**.

Target: guide delivered within 2 minutes, 95% of the time.

### 2.3 Mock interview

- One question at a time, drawn from the guide's questions and topics, starting with the easier ones.
- After each answer: two or three lines of feedback (what worked, what was missing) and, if useful, the outline of a stronger answer built **from the user's own experience on their resume**.
- The user can say `next`, `skip`, `repeat` or `stop`.
- At most 15 questions per session **[TBD]**. At the end: three things to practise.
- The session is a conversation mode ([features/07](../features/07-conversation-engine.md)): while it is active, the user's messages are treated as answers. `stop` or 30 minutes of silence ends it.

## 3. Rules specific to Interview Prep

| Must | Must never |
|---|---|
| Mark each question "asked before" only when a source reports it | Present an invented question as one that was asked |
| Give the source for every "asked before" question and every reported round | Invent a quote, a source or a statistic |
| Build model answers from the user's real experience | Put experience in the user's mouth that their resume does not show |
| Say plainly when little was found | Pad the guide with generic material presented as specific |
| Keep to this job and this interview | Become a general tutor or answer unrelated questions |

The last rule matters for WhatsApp: the mock interview is the most open-ended conversation in JobsQ, and Meta's terms restrict open-ended AI assistants ([WhatsApp approval track, Gate 0](../WHATSAPP_VERIFICATION_PLAN.md#2-gate-0-is-jobsq-allowed-on-whatsapp)). Each mock session is tied to one job and ends by itself.

## 4. Output

```json
{
  "process": [{ "round": "Online assessment", "detail": "…", "basis": "reported", "source_url": "…" }],
  "topics": [{ "topic": "Consistency in distributed queues", "why": "In the job description and 3 reports" }],
  "questions": [
    { "text": "Design a payment reconciliation system.", "basis": "asked_before", "source_url": "…" },
    { "text": "How would you make a consumer idempotent?", "basis": "likely" }
  ],
  "gaps": [{ "requirement": "Kafka", "how_to_address": "Describe your event-queue work at Finly and what would carry over." }],
  "plan": [{ "day": 1, "focus": "…" }],
  "notes": "No interview reports found for this exact role; rounds are typical for the level."
}
```

## 5. Checks after the model

| Check | Fails when |
|---|---|
| Sources | An "asked before" item or reported round has no source, or the source is not among this run's tool results |
| Counts | More than 10 questions or 8 topics |
| Gaps are real | A listed gap is present in the resume's skills |
| Model answers | A suggested answer cites experience not in the resume facts (checked by the Checker) |
| Restricted sites | A fetch of a restricted site was attempted |
| Mock turn | A turn contains more than one question |

## 6. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| PRP-01 | offer prep when the user reports an interview, and set the status to interviewing | Must | The tracker shows the status and date |
| PRP-02 | produce the five sections within their limits | Must | Format check |
| PRP-03 | mark each question "asked before" with a source, or "likely" | Must | Zero unsourced "asked before" items in the eval |
| PRP-04 | use Glassdoor and AmbitionBox through search snippets only | Must | Zero fetch attempts |
| PRP-05 | list gaps honestly with a way to address each from real experience | Must | Eval criterion below |
| PRP-06 | fit the plan to the interview date, or 5 days by default | Must | Plan length matches the days available |
| PRP-07 | run a mock interview one question per turn with feedback after each answer | Must | 100% single-question turns in the eval |
| PRP-08 | support next, skip, repeat and stop, and end after the cap or 30 minutes of silence | Must | Each control works |
| PRP-09 | never attribute experience to the user that their resume does not show | Must | Zero in the eval |
| PRP-10 | count one prep session when the guide is delivered and respect the plan limit | Must | See LIM-01 |
| PRP-11 | keep each mock session tied to one job | Must | Unrelated questions get the off-topic reply |
| PRP-12 | deliver the guide within 2 minutes at the 95th percentile | Should | Measured in staging |

## 7. Eval plan (D3)

| Field | |
|---|---|
| **Agent & version** | Interview Prep v0.1 |
| **Test set** | 20 jobs with frozen search snapshots: 10 at companies with many public interview reports, 10 with few or none. For the mock interview: 10 scripted sessions with answers of mixed quality, including one where the "candidate" tries to steer the agent off-topic. |
| **Pass criteria** | **Sources:** zero "asked before" questions without a source that contains the substance of the question. **Honesty:** in all 10 low-information cases the guide says little was found and marks questions "likely". **Limits:** 100% within counts. **Gaps:** at least 90% of listed gaps are true gaps. **Mock:** 100% of turns ask one question; feedback refers to the actual answer (reviewer score at least 4 out of 5); zero invented user experience; the off-topic attempt is declined. **Restricted sites:** zero fetch attempts. |
| **Results** | Not run yet |
| **Ship / fix / don't ship** | Pending |

## 8. Edge cases

| Case | Behaviour |
|---|---|
| The interview is tomorrow | A one-day plan: the three most likely topics and a short mock session |
| No date given | Asks once; if still unknown, uses the 5-day plan |
| The round is non-technical (HR, hiring manager) | Topics and questions shift to behavioural and role-fit; the plan says so |
| The user wants to practise a second time | A new mock session; whether it counts as a new prep session is an open question |
| The user answers "I don't know" | Feedback explains the idea briefly and moves on; no lecture |
| The company has changed its process recently | Reports are dated in the guide so the user can judge |

## 9. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Does each mock session count as a prep session, or only the guide? Proposed: the guide counts; up to 3 mock sessions per guide | CEO |
| 2 | Model: open, decided with the cost review (a crucial cost decision); Opus on both plans, or a cheaper model? | CEO, CTO |
| 3 | Maximum questions per mock session (15 proposed) | Product owner |
| 4 | Which public forums may be fetched under their terms | Legal, CTO |
| 5 | Is the mock interview offered on WhatsApp, given Gate 0? | CEO, CTO |
