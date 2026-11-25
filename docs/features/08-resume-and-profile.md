# 08 — Resume upload and profile

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.4 (2026-11-25) |
| Scope | Must have (V1) |
| PRD | §5 The agents (first story) · §6 item 7 · §7.1 · §8 Resume and profile · §9 |
| Backend | [BACKEND.md](../BACKEND.md) §8.7 (`resumes`), §13, §17 |
| Depends on | A registered account ([01](01-registration-and-login.md)), file storage, an AI model (open) for the structured parse when the plan starts, and the Python libraries pdfplumber and python-docx for reading the file. No connected channel is needed for the first resume |

## 1. Purpose

The user's uploaded resume is **the only source of facts about them**. Everything the agents write about the user must trace back to it. This feature gets that resume in, turns it into structured facts, has the user confirm it, and keeps versions.

The first resume is added on the sign-up page, before the account exists, and **saved with the new account, before payment** (the start page asks for it only if it is missing). Later versions can be uploaded from Settings.

**How it is read.** pdfplumber (PDF) or python-docx (Word) extract the text in the Python API with **no AI model call**, and simple rules fill a form (name, email, phone, location, years, skills, sections). The user corrects name, email, phone, location and skills and saves. The checked details are passed to the AI when it reads the resume (Intake), which happens as soon as the plan starts. **Scanned or image-only files** have no text and are refused in V1.

## 2. Flow

### 2.1 The first resume

1. The user picks a PDF or Word file.
2. The file is checked (type, size) and its text is read. **No AI call is made.**
3. The form fills itself in; the user corrects it, adds a password and presses **Create account** (**Save my resume** when replacing it later).
4. When the plan starts (or at once if it already has), the AI reads the resume into the structured facts in section 5.

Uploads are to be limited per account per day **[TBD: 3 proposed]** (not built). The file size limit is 5 MB. An unpaid account's data is to be erased after **30 days** (to be confirmed by Abdul Muqtadir), and on request like other personal data, see [12](12-data-export-and-deletion.md).

### 2.2 Later: a new version

1. The user uploads a newer file from the dashboard's Resume panel, sends the file in the chat (on Discord, by dropping it in the chat or with `/upload-resume`), or says "I have a new resume".
2. Steps 2 to 4 of section 2.1 apply, with the summary shown in whichever place the user used.
3. A job already under way keeps its version (section 6).

The five-line summary, the same in both places:

```
Here's what I read:
• Aarav Mehta — Senior Backend Engineer at Finly (2021–now)
• 7 years of experience across 3 companies
• Top skills: Go, PostgreSQL, Kubernetes, AWS
• B.Tech, Computer Science, 2017
• 2 pages, 14 achievements

Looks right · Fix something
```

If a request was waiting for the new resume (for example a job search started in chat), **Looks right** also lets it continue by itself. A resume can be replaced at any time by uploading or sending a new file.

## 3. What happens to the file

