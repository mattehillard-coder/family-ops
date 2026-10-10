# Family Ops — Household Obligations App PRD

Oct 9, 2026 · @Matt

## Overview

Family Ops is a phone-first app that holds every recurring obligation of running a family of five, two cars, a home and two rentals, and shows what is due now, what is coming, and what is easy to forget. It is built with Claude Code for one user (Matt) first.

**Problem.** Obligations run on different clocks: fixed dates (birthdays), intervals from the last time something was done (oil, air filter), and seasonal windows (sports sign-ups). Today they live in memory, email and scattered calendars, so things slip, especially registration windows that open and close quietly.

**Goals**

- Nothing important is missed: birthdays, anniversary, sign-up deadlines, lease renewals, maintenance, and check-ins with extended family and friends.
- One glance answers "what do I need to do this week, and what is coming this season?"
- Adding an item takes under 10 seconds.
- AI proposes items (from a starter library and from Gmail); Matt approves every one.

**Non-goals for v1**

- Push notifications or automatic calendar invites (Matt opens the app on his own; calendar push is on demand).
- Rent collection, bookkeeping or expense tracking for the rentals.
- Multi-user sharing (Brittany comes later).
- A general to-do list or project manager.

## Users and phasing

v1 has one user, Matt, on his phone. The data model includes an owner field on every obligation from day one so Brittany can be added later without a migration.

| Phase | Who | Adds |
| --- | --- | --- |
| v1 (MVP) | Matt | Household profile, obligations, recurrence engine, Today and Year views, quick add, starter library suggestions, approval queue |
| v1.1 | Matt | Gmail scanning into the approval queue, on-demand Google Calendar push |
| v2 | Matt + Brittany | Second login, owner per task (Matt, Brittany, either), shared view |

## Household profile (seed data)

The app ships pre-loaded with these entities. Each becomes a card that holds its obligations and history.

**People**

| Person | Key dates | School (2026–27) | Activities |
| --- | --- | --- | --- |
| Matt | — | — | — |
| Brittany (wife) | Feb 1, 1986; anniversary Jun 9, 2017 | — | — |
| Everett | Born Mar 21, 2019 (turns 8 in 2027) | 2nd grade | Swimming, basketball, baseball, soccer, golf, Scouts |
| Cash | Born Jan 29, 2021 (turns 6 in 2027) | Kindergarten | Swimming, basketball, soccer, golf, Scouts (confirm) |
| Berkeley | Born Mar 3, 2023 (turns 4 in 2027) | Preschool; TK in fall 2027 | — |

June 9, 2027 is the 10th anniversary, so the app flags it as a milestone with a longer lead time.

**Assets and responsibilities**

| Entity | Details | Known recurring needs |
| --- | --- | --- |
| Home | \~2,000 sq ft, Moraga, CA; hot tub | HVAC air filter, weekly hot tub chemicals, seasonal maintenance |
| 2023 Toyota Sienna | Family car | Oil changes, deep clean 3x/year, registration |
| 2016 Honda CR-V | Second car | Oil changes, deep clean 3x/year, registration, smog |
| Rental 1 | Green Valley, AZ | Lease dates and renewals |
| Rental 2 | Green Valley, AZ | Lease dates and renewals |
| Cats (2) | — | Food and litter every 2 months |
| Household supplies | Costco | Run every other month |

Last-done dates (oil, filter, lease end dates) are entered during onboarding, not hard-coded.

## Extended family and friends (seed data)

Birthdays for extended family and friends create a **check-in** reminder: a nudge to text or call on the day, with the person's card showing when Matt last reached out.

**Reminder rules**

- Parents and in-laws (Mom, Londa, Dave, Stacy): card or gift, 14-day lead, plus a reach-out on the day.
- Other family and friends: reach out on the day, 1-day heads-up.
- Friends' kids: a lower-priority line on the parent's reminder ("Noa turns X today, mention it to Nate"), not a separate item.
- Remembrance dates (Dad, Uncle Griff): a quiet day-of note, never a "wish happy birthday" prompt.
- Marking a check-in done logs the date to the card's "last contacted" field. Tapping the reminder can open a text or call if a phone number is stored.

**Family**

