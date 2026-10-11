# Design Decisions

Append each decision as: `### YYYY-MM-DD — Title` followed by the reasoning.

---

### 2026-10-09 — Supabase Auth over NextAuth for Google sign-in

Used Supabase's built-in Google OAuth provider rather than NextAuth. Supabase Auth gives us RLS policies tied to `auth.uid()` with no extra wiring, and the same Google OAuth consent screen will later power Gmail and Calendar scopes in milestones 6–7. One fewer dependency.

### 2026-10-09 — Single ALLOWED_EMAIL env var for access control

Rather than an allowlist table or Supabase's built-in email restrictions, the middleware checks `session.user.email` against a single `ALLOWED_EMAIL` env var and signs out anyone else. Simple to reason about for a one-user app; when Brittany is added in v2 this becomes a comma-separated list or moves to a DB table.

### 2026-10-09 — All dates stored as Postgres `date`, not `timestamptz`

Obligations are calendar-date concepts ("due March 21"), not instants in time. Storing them as `date` avoids timezone-conversion bugs in queries and enforces the rule that due-date math happens server-side in America/Los_Angeles.

### 2026-10-09 — PWA manifest without service worker in milestone 0

The PRD assigns offline read to milestone 7. Milestone 0 ships the web app manifest (so "Add to Home Screen" works on iOS/Android) but no service worker. This avoids caching bugs while the schema and views are still changing rapidly.
