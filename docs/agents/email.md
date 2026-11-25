# Agent: Email

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Templates | Agent Spec (D1) and Eval Plan (D3), AI Engineering framework |
| Scope | Must have (V1): first emails. Stretch: follow-up emails ([features/13](../features/13-follow-ups.md)) |
| PRD | §5 The agents · §7.3 step 4 · §9 |
| Related | [BACKEND.md §13–14](../BACKEND.md#13-agent-runtime), [features/09](../features/09-tracker.md) |

## 1. Agent spec (D1)

| Field | |
|---|---|
| **Agent name & product** | Email — JobsQ |
| **Owner** | [TBD] |
| **Job** | Draft one short, specific referral email for each approved contact that has an email address, ready for the user to open in their own mail and send. |
| **Inputs & data sources** | The approved contacts (name, title, relevance, email status); the approved research summary; the approved tailored resume (its lines and the facts they cite); the job's company, title and link. **Must never see:** the user's email, phone or address; other users' data. **Has no access to:** any mailbox. |
| **Tools / connectors** | `make_short_link`, `read_tracker`, `write_tracker` |
| **Output format** | Structured: per contact, a subject, a body, and the source of each factual claim. The greeting name and the sign-off are added by a template. |
| **Autonomy level** | L2 |
| **Human checkpoint** | The draft arrives in the chat (and the web app) **with a copy button**. The user copies it, or opens it in their own email, edits if they wish, attaches the resume and presses send. JobsQ sends nothing. |
| **Model & estimated cost per run** | `claude-sonnet-5-5`, effort low (proposal). About $0.05 for three contacts. |
| **Failure handling** | A failed check triggers a rewrite, at most twice; then that contact's draft is skipped with a note. A contact with no email is skipped with "LinkedIn only". |
| **Kill switch** | `agent.email.enabled`. Off: the LinkedIn agent still runs; the user is told email drafts are temporarily unavailable. |

## 2. What it does

Runs when the user approves the resume, at the same time as the LinkedIn agent.

1. Take the approved contacts whose email status is **verified** or **unconfirmed**. Contacts with no email are skipped.
2. For each, write:
   - a **subject** under 8 words;
   - a **body** of 120 words or fewer, with this shape:
     1. one line that is specific to this person or their team, taken from the research;
     2. one or two lines of the user's most relevant evidence for this role, taken from the approved resume;
     3. the ask: a referral, or 15 minutes to talk;
     4. a line saying the resume is attached.
3. The template adds "Hi {first name}," at the top and "Best regards, {user's name}" at the bottom.
4. Build the link that opens the draft pre-filled in Gmail, and a second for any other mail app. Store both behind short links.
5. Record each draft as `drafted` in the tracker.
6. The engine posts one message per contact, then one closing message.

### What the user sees

```
✉️ Email
📌 J7 · Acme – Backend Engineer

1. Priya Nair — Engineering Manager, Payments · email verified

Subject: Backend engineer interested in Payments

Hi Priya,

I read Acme's post on instant settlements and the queue-based design
is close to work I led at Finly, where moving reconciliation to an
event queue cut settlement latency from 4 s to 600 ms.

I'm applying for the Backend Engineer role on your team. Would you be
open to referring me, or to a 15-minute chat about the role?

I've attached my resume.

Best regards,
Aarav Mehta

Open in Gmail: https://jobsq.example/o/…
Other mail app: https://jobsq.example/o/…
```

Closing message:

```
Attach the resume PDF above before you send.
When you've sent them, reply  sent 1,2
```

Target: all drafts delivered within 30 seconds, 95% of the time.

## 3. Rules specific to the Email agent

| Must | Must never |
|---|---|
| Base every statement about the user on the approved resume | State an achievement, number or skill the resume does not show |
| Base every statement about the contact or company on the approved research | Claim a mutual connection, a past meeting, or having read something that is not in the research |
| Keep within the word limits | Flatter with invented specifics |
| Label an unconfirmed address as such | Draft to an address that was not found |
| Tell the user to attach the resume | Send anything, or imply it has been sent |
| Include no link other than the job's own | Include tracking links or images |

## 4. Output

```json
{
  "drafts": [
    {
      "contact_id": "…",
      "subject": "Backend engineer interested in Payments",
      "body": "I read Acme's post on instant settlements …",
      "claims": [
        { "text": "Acme's post on instant settlements", "source": "research:company:news[0]" },
        { "text": "cut settlement latency from 4 s to 600 ms", "source": "resume:f05" }
      ]
    }
  ],
  "skipped": [{ "contact_id": "…", "reason": "no_email" }]
}
```

## 5. Checks after the model

| Check | Fails when |
|---|---|
| Subject length | 8 words or more |
| Body length | Over 120 words, counted without the greeting and sign-off |
| Claim sources | A claim cites a source that does not exist in this job's resume or research |
| Numbers | A number in the body is not in a cited source |
| Support | The Checker finds a claim its source does not support |
| Links | Any address other than the job link |
| Recipient | The address is not the stored one for that contact |

## 6. The links

- **Gmail:** a compose address carrying the recipient, subject and body. It opens a filled-in draft in the user's own Gmail.
- **Other mail app:** a `mailto:` address with the same content.
- Both are stored behind **short links** on our domain. Reasons: a full compose address is long and ugly in chat, Discord limits a link button's address to 512 characters, and the draft's text should not sit in a visible address.
- A short link is unguessable, expires after 30 days, and needs no login, because it is opened on the user's phone. Opening it is recorded only for our own analytics and **never** counts as "sent".
- **Copy button (decided 18 Nov 2026).** The subject and the body each have a Copy button in the web app. On WhatsApp and Discord the draft is sent as its own text-only message (Discord: in a code block) with a "send as plain text" button; the platforms' real options are confirmed in the week-1 test ([recommendations §6](../archive/RECOMMENDATIONS_2026-11-18.md#6-outreach-text-with-a-copy-button)).
- Neither kind of link can attach a file. That is why the closing message reminds the user to attach the resume (PDF or Word).

## 7. Changes

The user can ask: "shorter", "more formal", "ask for a chat, not a referral", "mention the open-source work". Each produces a new version of that draft and uses one revision. A request to add something untrue is refused, as for the resume.

## 8. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| EML-01 | draft one email per approved contact that has an email | Must | Count matches |
| EML-02 | keep the subject under 8 words and the body within 120 words | Must | 100% in the eval |
| EML-03 | open with something specific to the person or team, taken from the research | Must | Eval criterion below |
| EML-04 | cite a source for every factual claim and pass the checks | Must | Zero unsupported claims in the eval |
| EML-05 | add the greeting and sign-off by template, not by the model | Must | The model's request contains no user email or phone |
| EML-06 | provide a Gmail link and a general mail link, each behind a short link | Must | Both open a draft with the exact recipient, subject and body |
| EML-07 | label unconfirmed addresses and skip contacts with none, saying so | Must | Shown in the message |
| EML-08 | remind the user to attach the resume | Must | Present in every run |
| EML-09 | record each draft as drafted, and never as sent without the user's report | Must | See TRK-11 |
| EML-10 | never send an email or access a mailbox | Must | No tool exists that could |
| EML-11 | apply change requests as new versions | Must | Earlier versions remain on the dashboard |
| EML-12 | deliver all drafts within 30 seconds at the 95th percentile | Must | Measured in staging |
| EML-13 | draft follow-ups under 60 words with a "Re:" subject | Stretch | [features/13](../features/13-follow-ups.md) |

## 9. Eval plan (D3)

| Field | |
|---|---|
| **Agent & version** | Email v0.1 |
| **Test set** | 40 cases built from the Researcher and Resume Tailor eval outputs: a contact, the research, the approved resume and the job. Includes 5 with very thin research and 5 where the research contains tempting but unsupported detail. |
| **Pass criteria** | **Limits:** 100% within subject and body limits. **Truth:** zero unsupported claims about the user or the contact. **Specificity:** in at least 90%, the opening line refers to a sourced fact about the person, team or company (with thin research, a plain honest opener is acceptable). **Links:** recipient, subject and body survive the round trip exactly in 100%. **Tone:** a reviewer scores at least 4 out of 5 on a sample of 15. **Format:** 100% valid. |
| **Results** | Not run yet |
| **Ship / fix / don't ship** | Pending |

## 10. Edge cases

| Case | Behaviour |
|---|---|
| No contact has an email | No email drafts; the user is told and gets LinkedIn notes only |
| Research has nothing specific about the person | A plain opener that states the role being applied for. Nothing invented |
| Contact added by the user | Drafted from what the user gave; no claims about the person beyond that |
| The user changes the resume after drafts exist | Drafts are marked as based on the earlier version; the user is offered a redraft |
| The body would exceed the address-length limit of a mail app | The short link still works for Gmail; the general link falls back to recipient and subject only, with "copy the text above" |
| The user is not a Gmail user | The general mail link, or copy and paste |

## 11. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Connect the user's Gmail to create real drafts with the PDF attached? Out of V1; needs Google's restricted-scope review | CEO, CTO |
| 2 | Should the sign-off include the user's phone or LinkedIn link? Proposed: name only | Product owner |
| 3 | Domain for short links | CTO |