| Name | Relationship | Birthday | Kids (birthdays) | Reminder |
| --- | --- | --- | --- | --- |
| Mom | Mother | Aug 23 | — | Gift, 14 days + day-of |
| Dad | Father (passed away Nov 27, 2025) | Mar 8 | — | Remembrance |
| Londa | Stepmother | Oct 22 | — | Gift, 14 days + day-of |
| Dave Rolfe | Father-in-law | Dec 9 | — | Gift, 14 days + day-of |
| Stacy Rolfe | Mother-in-law | Feb 26 | — | Gift, 14 days + day-of |
| Alli Rolfe | Sister-in-law | May 15 | — | Day-of check-in |
| Christina Rolfe | Sister-in-law | Jul 11 | — | Day-of check-in |
| Laurel Davies | Aunt | Dec 10 | — | Day-of check-in |
| Robert Hasson | Uncle | Apr 16 | — | Day-of check-in |
| Griff Hillard | Uncle (passed away) | Dec 27 | — | Remembrance |
| Jack Davies | Cousin | Jun 7 | Cloe and Shea (Sep 4) | Day-of check-in |
| Riley Novak | Nephew | Dec 31 | — | Day-of check-in |
| Hunter Novak | Nephew (confirm) | Jun 5 | — | Day-of check-in |
| Noah Novak | Nephew (confirm) | Date needed | — | Day-of check-in |

**Friends**

| Name | Birthday | Kids (birthdays) |
| --- | --- | --- |
| Nate Edelstein | Apr 15 | Noa (Feb 1) |
| Jordan Corbett | Sep 29 | — |
| Brian Hubbs | Dec 12 | — |
| Evan Fleming | Date needed | Lennon (Feb 7), Quincy (Aug 18) |
| Devon Wilson | Aug 16 | Bennett (Feb 9), Landon (Jul 11) |
| Sean O'Ran | Jul 13 | Frankie (Feb 23) |
| Aron Szecsey | Jun 14 | Isabelle (Jun 26) |
| Celine (last name?) | Sep 28 | — |
| Andrew Nesbit | Jul 24 | Reese (Jul 23); Maddie and Finn (dates needed) |
| Gauri Hearty | Date needed | Jai (Jul 29) |
| Anna Quant | Date needed | Roman Kabrich (Aug 5); Camilla and Daniel (dates needed) |
| Rishi Sachdeva | Aug 28 or 29 (confirm) | — |
| Nick Sgarlata | Dec 8 | — |

All friends get a day-of check-in. Missing dates are entered later from each person's card, and Quick add accepts "Noah Novak birthday is ..." to fill one in.

## Core concepts and data model

Everything is an **Obligation** attached to an **Entity**; the app generates dated **Occurrences** from it, and each completion is logged.

**Entities**

- `entity`: id, type (person, vehicle, property, pet, household), name, attributes (JSON: birthday, grade, VIN, address, mileage), circle (household, family, friend), relationship, linked parent or children, last\_contacted, deceased flag, notes.
- `contact`: id, name, role (coach, scout leader, property manager, mechanic), org, email, phone, linked entities, source (manual or Gmail).
- `org`: id, name, type (sports league, school, scout unit, vendor), website, linked entities.

**Obligations**

- `obligation`: id, title, entity\_id(s), category, owner (Matt for v1), recurrence (below), lead\_time\_days, priority (normal or milestone), notes, status (active, paused, archived), source (manual, library, Gmail).
- `occurrence`: id, obligation\_id, due\_date (or window start and end), state (upcoming, due, overdue, done, skipped, snoozed), snoozed\_until.
- `completion`: id, occurrence\_id, completed\_at, notes, cost, odometer, attachment link.
- `suggestion`: id, proposed obligation (JSON), reason, source (library or email with message link), state (pending, approved, edited, dismissed).

**Recurrence types**

| Type | Example | How the next date is set |
| --- | --- | --- |
| Fixed annual | Birthdays, anniversary, property tax | Same calendar date every year |
| Fixed calendar rule | Hot tub every Sunday; Costco first Saturday of odd months | RRULE |
| Interval from last done | Air filter every 60 days; oil every N months or miles | Last completion date + interval; mileage optional |
| Seasonal window | Soccer registration, TK enrollment | Opens and closes on dates that change yearly; confirmed each year |
| One-off | Renew passports by a date | Single due date |

**State rules**

- An occurrence becomes "due" when today is inside its lead time, and "overdue" after its due date.
- Interval items do not create the next occurrence until the current one is marked done, so a late oil change shifts the schedule.
- Seasonal windows roll forward with last year's dates marked "unconfirmed" until Matt or a Gmail suggestion confirms them.

## Views and UX

The app opens to **Today**, and every view is one thumb away in a bottom tab bar.