| Step | Detail |
|---|---|
| Accept | PDF or Word (`.docx`). Size and page limits **open** (may depend on the user's experience; 5 MB and 5 pages were only a proposal) |
| Identify | Type is read from the file's bytes, not its name |
| Scan | Malware scan before anything opens it |
| Store | Original kept in encrypted storage under the user's prefix |
| Extract | Plain text from the PDF text layer or the Word document |
| Mask | Email addresses, phone numbers and links are found by pattern, stored for the resume header, and replaced with placeholders in the text |
| Parse | One model call turns the **masked text** into structured facts (section 5). The file itself is not sent to the model |
| Cross-check | Every employer, title, date, degree and number in the parsed facts must appear in the extracted text. A mismatch triggers one re-parse, then a failure message |
| Confirm | The user's tap makes it `active` |

Target: summary delivered within 30 seconds of upload.

## 4. "Fix something"

The user describes what is wrong ("my current title is Staff Engineer, not Senior").

- If the correction **matches the document** (we misread it), the facts are corrected and the summary is shown again.
- If the correction is **not in the document**, we say so: "Your resume says Senior Backend Engineer. If that's out of date, send me the updated resume and I'll use that." We do not take new facts from chat, because the truthfulness check has nothing to verify them against.

Whether a user may add verified-by-themselves facts without a new file is an open question (section 10).

## 5. Structured facts

The parsed resume is a list of facts, each with a stable id. The Resume Tailor must cite these ids, and the checker verifies against them.

| Group | Fields | Used how |
|---|---|---|
| Header | Name (from the account), email, phone and links (captured by pattern before parsing), city | Printed on the tailored resume by the template. Email, phone and links are **never sent to a model**, and no agent receives any header field |
| Summary | The user's own summary lines | May be reworded |
| Experience | Employer, title, start and end dates, location; achievements as separate facts | Employer, title and dates are copied exactly. Achievements may be reordered, shortened and reworded |
| Projects | Name, description, technologies | As achievements |
| Skills | Each skill as its own fact | May be reordered or dropped. None may be added |
| Education | Institution, degree, field, dates, grade | Copied exactly |
| Certifications, awards, publications | Name, issuer, date | Copied exactly |

Not carried into tailored resumes by default: photograph, date of birth, age, gender, marital status, religion, nationality, parents' names and full street address. These appear on many resumes but are not needed for an application and can invite bias.

## 6. Versions

- Each upload is a new version. The newest confirmed version is `active`.
- New jobs use the active version. **A job already under way keeps the version it started with**, so an approved resume never changes underneath the user.
- Older versions stay available for download on the dashboard. They are erased on request with the rest of the user's personal data ([12](12-data-export-and-deletion.md)).

## 7. Preferences from chat

Preferences are **not** collected at registration. How and when they are collected is open (PRD question 10). Once they exist, the user can change them on the web Preferences page or in chat: "only remote from now on", "add Bangalore". The engine recognises the intent, shows the change ("Work mode: remote only. Save?") and saves on confirmation. The web Preferences page shows the same values.

## 8. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| RES-01 | collect the first resume before payment and keep it | Must | After the plan starts, the AI reads it with no second upload; "find jobs" with no resume replies with a link to upload it |
| RES-02 | accept PDF and Word files within the size and page limits (limits open) | Must | Other types, larger files and longer documents get a specific message |
| RES-17 | read the file with pdfplumber (PDF) and python-docx (Word) and fill the form with no AI call | Must | An upload produces no model request until a plan is active |
| RES-03 | detect the file type from its content and scan it before opening | Must | A renamed executable is rejected |
| RES-04 | store the original encrypted, under the user's own prefix | Must | Another user's signed link request is refused |
| RES-05 | parse the resume into the structured facts in section 5 | Must | The eval set passes its criteria ([agents/resume-tailor.md](../agents/resume-tailor.md)) |
| RES-06 | reject parsed facts that do not appear in the document's text | Must | A seeded hallucination in the parse step is caught |
| RES-07 | show the filled form and let the user correct and save it | Must | Nothing is stored until the user presses Save |
| RES-08 | continue a waiting request after confirmation | Must | When a new resume was uploaded in chat while a request was waiting for it, the result follows "Looks right" with no further typing |
| RES-15 | limit resume uploads per account per day | Must | The fourth upload in a day **[TBD: limit]** is refused with a message |
| RES-16 | accept an upload from the dashboard and from chat as well as at registration | Must | Each creates a new version and the same summary and confirmation |
| RES-09 | correct misreadings on request and refuse facts that are not in the document | Must | Section 4 behaviour |
| RES-10 | keep versions, use the active one for new jobs, and leave jobs under way unchanged | Must | Uploading mid-job does not alter that job's resume |
| RES-11 | keep header contact details out of every model request | Must | A test inspects outgoing requests for the seeded email and phone |
| RES-12 | leave sensitive personal fields out of tailored resumes by default | Should | Section 5 list |
| RES-13 | let the user change preferences in chat with a confirmation | Should | The change is visible on the web |
| RES-14 | let the user download every version from the dashboard | Must | Files open correctly |

## 9. Edge cases

| Case | Behaviour |
|---|---|
| The file is not a resume (an invoice, a job description) | "This doesn't look like a resume. Please send your CV as a PDF or Word file." Nothing is stored as a resume |
| Password-protected PDF | "This file is locked. Please send a version without a password." |
| Scanned image with no text layer (pdfplumber finds no text) | "I can't read this file because it's a scan. Please send the original PDF or Word file." (Reading scans is a later improvement) |
| Unreadable or corrupt file | "I couldn't open that file. Could you send it again or export it as a PDF?" |
| Resume in another language | "I can only work with English resumes for now." |
| Very long resume | Accepted up to the page limit; the Tailor cuts and lists what it cut |
| The user sends a photo of a resume | Channel-specific "please send the file" reply |
| A file arrives when no resume was asked for | "Is this your new resume?" with Yes · No |
| New resume uploaded while a job waits for approval | That job keeps its version; the user is told the new one applies to new jobs |
| The user uploads but does not save | Nothing is stored |
| The user never confirms a new version uploaded later | The old version stays `active`; the next message repeats the new summary |
| The user abandons registration after uploading | The account stays. The unpaid-account retention rule is open ([12](12-data-export-and-deletion.md#7-open-questions)) |
| Resume contains instructions aimed at the AI | Treated as text. The parse step extracts facts only; the cross-check and the fixed schema limit what can come out |
| A phone number or email is written in an unusual format and the masking misses it | It reaches the parsing step only. The facts schema has no field for it, so it is not stored as a fact or passed to any agent. The seeded-data test covers the common formats for each launch market |

## 10. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Size and page limits: based on the user's experience, to be decided later. Also the format and length of the tailored resume the user receives | Product owner |
| 2 | May the user add facts in chat that are not in the file (for example a new certificate)? Proposed for V1: no, upload an updated resume | Product owner |
| 3 | Read scanned resumes using the model's document vision? Proposed: after V1 | CTO |
| 4 | Confirm the list of fields left out by default with counsel for each market | Legal |
| 5 | **Answered 25 Nov 2026:** read with no AI, saved before payment, read by the AI when the plan starts | CTO |
