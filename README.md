# JobsQ

A working version of the real JobsQ: website, backend, the six AI agents, WhatsApp (Meta's test number) and the two plans. Payments are left for later (plans start in test mode), as are Discord and the admin console. This is a prototype for review, not production code.

Documentation: [docs/README.md](docs/README.md). What is built today: [docs/CURRENT_BUILD.md](docs/CURRENT_BUILD.md).

## Run it yourself in VS Code

Everything runs in VS Code terminals that you open and close yourself. Nothing runs in the background.

### Before the first run (one time)

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Node.js](https://nodejs.org) 20.12 or newer, Git, and for the AI either [Claude Code](https://claude.com/claude-code) installed and signed in, or an Anthropic API key.

1. Get the code:

   ```powershell
   git clone https://github.com/Umama114/JobsQ.git
   ```

2. In VS Code, open the `JobsQ` folder (File > Open Folder), then a terminal (Terminal > New Terminal).
3. Make your own settings file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Open `.env` and fill in:

   | Setting | What to put | Needed for |
   |---|---|---|
   | `PASSWORD_PEPPER` | Any long random text. Don't change it after accounts exist | Sign-in |
   | `CONNECTOR_HOUSE_KEY` | Any long random text | Running the AI with Claude Code (Terminal 3) |
   | `ANTHROPIC_API_KEY` | Your key, instead of the line above | Running the AI with the Claude API |
   | `JSEARCH_RAPIDAPI_KEY`, `SERPAPI_KEY` | At least one (both have free tiers) | **Find me jobs** |
   | `HUNTER_API_KEY` | Optional | Contact emails for referrals |

   `.env` stays on your computer. It is never uploaded.

5. Open **Docker Desktop** and wait until it says it's running.
6. Install the website's packages (run it again whenever `frontend/package.json` changes):

   ```powershell
   npm --prefix frontend install
   ```

### Every time: 3 terminals

Open a new terminal for each one (the **+** button in the terminal panel). Each one stays open and shows what's happening.

**Terminal 1: backend and database**

```powershell
docker compose up
```

Wait until you see `Application startup complete` (the first run downloads things and takes several minutes). Code changes are picked up automatically. Add `--build` only when `backend/requirements.txt` changes; that downloads the Python packages again and needs a good internet connection.

**Terminal 2: the website**

```powershell
npm --prefix frontend run dev
```

Wait until you see `Ready`, then open http://localhost:3000.

**Terminal 3: the AI** (needed only while `ANTHROPIC_API_KEY` in `.env` is empty)

```powershell
node connector/jobsq-connector.mjs --house
```

This runs the agents with Claude Code on this PC, with your Claude Pro login. Each piece of work shows up as a `Working: ...` line, then a `Done: ...` line.

### Sign in

- **A ready-made account** (optional): set `SEED_NAME`, `SEED_EMAIL`, `SEED_PASSWORD` and `SEED_PHONE` in `.env`, then run the command below. The email is confirmed, the JobsQ AI plan is active and that number is linked for WhatsApp.

  ```powershell
  docker compose exec api python -m app.seed
  ```

- **To see what a new user sees**: register a new account (use a phone number no other account has). Emails aren't sent yet, so open the **Dev inbox** link on the start page to confirm the email.

### Stop everything

Press **Ctrl+C** in each terminal. Then, in any terminal:

```powershell
docker compose down
```

Your data stays (accounts, resumes, applications). It's there again the next time you run `docker compose up`.

### Run the tests

The tests use their own database (`jobsq_test`), so they never touch real accounts. With Terminal 1 running:

```powershell
docker compose exec api pytest -q
```

## What a user does

1. **Sign up**: upload a resume first. The form fills itself in from it (name, email, WhatsApp number, location, years, skills, sections); the user fixes anything, adds a password and creates the account. The resume is saved with the account, **before paying**. One account per phone number. Then **confirm the email** on the start page.
2. **Choose a plan.** As soon as the plan starts, the AI reads the saved resume. The user doesn't upload anything again. They can then **optionally connect WhatsApp** (needs an active plan; one tap on a phone, a QR code on a computer).
3. **Find me jobs** (the big button on Scout; results are a job list with full details beside it): Scout searches JSearch and Google Jobs, drops clearly senior titles, and the AI picks the jobs that fit.
4. **Pick a job**: the resume is tailored for it right away (a one-page PDF, with a preview).
5. Each job has a **Next step** button that walks through the order:
   1. Tailor the resume.
   2. Apply (open the job and use the PDF), then press **I've applied**.
   3. **Find referrals**: people the user already knows there come first (from their LinkedIn connections), then people found on the web. Emails come from Hunter.
   4. **LinkedIn messages** and **referral emails** for those people.
   5. **I got a reply**: interview prep for that company.
6. **Applications**: jobs grouped by stage (To apply, Applied, Interviewing, Closed), one row each with its progress and next step. Each job has notes.
7. **WhatsApp** follows the same flow: `find jobs`, `go 1,3`, `A1 applied`, `A1 linkedin`, `A1 email`, `A1 shortlisted`, `jobs`.

## The two plans

| Plan | Who pays for the AI | How it works |
|---|---|---|
| **JobsQ AI** | JobsQ | The Claude API (`ANTHROPIC_API_KEY` in `.env`, model `AI_MODEL`). Nothing for the user to set up. Without a key (development), Terminal 3 runs it with Claude Code on this PC. |
| **Your own AI** | The user (their Claude Code or Codex subscription) | The user runs the **JobsQ Connector** on their computer. It asks JobsQ for work, runs it with their Claude Code or Codex, and sends the answer back. The agents only work while it's open. |

To try **Your own AI** yourself:

1. Settings > Plan > **Your own AI** > Switch to this (test).
2. Settings > Your AI > **Make a connector key**.
3. In a 4th terminal, run the command it shows:

   ```powershell
   node connector/jobsq-connector.mjs --key <your key>
   ```

   The key is remembered after that: next time just run `node connector/jobsq-connector.mjs`.
4. Settings > Your AI turns green.

Real users download the connector from **Settings > Your AI**, or from `/download/connector`. They need Node.js and Claude Code or Codex, installed and signed in.

How the connector stays safe:
- It only makes outgoing requests.
- It runs the AI in an empty temporary folder, so the AI sees none of the user's files.
- Claude Code gets only web search and web fetch, and only for agents that need the web.
- Codex runs read-only.

## Switch to the Claude API

1. Put your key in `.env`: `ANTHROPIC_API_KEY=...`.
2. Restart Terminal 1: press Ctrl+C, then run `docker compose up` again.

Terminal 3 is no longer needed for the JobsQ AI plan.

## LinkedIn connections (better referrals)

1. On LinkedIn: Settings > Data privacy > **Get a copy of your data** > Connections.
2. LinkedIn emails a download link. Download it and unzip it.
3. Upload `Connections.csv` in JobsQ: Settings > LinkedIn connections.

For every job, **Find referrals** then lists the people you already know at that company first.

## WhatsApp (optional)

1. Use your own Meta developer app with WhatsApp added, and your own ngrok account (it gives you a fixed address). Put these in `.env`:

   | Setting | Where it comes from |
   |---|---|
   | `WHATSAPP_ACCESS_TOKEN` | WhatsApp > API setup > **Generate token** (expires about every 24 hours) |
   | `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp > API setup |
   | `WHATSAPP_DISPLAY_NUMBER` | The test number shown there, digits only |
   | `WHATSAPP_APP_SECRET` | App settings > Basic |
   | `WHATSAPP_VERIFY_TOKEN` | Any text you make up |
   | `PUBLIC_URL` | Your ngrok address, `https://<your-name>.ngrok-free.dev` |

2. Restart Terminal 1.
3. In a new terminal, run ngrok:

   ```powershell
   ngrok http 8000 --url=https://<your-name>.ngrok-free.dev
   ```

4. In Meta (WhatsApp, Configuration, Webhook), set:
   - **Callback URL**: `https://<your-name>.ngrok-free.dev/webhooks/whatsapp`
   - **Verify token**: the `WHATSAPP_VERIFY_TOKEN` from `.env`

   Keep `messages` subscribed.
5. From your phone, send `find jobs` to the test number.

While ngrok is on, only the backend is reachable from outside, and the test-mode tools (dev inbox, test plan buttons) are switched off for that address. This is still a development setup: stop ngrok when you're not testing.

Meta's test number can only message the numbers on its recipient list (up to five).

## What's inside

- **`backend/`**: Python 3.12, FastAPI, PostgreSQL, running in Docker.
  - Gotenberg prints the tailored resume to PDF.
  - Every AI call is logged in the `ai_calls` table, with time and tokens.
- **`frontend/`**: Next.js with TypeScript, with light and dark mode. On phones the sidebar becomes a bar at the bottom.
- **`connector/jobsq-connector.mjs`**: the JobsQ Connector.

Rules the code enforces:
- Links come from the search results, never from the AI.
- The resume PDF must fit one page (one retry, then you're told).
- Numbers in a tailored resume that aren't in the original are flagged.
- LinkedIn notes are checked for length.
- Emails come only from Hunter, never guessed.
- Agents only draft: nothing is sent for the user.

## Not built yet

- Payments (Razorpay or Stripe)
- Real email sending
- Discord
- Data export and deletion
- The admin console
- The production WhatsApp number

Agent work runs inside the API process. That's fine for testing; production would use a separate worker and queue.