1. **Today** (home)
   - Sections: Overdue, This week, Next 30 days, Coming up big (milestones within 90 days, such as the 10th anniversary or TK enrollment).
   - Each row: title, entity chip, due date, and swipe actions (done, snooze 1 day / 1 week / custom, skip).
   - "Done" opens an optional sheet for notes, cost and odometer.
2. **Year**
   - A 12-month timeline with one swimlane per category (Family, Kids' activities, Cars, Home, Rentals, Pets and supplies, Admin).
   - Seasonal windows show as bars, fixed dates as dots; tap any item to open it.
   - This is the "what happens when" view for planning the sports calendar and big dates.
3. **Cards** (the CRM view)
   - One card per person, car, property and pet: key facts, contacts (coaches, scout leaders, property manager), upcoming obligations and completion history.
4. **Inbox**
   - The approval queue for AI suggestions, with a badge count.
5. **Quick add** (floating + button on every screen)
   - Natural-language input: "Change CR-V oil every 6 months, last done Aug 15" is parsed into a draft obligation for one-tap confirmation.
   - A manual form is the fallback.

**Onboarding**

- A one-time checklist asks for last-done dates (oil per car, air filter, hot tub filter, deep cleans), lease end dates, and current-season sports info.
- Any field can be skipped and filled in later.

**Phone-first requirements**

- Installable PWA (Add to Home Screen), usable one-handed, loads in under 2 seconds on cellular.
- Works read-only offline with the last synced data.

## AI suggestions and approval queue

AI never adds anything on its own: every suggestion lands in the Inbox, and Matt approves, edits or dismisses it.

**Suggestion sources**

1. **Starter library**: the obligation library below, filtered to this household (for example, smog checks only for the 2016 CR-V; TK enrollment only for Berkeley).
2. **Profile-driven gaps**: a weekly job checks each entity for obvious gaps, such as a car with no registration item, a child with no dental checkup, or a property with no lease end date.
3. **Calendar-driven**: ahead of each season, it prompts for that season's registration windows ("Spring baseball sign-ups usually open in winter. Add Everett's?").
4. **Gmail** (v1.1): see the next section.

**Each suggestion shows**

- The proposed obligation (title, entity, recurrence, lead time).
- A one-line reason.
- Its source, with a link to the email when it came from Gmail.

**Actions**

- Approve: creates the obligation.
- Edit and approve.
- Dismiss: the same suggestion is not repeated.
- Not now: snooze for 30 days.

**Guardrails**

- Dismissals are remembered.
- Suggestions are capped at 10 pending, ranked by urgency.
- Every AI-generated date carries a confidence label ("from email", "typical, confirm").

## Gmail scanning (v1.1)

A daily job reads new Gmail messages from known and likely senders, extracts obligations, contacts and organizations, and sends them to the Inbox as suggestions.

**What it looks for**

- **Activity registrations**: league or program name, child, season, registration open and close dates, cost, link.
- **Schedules**: season start, game and practice schedules, picture day, end-of-season events (stored as one-off items, not full calendars, in v1.1).
- **People**: coach, team parent, scout leader names and emails, which become contacts linked to the child and org.
- **School**: enrollment windows (TK for Berkeley), conferences, minimum days, forms due.
- **Property**: lease renewals, property manager notices, tax and insurance bills for the Green Valley rentals.
- **Service records**: oil change and car service receipts, which log a completion and reset interval items.

**How it works**

1. Google OAuth with the read-only Gmail scope only.
2. Pre-filter by sender allowlist (leagues, school district, scout unit, property manager, dealers) plus keyword search ("registration", "sign up", "season", "den", "lease"). Matt can add senders from any suggestion.
3. Claude extracts structured JSON (type, entity, dates, contacts, confidence, quote of the source line).
4. Deduplication against existing obligations and contacts before anything reaches the Inbox.

**Privacy**

- Raw email bodies are not stored; only the extracted fields and the Gmail message link.
- Scanning can be paused or disconnected from Settings.
- First run backfills the last 12 months so last year's season dates seed this year's windows.

## Google Calendar push (v1.1)

Any occurrence has an "Add to calendar" action that creates a single event in Matt's Google Calendar; nothing syncs automatically.

- The event gets the title, date or time, location if known, notes, and a link back to the item in the app.
- The app stores the event ID, so moving or completing the item offers to update or delete that event.
- Seasonal windows push as an all-day event on the deadline, not the whole window.
- Fallback before OAuth is set up: download an .ics file.

## Starter obligation library

The app seeds the items Matt named directly and offers the "Suggested" ones through the Inbox. Cadences marked "confirm" are common defaults to check against the owner's manual, lease or bill.

| Item | Category | Cadence | Lead time | Source |
| --- | --- | --- | --- | --- |
| Brittany's birthday (Feb 1, confirm) | Family | Annual | 21 days | Matt |
| Anniversary (Jun 9; 10th in 2027) | Family | Annual | 30 days (60 for 2027) | Matt |
| Everett's birthday (Mar 21) | Family | Annual | 42 days | Matt |
| Cash's birthday (Jan 29) | Family | Annual | 42 days | Matt |
| Berkeley's birthday (Mar 3) | Family | Annual | 42 days | Matt |
| Valentine's Day (Feb 14), milestone | Family | Annual | 21 days | Matt |
| Mother's Day (2nd Sunday of May): Brittany, Mom, Londa, Stacy; milestone | Family | Annual | 21 days | Matt |
| Father's Day (3rd Sunday of June): Dave; milestone | Family | Annual | 21 days | Matt |
| Extended family and friends birthdays (see that section) | Family | Annual | Day-of or 14 days | Matt |
| Anniversary of Dad's passing (Nov 27) | Family | Annual, remembrance | Day of | Suggested |
| Date night | Family | Monthly | 7 days | Suggested |
| Sports registration: swim, basketball, baseball, soccer, golf (per child) | Kids | Seasonal window | Opens to closes | Matt |
| Scouts registration renewal and den calendar | Kids | Annual | 30 days | Matt |
| Berkeley TK enrollment (fall 2027 start) | Kids | One-off window, confirm with district | 30 days | Suggested |
| School forms and back-to-school (all kids) | Kids | Annual, August | 21 days | Suggested |
| Summer camp registration | Kids | Seasonal window | Opens to closes | Suggested |
| Well-child checkups (each child) | Kids | Annual | 30 days | Suggested |
| Dental cleanings (family) | Family | Every 6 months | 30 days | Suggested |
| Sienna oil change | Cars | Interval: miles or months per Toyota schedule, confirm | 14 days | Matt |
| CR-V oil change | Cars | Per Maintenance Minder, \~6 months default, confirm | 14 days | Matt |
| Deep clean, each car | Cars | Every 4 months (3x/year) | 7 days | Matt |
| Registration renewal, each car | Cars | Annual, date from DMV notice | 30 days | Suggested |
| CR-V smog check | Cars | Every 2 years with registration, confirm on DMV notice | 30 days | Suggested |
| Tire rotation, each car | Cars | Every 5,000–7,500 miles, confirm | 14 days | Suggested |
| Auto insurance renewal | Cars | Every 6 or 12 months | 30 days | Suggested |
| Trash and recycling to the curb | Home | Weekly, Wednesday | Day of | Matt |
| HVAC air filter | Home | Every 60 days (shorter interval with 2 cats; confirm filter type) | 7 days | Matt |
| Hot tub chemicals | Home | Weekly | Day of | Matt |
| Hot tub filter rinse | Home | Every 2–4 weeks | 3 days | Suggested |
| Hot tub drain and refill | Home | Every 3–4 months | 7 days | Suggested |
| Smoke and CO detectors: test; replace batteries | Home | Monthly; annual | Day of | Suggested |
| Gutter cleaning | Home | Annual, before fall rains | 21 days | Suggested |
| HVAC service | Home | Annual | 30 days | Suggested |
| Wildfire defensible-space clearing | Home | Annual, spring (confirm local requirements) | 30 days | Suggested |
| Homeowners and umbrella insurance renewal | Admin | Annual | 30 days | Suggested |
| Lease end, each rental | Rentals | Per lease | 90 days | Matt |
| Renewal decision and notice, each rental | Rentals | Per lease | 60 days before notice deadline | Matt |
| Property tax, each rental (Pima County, two installments, confirm) | Rentals | Twice a year | 21 days | Suggested |
| Landlord insurance renewal, each rental | Rentals | Annual | 30 days | Suggested |
| Rental income and expense docs for taxes | Admin | Annual, January | 14 days | Suggested |
| Cat litter change | Pets and supplies | Weekly, Wednesday | Day of | Matt |
| Cat food and litter purchase | Pets and supplies | Every 2 months | 5 days | Matt |
| Costco run | Pets and supplies | Every 2 months | 5 days | Matt |
| Vet checkup, both cats | Pets and supplies | Annual | 30 days | Suggested |
| Tax prep and filing | Admin | Annual, Apr 15 | 60 days | Suggested |
| Holiday cards and gifts | Family | Annual, November | 30 days | Suggested |

## Architecture and tech stack

The app uses a WAT split (Workflows, Agents, Tools): deterministic code owns every date, Claude only reads text and proposes, and outside services sit behind thin tool wrappers.

&#91;embedded content: architecture · workflows, tools, agents\]

Agents can only write to the suggestions queue; nothing reaches core data until Matt approves it in the Inbox.

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js + TypeScript + Tailwind, installable PWA | Phone-first, one codebase, Claude Code knows it well |
| Backend | Next.js API routes on Vercel | No separate server to run |
| Database | Supabase Postgres with row-level security | Relational data, auth included |
| Recurrence | rrule library plus custom interval and window logic | Standard calendar rules; custom code for "from last done" |
| Scheduled jobs | Vercel Cron: daily due-state, daily Gmail scan, weekly suggestion pass | Runs without the app open |
| AI | Claude API via the Anthropic SDK, structured JSON output | Parsing, extraction, suggestions |
| Auth | Google sign-in, one allowed email in v1 | Same Google account later powers Gmail and Calendar |
| Integrations | Gmail API (read-only scope), Google Calendar API (events scope) | Minimum permissions needed |

An equivalent stack would work; this one should fit within free hosting tiers for a single user.

## Build plan for Claude Code

Build in eight milestones, each small enough for one or two Claude Code sessions and each ending in something usable on the phone.

| # | Milestone | Done when |
| --- | --- | --- |
| 0 | Repo, CLAUDE.md, schema, Google sign-in (single allowed account), deploy | Empty app loads on the phone from a live URL |
| 1 | Recurrence engine with unit tests for all five recurrence types | Tests cover late completions, snoozes, leap years and window rollover |
| 2 | Today view, manual add, done / snooze / skip | Matt can run his week from it |
| 3 | Seed household, entity cards, onboarding checklist | All people, cars, properties and pets have cards with baseline dates |
| 4 | Year view | 12-month swimlanes render on a phone screen |
| 5 | Starter library, Inbox, natural-language quick add | Library suggestions approve into real obligations |
| 6 | Gmail scanning | A real league email becomes a correct suggestion with contact and dates |
| 7 | Calendar push, PWA install, offline read | Add to calendar works; app installs to home screen |

**How to run it in Claude Code**

1. Save this PRD as `docs/PRD.md` in the repo.
2. Start each milestone in plan mode, pointing at the milestone row, and approve the plan before code is written.
3. Ask for tests first on milestone 1; the recurrence engine is the part most likely to have subtle bugs.
4. Keep a `docs/decisions.md` log that Claude Code appends to when it makes a design choice.

**CLAUDE.md starting points**

- Stack and commands (dev, test, migrate, deploy).
- "All dates are stored as dates in America/Los\_Angeles; never compute due dates in the client."
- "The recurrence engine is deterministic code; Claude is only called for parsing and suggestions."
- "No AI output writes to obligations directly; it always creates a suggestion."
- "Mobile-first: design for a 390px-wide screen before desktop."

## Success measures and open questions

Success is zero missed dates and deadlines over the first 12 months, with the app opened at least three times a week.

**Measures**

- Missed items: obligations that went overdue by more than 7 days without being snoozed. Target: zero for milestones and registrations.
- Add time: under 10 seconds from tap to saved via quick add.
- Suggestion quality: at least 70% of Gmail suggestions approved or edited, not dismissed.
- Coverage: every entity has at least one active obligation after onboarding.

**Open questions**

- [x] Is February 1 Brittany's birthday? yes
- [x] Are both boys in Scouts, and which pack or troop? Yes - both Pack 351,  Everett is in the Wolf Den, Cash is in the Lion Den
- [x] Which leagues and orgs run each sport (names and websites)? Gmail scanning can fill most of this. Next Level, LMYA, Campo Cabana Club CCC, First Tee
- [x] Rentals: lease end dates, property manager (if any), HOA (if any). 1213 W Camino Velasquez (lease 5/28/25 - 11/30/26), 1501 Via Del Jarrito original lease 5/22/25.- 2/28/26 extension 3/1/26 - 5/28/27
- [ ] Baseline dates: last oil change and mileage for each car, last air filter change, filter size, last hot tub filter change.
- [x] Hosting budget: free tiers should cover one user; confirm Claude API spend cap (for example, $10/month). $10/month
