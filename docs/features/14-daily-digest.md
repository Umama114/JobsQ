# 14 — Daily digest

> **What is built today** is in [CURRENT_BUILD.md](../CURRENT_BUILD.md). This document describes the V1 target; parts not listed there are planned. Updated 2026-11-25 for the new plans, resume timing and order of work.

| | |
|---|---|
| Status | Draft v0.1 (2026-11-16) |
| Scope | **Stretch**, third in the PRD's stretch order |
| PRD | §6 Stretch item 3 |
| Backend | [BACKEND.md](../BACKEND.md) §10, §20.2; archive/PLAN.md §5 |
| Depends on | [Scout](../agents/scout.md); on WhatsApp, an approved template and business verification for volume |

## 1. Purpose

Tell the user about new matching jobs without waiting to be asked, so good roles are not missed and the user returns each day.

## 2. How it works

1. The user turns the digest on and picks a time (Preferences page, or "send me new jobs every morning").
2. Shortly before that time, Scout runs for the user and keeps only jobs **not shown before**.
3. If there are at least 3 new matches, the digest is sent. Fewer than 3: nothing is sent that day.
4. Delivery:
   - **WhatsApp:** the template `jobsq_daily_digest` — "4 new jobs match your profile today." with **Show me** and **Pause**. Tapping **Show me** opens the 24-hour window and the shortlist follows as a normal message.
   - **Discord:** the shortlist itself, with the pick menu and a **Pause** button.
5. Picking a job from a digest works exactly like picking from any shortlist.

## 3. Rules

1. Off by default. The user opts in.
2. At most one digest per day, at the user's chosen local time, never between 21:00 and 08:00.
3. Never repeat a job the user has already been shown.
4. Up to 5 jobs per digest.
5. **Pause** stops the digest until the user turns it back on. Three digests in a row with no tap pause it automatically, with one note saying so. This protects the WhatsApp number's quality rating.
6. No digest when the subscription is not active or the user has opted out.

## 4. Cost and scale

This is the feature that makes "search once per user" too expensive.

| Concern | Detail |
|---|---|
| Search cost | A Scout run per subscribed user per day. With 10,000 users that is 10,000 searches a day unless they are shared |
| The fix | Search by distinct **role and city**, not by user, and reuse the results. archive/PLAN.md §5 describes the fuller version: collect postings once into a shared index, then match each user against it |
| WhatsApp cost | One template per user per day. Meta may class this template as **marketing**, which costs several times more than utility and requires its own opt-in |
| WhatsApp limit | Templates count against the limit on messages outside the window: 250 unique users a day unverified, 2,000 after verification, scaling from there |
| Model cost | The rerank step can run through the batch interface at half price |

Because of these, the digest should launch on Discord first and on WhatsApp only once verification is complete and the template's category and price are known.

## 5. Functional requirements

| ID | The system shall… | Priority | Acceptance |
|---|---|---|---|
| DIG-01 | let the user turn the digest on and off and set its time | Must | Works from chat and the Preferences page |
| DIG-02 | send at most one digest per day at the chosen local time, outside quiet hours | Must | Verified for users in three timezones |
| DIG-03 | include only jobs not shown to the user before | Must | No repeat across 14 consecutive days in a test |
| DIG-04 | send nothing when fewer than 3 new matches exist | Must | No message on a thin day |
| DIG-05 | use a template on WhatsApp and a normal message on Discord | Must | Correct in both adapters |
| DIG-06 | pause on request and after 3 unopened digests | Must | The fourth is not sent; one note explains |
| DIG-07 | share search results across users with the same role and city | Must | 100 users with identical preferences cause one provider search |
| DIG-08 | let the user pick jobs straight from the digest | Must | Same behaviour as a normal shortlist |
| DIG-09 | not send to users without an active subscription or who opted out | Must | Verified |
| DIG-10 | record the cost of each digest | Must | Cost per digest is visible per channel |

## 6. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Does a digest count against the daily shortlist limit? Proposed: no | CEO |
| 2 | Is the digest on both plans (JobsQ AI and Your own AI)? | CEO |
| 3 | Will Meta class the template as marketing, and at what price? | Build team, at submission |
| 4 | Build the shared job index before or with this feature? | CTO |
