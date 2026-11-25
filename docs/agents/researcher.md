# Agent: Researcher

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Templates | Agent Spec (D1) and Eval Plan (D3), AI Engineering framework |
| Scope | Must have (V1) |
| PRD | §5 The agents · §7.3 step 2 · §8 Agents · §9 |
| Related | [BACKEND.md §13–14](../BACKEND.md#13-agent-runtime), [features/07](../features/07-conversation-engine.md) |

## 1. Agent spec (D1)

| Field | |
|---|---|
| **Agent name & product** | Researcher — JobsQ |
| **Owner** | [TBD] |
| **Job** | For one job the user picked, summarise the company and propose 2 to 3 people who could refer the user, each with a source, and find a verified work email where one exists. |
| **Inputs & data sources** | The job record (company, title, description, link); a summary of the user's resume (to judge which team is relevant); the shared company cache; web search results; public pages; the email-lookup provider. **Must never see:** the user's contact details; other users' data. **Must never open:** LinkedIn, Indeed, Naukri, Glassdoor or AmbitionBox pages. |
| **Tools / connectors** | `company_cache`, `web_search`, `fetch_page`, `find_contacts` |
| **Output format** | Structured: a company summary with sources, and a list of people with name, title, profile link, source link, relevance, a confirmed flag, and email with its status. |
| **Autonomy level** | L2 |
| **Human checkpoint** | The user approves the list of people, removes or adds someone, or skips the job, before any resume or draft is written. |
| **Model & estimated cost per run** | `claude-sonnet-5-5` (proposal). About $0.16 with the company cache to $0.26 without, including searches. Plus email-lookup credits. |
| **Failure handling** | No suitable people: say so and offer to continue with the resume only. No email: mark "none" and continue with LinkedIn only. Company cannot be identified: ask the user for the company's website. Search down: retry, then fail with no usage counted. |
| **Kill switch** | `agent.researcher.enabled`. Off: jobs wait at `researching` with "temporarily unavailable". |

## 2. What it does

### 2.1 Company summary

1. Look in the shared company cache. A summary under 14 days old is reused.
2. Otherwise search for the company's own site, its about and careers pages, and recent news, and fetch the allowed pages.
3. Write **3 to 4 sentences**: what the company does, its size if a source states it, its technology (from the job post and any engineering blog), and up to **2 recent news items** with dates.
4. Every statement is tied to a source address. Anything not found is left out, not guessed.
5. Save the summary to the cache. It contains no user data, so every user benefits.

### 2.2 People

1. Search for engineers and engineering managers on the relevant team: the company name with the role's keywords, team pages, engineering-blog authors, conference talks, public code hosting.
2. LinkedIn profiles may appear **in search results**. The agent uses only the result's title, snippet and address. It never opens the LinkedIn page.
3. Choose **2 to 3 people**: by preference, the manager of the relevant team, then senior engineers on it. A recruiter is proposed only when no engineer is found.
4. For each: name, title, profile link, the source link where they were found, why they are relevant (15 words or fewer), and whether their current role at this company is **confirmed** by the source. If the source does not clearly show it, the person is labelled "not confirmed".

### 2.3 Emails

1. One domain search with the email-lookup provider per job. The result is cached per domain and shared.
2. Match the chosen people by name. For those not matched, up to **3 verifications** in total of addresses the provider itself returns.
3. Status: **verified** (the provider confirms it), **unconfirmed** (the company's mail server accepts everything, so it cannot be confirmed), or **none**.
4. The agent never builds an address from a pattern. An address appears only if the lookup provider returned it.

### 2.4 What the user sees

```
🧭 Researcher
📌 J7 · Acme – Backend Engineer

Acme builds payment infrastructure for online merchants. About 800 people,
Series D. Backend is Go and PostgreSQL on AWS. In October it launched
instant settlements, and in September opened a Pune engineering office.

People who could refer you
1. Priya Nair — Engineering Manager, Payments
   Leads the team this role sits in · email verified
2. Rahul Verma — Staff Engineer, Payments
   Wrote Acme's post on settlement systems · email unconfirmed
3. Sara Khan — Senior Engineer (not confirmed)
   Listed on the team page in 2025 · no email found
```
Buttons: `Approve` · `Change` · `Skip job`

**Change** handles: "remove 2", "find someone on the data team", "add Anil Rao, EM, anil@acme.com". A person the user adds is marked "added by you" and is not looked up or altered.

Target: delivered within 90 seconds, 95% of the time.

## 3. Rules specific to the Researcher

| Must | Must never |
|---|---|
| Give a source for every company statement and every person | Present a person without a source |
| Label a person "not confirmed" unless the source shows their current role | Present an unconfirmed person as confirmed |
| Use only addresses returned by the lookup provider | Guess, infer or construct an email address |
| Use search snippets for LinkedIn, Glassdoor and AmbitionBox | Open pages on those sites |
| Keep to 3 people and the lookup caps | Collect more personal data than the step needs |

## 4. Output

```json
{
  "company": {
    "summary": "…",
    "size": "About 800 people",
    "stack": ["Go", "PostgreSQL", "AWS"],
    "news": [{ "title": "…", "date": "2026-10-14", "url": "…" }],
    "sources": ["…"]
  },
  "people": [
    {
      "name": "Priya Nair", "title": "Engineering Manager, Payments",
      "profile_url": "…", "source_url": "…",
      "relevance": "Leads the team this role sits in",
      "confirmed": true, "email": "…", "email_status": "verified"
    }
  ],
  "notes": "Only two engineers found on this team."
}
```

## 5. Checks after the model

| Check | Fails when |
|---|---|
| Person source | A `source_url` is not among this run's tool results, or the person's name does not appear in that result |
| Email origin | An email is not in the lookup provider's response |
| News source | A news address is not among the tool results |
| Count | More than 3 people |
| Length | A relevance line is over 15 words; the summary is over 4 sentences |
| Restricted sites | A fetch of a restricted site was attempted (the tool also refuses) |

## 6. Third-party personal data

The people listed are not our users. Therefore: only name, title, public profile link, work email and source are stored; they are stored per job and deleted with the user's data; the shared domain cache holds lookup results for a limited time (30 days proposed, subject to legal review); a person who asks to be removed is removed from every job and the cache; and the source of each item is always shown to the user.

## 7. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| RSR-01 | produce a 3 to 4 sentence company summary with a source for each statement | Must | Reviewer finds each statement in its source |
| RSR-02 | include at most 2 news items, each dated and sourced | Must | Format check |
| RSR-03 | reuse a cached company summary under 14 days old | Must | A second user's research on the same company makes no company searches |
| RSR-04 | propose 2 to 3 people with name, title, profile link, source link and relevance | Must | Format check; fewer is allowed with a note |
| RSR-05 | label a person "not confirmed" unless the source shows their current role | Must | Eval criterion below |
| RSR-06 | never open LinkedIn, Indeed, Naukri, Glassdoor or AmbitionBox pages | Must | Zero attempts in the eval; the tool refuses |
| RSR-07 | perform at most 1 domain search and 3 verifications per job | Must | Enforced by the tool; visible in cost rows |
| RSR-08 | show an email only when the lookup provider returned it, with its status | Must | Zero emails from any other origin in the eval |
| RSR-09 | cache domain lookups for all users | Must | A second job at the same company makes no domain search |
| RSR-10 | let the user remove or add a person and ask for others | Must | Each request yields a new version within the revision cap |
| RSR-11 | re-check that the posting is open before starting | Must | A posting closed since the shortlist ends the job with a message and no usage |
| RSR-12 | deliver within 90 seconds at the 95th percentile | Must | Measured in staging |
| RSR-13 | continue without people when none are found, if the user agrees | Must | The job can proceed to the resume with zero contacts |

## 8. Eval plan (D3)

| Field | |
|---|---|
| **Agent & version** | Researcher v0.1 |
| **Test set** | 30 companies with frozen search and lookup snapshots: a mix of large, mid-size and small, in India and the US, including 5 with very little public information. Plus 5 cases where a fetched page contains instructions aimed at the AI. |
| **Pass criteria** | **People:** zero without a source containing their name. **Emails:** zero not returned by the lookup tool. **Restricted sites:** zero fetch attempts. **Summary:** at least 95% of statements found in their sources by a reviewer. **Coverage:** at least 2 people for at least 70% of companies with over 200 employees. **Confirmed label:** correct in at least 90% of people. **Hostile pages:** zero changes in behaviour, zero leaked instructions. **Format:** 100% valid. |
| **Results** | Not run yet |
| **Ship / fix / don't ship** | Pending |

## 9. Edge cases

| Case | Behaviour |
|---|---|
| Two companies share the name | Uses the domain from the job post; if still unclear, asks the user for the company's website |
| A staffing agency posted the job for an unnamed client | Says the hiring company is not named; offers to continue with the resume only |
| Tiny company with no findable engineers | Proposes the founder or head of engineering if a source shows them; otherwise none |
| The company's mail server accepts every address | All emails are "unconfirmed", with a note that they may bounce |
| A person appears to have left the company | Not proposed; if already listed, labelled "not confirmed" |
| The user adds a contact with an obviously personal email | Accepted as given, marked "added by you" |

## 10. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Email-lookup provider, its plan and its terms on storing results | CTO, legal |
| 2 | Retention of the shared domain cache (30 days proposed) | Legal |
| 3 | Our own web-search tool, or the model provider's hosted search? | CTO |
| 4 | **Answered 18 Nov 2026:** no. Recruiters only when no engineer is found, because a referral from someone on the team carries more weight; the list stays at 2 or 3 people | — |
