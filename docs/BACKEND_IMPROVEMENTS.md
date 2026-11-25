# Backend improvements (suggested, not done)

Suggested on 2026-11-25. To be picked up later.

1. **A real job queue** (for example Redis with arq), so agent work survives an API restart and can be retried.
2. **Database migrations** (Alembic) instead of applying "if not exists" on every start.
3. **Rate limits** on sign-up, sign-in and Scout, per user and per address. (Sign-up resume reading already has a simple in-memory limit; move it to shared storage when there is more than one server.)
4. **A daily AI budget per user** on the JobsQ AI plan, using the token counts in `ai_calls`.
5. **Real email sending** (Amazon SES or Postmark) and automatic renewal of the WhatsApp token.
6. **Error tracking and monitoring:** Sentry, and a health check that covers the database, PDF printer and job search services.
7. **Backups and file storage:** nightly database backups; resumes and PDFs in cloud storage; delete a user's files with their account.
8. **Launch security:** refuse to start with the dev password pepper or `DEV_MODE=1`, HTTPS only, secure cookies, test plan buttons off.
9. **Logging:** a request ID per request; no resume text or phone numbers in logs.
10. **Outside services:** cache Hunter results; retry JSearch, SerpApi and Hunter with backoff.
11. **Account deletion and data export** for users.
