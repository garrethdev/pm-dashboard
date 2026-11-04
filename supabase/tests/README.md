# Database tests

Plain SQL that checks the rules living in Postgres and nowhere else. Each file
is one `do` block that builds its own test rows, checks them, and then ends with
`raise exception 'RESULT ...'` so **everything it made is rolled back**. Run one
against the live project (Supabase SQL editor, or `execute_sql`) and read the
JSON in the error: every value should be `true` (the scores and counts are
shown for reading).

| File | What it proves |
|---|---|
| `outlier_trigger_and_decay.sql` | A radar candidate stays hidden until its analysis is `complete`; then it becomes a Trends carousel with `trending_at`, a score of 8 to 10 and the right niche tag (`other_niches` for an off-niche post); a re-read does not move `trending_at`; a normal carousel is never touched; `outlier_decay()` leaves a fresh find alone and drops one older than 7 days to between 5 and 8 |
| `job_queue.sql` | `claim_content_pipeline_jobs` hands out best priority first and never the same job to two workers; only the owner can finish a job; a failure retries after a delay and becomes `failed` at the attempt limit; a dead worker's job is given back after its lease; blank worker and over-large limits are refused |

Last run 2026-10-31 against the live database: every check true, and a follow-up
query found no leftover test rows.

`job_queue.sql` borrows the retired `deep_judge` job type (the table only allows
known types) and stops itself if any real `deep_judge` job exists.

These are not in `npm test` or CI: CI has no database. Moving them there is step
3 of the test plan and needs the missing tables put into `migrations/` first.
