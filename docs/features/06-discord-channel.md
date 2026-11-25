# 06 — Discord channel

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Scope | Must have (V1): direct messages with the JobsQ bot. Stretch: the user's own private server with a thread per job |
| PRD | §6 item 5 · §6 stretch item 5 · §7.3 · §8 Channels |
| Backend | [BACKEND.md](../BACKEND.md) §11, §15.4, §15.5, §15.6 |
| Depends on | [04-channel-connection.md](04-channel-connection.md), [07-conversation-engine.md](07-conversation-engine.md), a Discord application |

## 1. Purpose

Deliver the whole JobsQ experience in a private direct-message chat between the user and the JobsQ bot, using Discord's official API. No shared server, so no other person can see the user's resume or job search.

## 2. Two modes

| Mode | Where | Per-job separation | Scope |
|---|---|---|---|
| **Direct messages** | The user's private chat with the bot | Job codes, reply routing and buttons, as on WhatsApp | V1 |
| **Own server** | A private server the user creates and adds the bot to | A real thread per job, as in the reference project | Stretch |

A JobsQ-owned community server with a private channel per user is rejected: its administrators could read every resume.

## 3. Application set-up

| Setting | Value |
|---|---|
| Application | One, named JobsQ, with avatar, description, privacy policy link and terms link |
| Installation | **To the user's account** (default). To a server only for the stretch mode |
| Scopes | `applications.commands` for the install; `identify` for linking the Discord account to the JobsQ account |
| Interactions | Delivered over HTTPS to `/webhooks/discord/interactions` |
| Gateway intents | `DIRECT_MESSAGES` only. It is not a privileged intent |
| Commands | Registered globally, available in the bot's direct messages |

## 4. Platform rules we design around

Rows marked "Discord" were read from Discord's developer documentation on 2026-11-16. Rows marked **[verify]** are from memory.

| Rule | Source | Consequence |
|---|---|---|
| An interaction must be acknowledged within 3 seconds | Discord | Acknowledge with a deferred response at once; do the work in the background |
| An interaction's reply token is valid for 15 minutes | Discord | Results are posted with the bot token to the direct-message channel, not through the interaction |
| Text typed in a direct message is delivered to the bot without the privileged message-content permission | Discord | Natural typing works in direct-message mode with no special approval |
| Typed messages arrive only on the gateway (a WebSocket), not on the HTTP endpoint | Discord | A small always-on gateway process is part of V1 |
| Direct messages are delivered on the first gateway connection; splitting connections is required only above 2,500 servers | Discord | One connection is enough for direct-message mode |
| Apps in 100 or more servers must be verified | Discord | Applies only to the stretch server mode |
| "Create DM" must not be used to message many users unprompted; opening many quickly can get the bot limited | Discord | We open a direct message only as part of a user's own connect action |
| An app installed to a user supports only the `applications.commands` scope; once installed, the user can open a direct message with it | Discord | The user can always reach the bot. Whether the bot can write first is open (section 10) |
| Message text up to 2,000 characters; embed description up to 4,096; up to 5 rows of components; up to 5 buttons per row; menus up to 25 options; a button's hidden id up to 100 characters; a link button's address up to 512 characters; attachments around 10 MB by default | **[verify]** | The adapter enforces the limits; long links go through short links |
| Rate limits apply per route and globally | Discord | The sender honours the limit headers and `retry-after` |

## 5. Commands

Typing works too ("find me backend jobs in Pune"). Commands exist for discoverability and for file upload.

| Command | Does |
|---|---|
| `/start` | Welcome and what to do next. Also completes linking when Discord refused our first message |
| `/find [what]` | Ask Scout for a shortlist, optionally with a few words |
| `/addjob [link or text]` | Work on a job the user found themselves |
| `/jobs` | Open jobs with their codes and stages |
| `/upload-resume [file]` | Upload or replace the resume |
| `/usage` | Usage against plan limits |
| `/help` | What each agent does and the common replies |
| `/link [code]` | Fallback linking with a code from the web app |
| `/stop`, `/unstop` | Stop and resume messages from JobsQ |

Stretch: `/prep`, `/followups`, `/digest`.

## 6. Message catalogue

Each agent posts as an embed whose author line is the agent's name, with one colour per agent. (The reference project's separate bot identities are not possible in direct messages and are not needed.)

| Moment | Format |
|---|---|
| Welcome | Embed with buttons: Find me jobs · How it works |
| Working on a step | Discord's own "thinking" state for a command or button; a typing indicator for typed messages |
| Shortlist | One embed listing the jobs, with a multi-select menu "Pick jobs" (1 to 8) |
| Research and people | Embed with buttons: Approve · Change · Skip job. **Change** opens a small form for the instruction |
| Tailored resume | The PDF and the Word file as attachments, an embed with what changed and gaps, a link button "Apply", and buttons: Approve · Change |
| Email draft | One embed per contact with subject and body, and a link button "Open in Gmail" |
| LinkedIn note | A plain message per contact containing only the note, so it can be copied whole |
| After the drafts | A multi-select menu "Which did you send?" |
| Tracker update, limit reached, error | Short embed |

