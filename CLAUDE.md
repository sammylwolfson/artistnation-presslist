# CLAUDE.md — artistnation-presslist
Owner: Sammy Wolfson (solo). Audited 2026-07-31 (first-run).

## What this is
Full-stack MVC web app to build/manage a press (journalist) list for Artist Nation. Node/Express RESTful API, MySQL + Sequelize ORM, Handlebars views. Auth via express-session + connect-session-sequelize, bcrypt password hashing, dotenv config, casual for seed data. Models: Journalist, Admin. Controllers for home/sort routes. Older/education-style full-stack project (has a real commit history incl. PRs). History includes a security commit replacing a hardcoded session secret with an env var.

## Rules
- Branch cody/nightly-YYYY-MM-DD only, never commit to main. No deploys/payments/external services without Sammy approval.
- Update Backlog + Run Log every run; summary to Agent Memory as dated file.

## FIRST-RUN PROTOCOL
1. Read git log, README, docs, code structure. Build on what exists.
2. Rescue any uncommitted work first.
3. Never force-push. Fetch and reconcile with origin before building; push cody/* branches only.

## Backlog (proposed for Sammy's review)
1. **BLOCKED — needs Sammy.** Decide if this is still active. If yes, upgrade deps (Express 4.18 / Sequelize 6.20 / mysql2 2.3 are all 2022-era) and audit for CVEs. Not started: it's a decision, not a task.
2. ~~Add CSV import/export for journalist contacts so it's actually usable as a working press list.~~ **DONE 2026-08-05** (`cody/nightly-2026-08-05`). Export honours the current search filter; import validates per-row with a preview mode, skip/update on existing emails, 5k row cap, whitelisted columns. See README "CSV import and export".
3. Add search/filter by outlet + beat; confirm the sort-routes actually cover the fields you pitch on. **Note:** there is no `beat` column on the Journalist model — adding it is a migration, so it needs your call. "Outlet" is `company`; CSV import already accepts "Outlet"/"Publication" as aliases for it.
4. **Verify no seed/admin default credentials ship enabled. → CONFIRMED A PROBLEM, see Findings.**
5. **NEW.** `sequelize.sync({ force: false })` in server.js means the schema is never migrated after first boot. Any new column (e.g. `beat` for #3) needs a real migration path.
6. **NEW.** `saveUninitialized: true` + no `cookie.secure`/`httpOnly`/`maxAge` in server.js session config. Session cookie goes over plain HTTP and is readable from JS.

## Findings (for Sammy — not fixed, needs your decision)
- **`seeds/admin-seeds.js` ships four admins with the password `password123`** — `joel`, `akeva`, `sammy`, `debbie`. `npm run seeds` also runs `sync({ force: true })`, which drops every table. If this app was ever deployed and seeded, those logins are live. Backlog #4 answered: **yes, default credentials ship enabled.** Not changed tonight — rotating credentials is yours, and I don't handle secrets.
- **`utils/auth.js` grants admin by hardcoded `user_id === 1`.** Whoever holds row 1 is the super-admin; delete and re-seed and it moves. Not an auth system, an accident of insert order.
- Fixed en route: **`PUT /api/journalists/:id` had no `withAuth`** — every other write on that router had it, so any unauthenticated caller could edit any journalist. Now guarded, with a regression test.

## Run Log
- 2026-07-31 (first-run audit): filled "What this is", proposed backlog. No code changes.
- 2026-08-05 (cody nightly): **backlog #2 done** on branch `cody/nightly-2026-08-05`. Added `utils/csv.js` (zero-dep RFC 4180 parser/serializer, formula-injection safe), `utils/journalist-csv.js` (pure import/export mapping + validation), export/import/template routes, `public/javascript/import-export.js`, toolbar on the journalists view, README docs. Fixed missing auth on `PUT /:id`. Added `test/` and wired `npm test` — **58 tests, repo had none before**. Two real bugs found and fixed by the tests: duplicate CSV headers silently overwrote each other, and the existing-email lookup depended on MySQL's collation being case-insensitive. No new npm dependency.
