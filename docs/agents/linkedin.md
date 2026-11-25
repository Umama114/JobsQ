# Agent: LinkedIn

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Templates | Agent Spec (D1) and Eval Plan (D3), AI Engineering framework |
| Scope | Must have (V1) |
| PRD | §5 The agents · §7.3 step 4 · §9 |
| Related | [BACKEND.md §13](../BACKEND.md#13-agent-runtime), [features/09](../features/09-tracker.md) |

## 1. Agent spec (D1)

| Field | |
|---|---|
| **Agent name & product** | LinkedIn — JobsQ |
| **Owner** | [TBD] |
| **Job** | Draft, for each approved contact with a LinkedIn profile, a connection note and a message to send after the request is accepted, for the user to paste and send themselves. |
| **Inputs & data sources** | The approved contacts (name, title, relevance, profile link); the approved research summary; the approved tailored resume; the job's company and title. **Must never see:** the user's contact details; other users' data. **Has no access to:** LinkedIn in any form. |
| **Tools / connectors** | `read_tracker`, `write_tracker` |
| **Output format** | Structured: per contact, a connection note, a shorter version of it, and an after-acceptance message, with the source of each factual claim. |
| **Autonomy level** | L2 |
| **Human checkpoint** | Each note arrives in the chat (and the web app) **with a copy button** (decided 18 Nov 2026; WhatsApp and Discord: a text-only message plus a "send as plain text" button). The user copies each note into LinkedIn and sends it. JobsQ never opens LinkedIn. |
| **Model & estimated cost per run** | `claude-sonnet-5-5`, effort low (proposal). About $0.04 for three contacts. |
| **Failure handling** | A failed check triggers a rewrite, at most twice; then that contact is skipped with a note. A contact with no profile link is skipped with a note. |
| **Kill switch** | `agent.linkedin.enabled`. Off: the Email agent still runs. |

## 2. What it does

Runs when the user approves the resume, at the same time as the Email agent.

1. Take the approved contacts that have a profile link.
2. For each, write:
   - a **connection note under 300 characters**: who the user is in a few words, one specific reason for reaching out to this person, and a light ask;
   - a **short version of 200 characters or fewer**, because some LinkedIn accounts are limited to shorter notes **[verify the current limits]**;
   - an **after-acceptance message under 80 words**, to send once the person accepts: thanks, the role, one line of evidence, the ask.
3. Record each as `drafted` in the tracker.
4. The engine posts each connection note **as its own message**, so the user can copy the whole message in one action. The profile link is in the line above it.
5. The after-acceptance message is stored and shown on the dashboard. It is posted in chat when the user says the request was accepted (`accepted 1`), which is when it is needed.

### What the user sees

```
🔗 LinkedIn
📌 J7 · Acme – Backend Engineer

1. Priya Nair — https://www.linkedin.com/in/…
Copy the next message into the connection request:
```
```
Hi Priya, I'm a backend engineer working on payment systems in Go.
Your team's work on instant settlements is close to what I've built,
and I'm applying for the Backend Engineer role. I'd be glad to connect.
```

Later, after `accepted 1`:

```
Thanks for connecting, Priya. I've applied for the Backend Engineer
role on Payments. At Finly I cut settlement latency from 4 s to 600 ms
by moving reconciliation to an event queue. Would you be open to
referring me, or to a short chat about the team?
```

## 3. Rules specific to the LinkedIn agent

| Must | Must never |
|---|---|
| Keep the note under 300 characters, counted as LinkedIn counts them | Go over the limit, which would make LinkedIn cut it off |
| Give one specific, sourced reason for contacting this person | Invent a shared connection, group or past meeting |
| Base statements about the user on the approved resume | Add a skill or achievement the resume does not show |
| Write plain text | Include links, emoji or formatting in the connection note |
| Leave sending to the user | Open, log in to, read or post on LinkedIn |

## 4. Output

```json
{
  "drafts": [
    {
      "contact_id": "…",
      "connection_note": "Hi Priya, I'm a backend engineer …",
      "connection_note_short": "Hi Priya, backend engineer in payments, applying to your team. I'd be glad to connect.",
      "after_accept": "Thanks for connecting, Priya. …",
      "claims": [
        { "text": "instant settlements", "source": "research:company:news[0]" },
        { "text": "cut settlement latency from 4 s to 600 ms", "source": "resume:f05" }
      ]
    }
  ],
  "skipped": [{ "contact_id": "…", "reason": "no_profile" }]
}
```

## 5. Checks after the model

| Check | Fails when |
|---|---|
| Note length | 300 characters or more |
| Short note length | Over 200 characters |
| After-acceptance length | 80 words or more |
| Plain text | The connection note contains a link, emoji or markup |
| Claim sources, numbers, support | As for the Email agent |
| Name | The greeting does not use the contact's stored first name |

## 6. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| LNK-01 | draft a connection note under 300 characters for each approved contact with a profile link | Must | 100% within the limit in the eval |
| LNK-02 | also provide a version of 200 characters or fewer | Should | Offered with "shorter" |
| LNK-03 | draft an after-acceptance message under 80 words | Must | 100% within the limit |
| LNK-04 | post each connection note as its own message, with the profile link shown separately | Must | Copying the message yields only the note |
| LNK-05 | post the after-acceptance message when the user reports the request was accepted | Must | Arrives after `accepted 1` |
| LNK-06 | cite a source for every factual claim and pass the checks | Must | Zero unsupported claims in the eval |
| LNK-07 | skip contacts without a profile link and say so | Must | Named in the message |
| LNK-08 | never open, read or post on LinkedIn | Must | No tool exists that could; the fetch tool refuses the site |
| LNK-09 | record drafts in the tracker and update only on the user's report | Must | See TRK-11 |
| LNK-10 | apply change requests as new versions | Must | Earlier versions remain on the dashboard |

## 7. Eval plan (D3)

| Field | |
|---|---|
| **Agent & version** | LinkedIn v0.1 |
| **Test set** | The same 40 cases as the Email eval, using each contact's profile link. Includes names with non-Latin characters and very long titles. |
| **Pass criteria** | **Limits:** 100% within all three length limits, counted in characters as LinkedIn counts them. **Plain text:** 100% of connection notes free of links, emoji and markup. **Truth:** zero unsupported claims. **Specificity:** at least 90% give a sourced reason for contacting this person. **Tone:** a reviewer scores at least 4 out of 5 on a sample of 15. **Format:** 100% valid. |
| **Results** | Not run yet |
| **Ship / fix / don't ship** | Pending |

## 8. Edge cases

| Case | Behaviour |
|---|---|
| No contact has a profile link | No LinkedIn drafts; the user is told |
| The profile link came from a search result and may be the wrong person | The contact is already labelled "not confirmed"; the message repeats that label |
| The user is already connected to the person | They say so; the after-acceptance message is posted at once |
| LinkedIn limits how many personalised notes the user can send | The user can send the request without a note and use the after-acceptance message once connected. The reply to "I've hit my note limit" explains this |
| The contact was added by the user without a profile link | Email only |

## 9. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Confirm LinkedIn's current character limit and monthly cap on personalised notes for free and paid accounts | Build team |
| 2 | Should the short version be the default in markets where most users have free accounts? | Product owner |