Discord has no per-message charge and no 24-hour window, so progress and reminder messages are unrestricted here.

## 7. How messages reach us

| The user… | Arrives by | Then |
|---|---|---|
| Runs a command, taps a button, picks from a menu, submits a form | HTTPS interaction, signed | Signature checked, deferred acknowledgement returned, event stored and queued |
| Types a message or drops a file in the chat | Gateway WebSocket | Event stored and queued by the gateway process |

Both become the same inbound event and go through the same engine ([BACKEND.md §11](../BACKEND.md#11-inbound-message-lifecycle)).

## 8. Errors

Codes to be confirmed against Discord's reference **[verify]**.

| Signal | Meaning | Action |
|---|---|---|
| 50007 | Cannot send messages to this user (blocked us, removed the app, or privacy settings) | Count the failure; after repeats mark the link `unreachable`; banner on the web |
| 10062 | Interaction acknowledged too late | Metric and alert; this must not happen |
| 40005 | File too large | Should not occur for a one-page PDF or Word file; alert |
| 429 | Rate limited | Wait for `retry-after`, then retry |
| 401 | Bot token invalid | High-priority alert; sends pause |

## 9. Stretch: own-server mode

- The user creates a private server, adds the bot, and runs `/setup` in the channel they want to use.
- Scout posts shortlists in that channel. Each picked job gets its own thread, and every agent posts there.
- Bot permissions are the minimum: view the channel, send messages, send in threads, create threads, attach files, embed links, read history.
- **Private-space check:** on set-up and periodically, the bot confirms the server has only the user as a human member. If someone else joins, it stops posting resumes, contacts and drafts there and tells the user.
- Threads archive themselves after inactivity; the bot un-archives a thread when it has something to post.
- Reaching 100 servers requires Discord's app verification; start it before promoting this mode.

## 10. Open questions

| # | Question | How it is settled | Owner |
|---|---|---|---|
| 1 | **Can the bot send the first message to a user who installed the app to their account and shares no server with it?** Discord's documentation confirms the user can open the chat, but says nothing about the bot writing first, and third-party sources say a shared server is normally required | A 30-minute test in week 1. If no: the connect flow uses the "press Start" branch, and results that finish after a long gap wait for the user's next message, as on WhatsApp | CTO |
| 2 | Can `identify` and the account install be requested on one consent screen? | Same test. If no: two clicks | CTO |
| 3 | If the answer to question 1 is no and proactive messages matter, is a shared "home" server acceptable? It makes users visible to each other as members, which reveals that they are job-hunting | Product decision. This draft assumes **no** shared server | Product owner |
| 4 | Confirm every limit marked [verify] | Build team | Build team |
| 5 | Does Discord require app verification for a large number of account installs, as it does for servers? | Check with Discord developer support | CTO |

## 11. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| DC-01 | verify the Ed25519 signature of every interaction | Must | A tampered request is rejected with 401 |
| DC-02 | acknowledge every interaction within 3 seconds | Must | No late-acknowledgement errors in the load test |
| DC-03 | receive typed direct messages and file uploads through the gateway | Must | "find me jobs" typed in the chat starts Scout |
| DC-04 | keep exactly one active gateway connection, with a standby | Must | Killing the active process leads to takeover within 30 seconds with no duplicate events |
| DC-05 | recover messages missed during a gateway gap | Must | A message sent while the gateway is down is processed after reconnect |
| DC-06 | post results with the bot token to the user's direct-message channel | Must | A result that takes 20 minutes still arrives |
| DC-07 | render each message type within Discord's limits | Must | No send is rejected for size |
| DC-08 | carry the approval or job in every button and menu id | Must | A tap acts on the right job with three jobs open |
| DC-09 | provide the commands in section 5 | Must | Each responds as described |
| DC-10 | send resumes as PDF attachments | Must | The file opens and is named for the company and role |
| DC-11 | use short links for any address over 512 characters | Must | "Open in Gmail" works for a 120-word draft |
| DC-12 | honour rate limits | Must | No 429 storms in the load test |
| DC-13 | mark the link unreachable after repeated 50007 errors and show it on the web | Must | See CHAN-16 |
| DC-14 | honour `/stop` and `/unstop` | Must | After `/stop`, no messages are sent |
| DC-15 | support own-server mode with a thread per job and the private-space check | Stretch | A second human joining stops sensitive posts within one check cycle |
| DC-16 | send each outreach draft inside a code block in its own message (Discord shows a copy control on code blocks on desktop) with a button that sends it again as plain text | Must | The draft can be copied whole on desktop and on a phone |
| DC-17 | send the tailored resume as both PDF and Word attachments | Must | Both open and are named for the company and role |

## 12. Testing

- The local simulator sends signed interactions and gateway events.
- Contract tests compare rendered payloads with stored expected ones.
- A separate Discord application is used for `dev` and `staging`.
- The engine's test suite runs unchanged against the Discord and WhatsApp adapters.
