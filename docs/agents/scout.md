# Agent: Scout

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Templates | Agent Spec (D1) and Eval Plan (D3), AI Engineering framework |
| Scope | Must have (V1) |
| PRD | §5 The agents · §7.3 step 1 · §8 Agents · §9 |
| Related | [BACKEND.md §13–14](../BACKEND.md#13-agent-runtime), [features/07](../features/07-conversation-engine.md), [features/14](../features/14-daily-digest.md) |

## 1. Agent spec (D1)

| Field | |
|---|---|
| **Agent name & product** | Scout — JobsQ |
| **Owner** | [TBD] |
| **Job** | Find open jobs that fit the user's preferences and resume and present up to 10, as recent as possible, with a one-line reason each and no score; also capture a job the user supplies themselves. |
| **Inputs & data sources** | The user's job preferences; a summary of their resume (titles, years, skills, industries); ids of jobs already shown to them; an optional few words from the user ("fintech only"); results from two job-search providers; public career-site data from Greenhouse, Lever and Ashby. **Must never see:** the user's name, email, phone or address; other users' data; payment data. |
| **Tools / connectors** | `search_jobs`, `check_posting`, `fetch_page` |
| **Output format** | Structured: a ranked list of candidate ids (the order is the ranking), each with a reason of 12 words or fewer. **No score is produced or shown** (decided 18 Nov 2026: a score invites arguing over 78 against 82, and the reason is the useful part). All job facts shown to the user come from the stored job record, not from the model. |
| **Autonomy level** | L2. (L3 when it runs for the daily digest.) |
| **Human checkpoint** | The user picks which jobs to pursue. Nothing happens to a job until they do. |
| **Model & estimated cost per run** | `claude-haiku-5-5` for query building, extraction and ranking (proposal). About $0.03 per shortlist, plus shared search-provider cost. |
| **Failure handling** | One provider down: use the other and cached results. Both down: say so plainly; no usage counted. Fewer than 5 good matches: show what there is and suggest widening. None: say so. |
| **Kill switch** | `agent.scout.enabled` in the admin console. Off: "Scout is temporarily unavailable"; users can still send their own job links only if capture is left on (`agent.scout.capture.enabled`). |

## 2. What it does

### 2.1 Shortlist

1. **Build 2 to 3 searches** from the preferences and any words the user added: role with location, role synonyms, a remote variant when remote is acceptable.
2. **Search both providers** for each. Results are cached by normalised query, location and day, and the cache is shared by all users.
3. **Normalise** every result to one shape: company, title, location, work mode, salary if stated, description, apply link, source, posted date.
4. **Remove duplicates.** Two results are the same job when the normalised company matches and the titles share at least 70% of their words (Jaccard similarity of 0.7 or more). Keep the richer record and fill its gaps from the other.
5. **Filter in code**, not by the model:
   - location and work mode match the preferences;
   - seniority fits the years of experience;
   - internships, trainee and fresher roles are removed unless the user asked for them;
   - a job is removed for salary **only** when it states a salary below the user's minimum. A missing salary never removes a job;
   - companies on the user's exclude list are removed;
   - jobs already shown to this user are removed;
   - **recency:** the newest postings are preferred. There is no fixed age cut-off yet; the maximum age is open (PRD question list).
6. **Check it is still open** for postings hosted on Greenhouse, Lever or Ashby. Closed ones are removed and marked closed for everyone.
7. **Rank** the best 20 or so. The model sees each candidate's text and the resume summary, and returns the candidates in order with a reason for each. Newer postings are favoured.
8. **Return** the top **10** at most.

Target: delivered within 30 seconds, 95% of the time.

### 2.2 A job the user supplies

| The user sends | Scout does |
|---|---|
| A LinkedIn, Indeed or Naukri link | Does not open it. "I can't open links from that site. Paste the job description here and I'll take it from there." |
| A Greenhouse, Lever or Ashby link | Reads the posting through the career site's public data |
| Any other link | Fetches the page and extracts the posting |
| Pasted job text | Extracts company, title, location and description |

Then it confirms: "Acme – Backend Engineer, Pune. Work on this one?" On yes, the job is saved as **private to that user** and the pipeline starts. If the company or title cannot be determined, it asks.

## 3. Rules specific to Scout

| Must | Must never |
|---|---|
| Show only jobs it has reason to believe are open | Knowingly show a closed job |
| Give a reason grounded in the job text and the user's resume | Claim a fit the resume does not support ("matches your Kafka experience" when Kafka is not on the resume) |
| Say when salary is not listed | Estimate or guess a salary |
| Respect the exclude list | Show the same job twice unless the user asks to see earlier ones |
| Use provider and career-site data | Open LinkedIn, Indeed or Naukri |

## 4. Output

```json
{
  "items": [
    { "candidate_id": "c07", "fit_reason": "Go and Postgres match your last two roles" }
  ],
  "note": "Only 4 strong matches. Widen to hybrid roles for more?"
}
```

The engine joins each `candidate_id` to its stored job and renders company, title, location, salary and link from the record. The model cannot change those fields.

## 5. Checks after the model

| Check | Fails when |
|---|---|
| Ids | An id is not in the candidate set |
| Length | A reason is over 12 words |
| No links | A reason or note contains an address |
| Count | More than 8 items |

Whether reasons are truly grounded is measured in the eval, not at run time.

## 6. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| SCT-01 | build searches from the user's preferences and any added words | Must | The stored queries reflect role, location and work mode |
| SCT-02 | query two providers and continue if one fails | Must | With one provider stubbed to fail, a shortlist is still produced |
| SCT-03 | merge duplicates by company and 70% title-word overlap, keeping the richer record | Must | The reference project's duplicate examples collapse to one |
| SCT-04 | apply location, seniority, exclude-list and already-shown filters in code | Must | Unit tests per filter |
| SCT-05 | exclude internships and fresher roles unless requested | Must | None appear in the eval set when not requested |
| SCT-06 | filter on salary only when the posting states one | Must | A job with no salary is never dropped for salary |
| SCT-07 | drop postings that their career site reports closed | Must | A closed test posting never appears |
| SCT-08 | return up to 10 jobs, as recent as possible, with a reason of 12 words or fewer and no score; fewer if that is all there is; none with a plain message | Must | All three cases covered |
| SCT-09 | never show a job twice to the same user unless asked | Must | Two consecutive shortlists share no job |
| SCT-10 | never fetch LinkedIn, Indeed or Naukri | Must | The tool refuses; the eval's restricted-site count is zero |
| SCT-11 | capture a user-supplied job and confirm it before starting work | Must | Each row of section 2.2 behaves as stated |
| SCT-12 | render job facts from the stored record | Must | A model answer that alters a title has no effect on what is shown |
| SCT-13 | share provider results across users | Must | 50 users with the same preferences cause one provider call per query |
| SCT-14 | deliver within 30 seconds at the 95th percentile | Must | Measured in staging |
| SCT-15 | store pasted jobs as private to the user | Must | Another user's shortlist never contains them |

## 7. Eval plan (D3)

| Field | |
|---|---|
| **Agent & version** | Scout v0.1 (prompt and model to be recorded at first run) |
| **Test set** | 30 real preference-and-resume profiles (with consent), each paired with a **frozen snapshot** of provider results so runs are repeatable. Plus 10 user-supplied jobs: 2 restricted-site links, 3 career-site links, 2 other links, 3 pasted texts. |
| **Pass criteria** | **Relevance:** at least 70% of shown jobs judged relevant by a human reviewer. **Filters:** zero internships when not requested, zero excluded companies, zero jobs below a stated minimum salary, zero duplicates. **Reasons:** 100% within 12 words; at least 95% grounded in the job text and resume. **Restricted sites:** zero fetches. **Capture:** company and title correct in at least 9 of the 10 supplied jobs, and it asks when it cannot tell. **Format:** 100% valid. |
| **Results** | Not run yet |
| **Ship / fix / don't ship** | Pending |

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Preferences too narrow (one niche role, one small city) | Shows what exists and names what to widen |
| The user adds words that conflict with preferences ("anything in London" when preferences say Pune) | The request wins for this shortlist; preferences are unchanged |
| A posting is open on the career site but the role was filled | We cannot know; the Researcher step re-checks before work continues |
| Provider returns a job with no apply link | Dropped |
| Pasted text is a list of several jobs | "I see more than one job here. Which should I work on?" |
| The same job arrives from the search and from the user's paste | The private copy is used for that user |

## 9. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Which two job-search providers, and do their terms allow commercial use and caching? | CTO |
| 2 | Maximum posting age. Decided: as recent as possible; a hard cut-off, if any, is open | Product owner |
| 3 | **Answered 18 Nov 2026:** reason only, no score; at most 10 jobs | — |
| 4 | When to move from "search on request" to the shared job index in archive/PLAN.md §5 | CTO |
