# Family Ops

Phone-first app that tracks every recurring obligation for Matt's household: family and friends' birthdays, kids' activities, cars, home, two Arizona rentals, pets and supplies. The full spec is in `docs/PRD.md`. Read it before planning any milestone.

## How we work

- Build one milestone at a time, in the order of the "Build plan" table in `docs/PRD.md`. Do not start the next milestone until Matt says so.
- Plan first. Present a short plan (files to create or change, schema changes, open questions) and wait for approval before writing code.
- Matt is not a full-time engineer. When a step needs him to do something outside the code (create an account, click through Google Cloud, set an environment variable), give numbered, click-by-click instructions and say exactly what to paste where.
- After each milestone: run tests, run the app, tell Matt how to check it on his phone, then commit with a clear message.
- Log any non-obvious design choice in `docs/decisions.md` (date, decision, why).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, installable as a PWA
- Supabase Postgres with row-level security; Supabase Auth with Google sign-in
- Hosted on Vercel; scheduled jobs via Vercel Cron
- Recurrence: `rrule` library plus custom code for "interval from last done" and seasonal windows
- AI: Claude API via the Anthropic TypeScript SDK, structured JSON output
- Google APIs (milestone 6+): Gmail read-only scope, Calendar events scope

## Commands

- Dev server: `npm run dev` (runs on http://localhost:3000)
- Build: `npm run build`
- Lint: `npm run lint`
- DB migrations: apply `supabase/migrations/*.sql` via the Supabase dashboard SQL editor
- Deploy: push to `main` on GitHub → Vercel auto-deploys

## Architecture rules (Workflows, Agents, Tools)

- **Workflows** are deterministic code: the recurrence engine, due/overdue state, calendar push. Every date the app shows is computed here, never by the AI.
- **Agents** are Claude API calls: quick-add parsing, the suggestion engine, Gmail extraction. Agents only ever write to the `suggestions` table. Nothing AI-generated reaches obligations, contacts or entities until Matt approves it in the Inbox.
- **Tools** are thin wrappers around outside services (Gmail, Google Calendar, Google sign-in). Keep API-specific code in `lib/tools/`.

## Data and date rules

- All dates are stored as dates in America/Los_Angeles; never compute due dates in the client.
- The recurrence engine is deterministic code; Claude is only called for parsing and suggestions.
- No AI output writes to obligations directly; it always creates a suggestion.
- Interval items ("every 60 days from last done") create the next occurrence only when the current one is marked done.
- Seasonal windows roll forward with last year's dates flagged "unconfirmed" until confirmed.
- Every obligation has an `owner` field (Matt for now) so Brittany can be added later without a migration.
- People who have passed away (`deceased` flag) get remembrance reminders, never "wish them happy birthday" prompts.

## UI rules

- Mobile-first: design for a 390px-wide screen before desktop.
- One-handed use: primary actions within thumb reach, bottom tab bar (Today, Year, Cards, Inbox), floating + for quick add.
- Swipe or one tap to mark done, snooze or skip.

## Testing

- The recurrence engine needs unit tests before it is used anywhere: all five recurrence types, late completions, snoozes, leap years, window rollover, end-of-month dates.
- Add a test for every bug fixed in date logic.

## Secrets and privacy

- Secrets live in `.env.local` (gitignored) and in Vercel environment variables. Never commit them, print them in logs, or hard-code them.
- Expected variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_EMAIL`, `ANTHROPIC_API_KEY` (milestone 5+), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (milestone 6+).
- Only the email in `ALLOWED_EMAIL` can sign in.
- Gmail: request the read-only scope only. Never store raw email bodies; store extracted fields plus the Gmail message link.
- Google's Testing-mode refresh tokens expire after 7 days. Detect `invalid_grant`, pause Gmail jobs, and show a "Reconnect Gmail" banner instead of failing silently.
