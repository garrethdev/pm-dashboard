@AGENTS.md

# Keep the changelog current

`CHANGELOG.md` tracks every change to this dashboard, newest first, in plain
language. Started 2026-09-10 with the first external code review.

**Update it as part of the work, not afterwards.** When a change lands, add its
entry in the same pass — a change that is not in the changelog did not happen as
far as the next person is concerned.

**Development work only.** Design tickets (the Carousel Generator design
screens under `docs/designs/`) get no changelog entry; their record is the
ticket's Status line (Garreth, 2026-09-14).

Three rules it is easy to get wrong:

- **Say where the change came from.** A review finding, a bug seen in
  production, or a decision and whose. That provenance is the point of the file.
- **Only list what is actually in the repo.** Considered-and-deferred work goes
  in `BACKLOG.md`. If an entry says something is fixed, it compiled and it is on
  `main`.
- **Be honest about verification.** "Confirmed live" means a query or a real
  run. A code change that has not met a real failure yet should say so.

Write it for Garreth, who is not a developer: plain English, no jargon, and say
what the user-visible consequence was rather than which function moved.

# Experiment results go into the knowledge base

The Account Experiments tab of the GLP Metadata sheet
(`19jR11mQ7kLdmutakHBTuZE0k0fQQXTvTPlFmnFRsuYg`, tab "Account Experiments")
holds our experiments; its Results column gets a new "As of <date>:" reading at
each check-in. **Whenever a check-in reaches a clear answer, the lesson also goes
into the knowledge base in Supabase (story-finder)** (Garreth, 2026-11-13).

- **Only clear answers.** A reading that is still muddied (too few posts, another
  change in the same window) stays in the sheet. A "leaning" answer may go in at
  `low` confidence, said plainly.
- **Right table.** What gets accounts banned or restricted (phones, numbers, IPs,
  warmups, posting rate) → `ban_knowledge_base`. What makes posts get views
  (format, timing, topic, how accounts post) → `content_knowledge_base`.
  Approved content rules feed the carousel writer except `timing` and
  `network_ops`; a posting decision belongs in `network_ops`, not `format`.
- **Traceable.** `source = 'account_experiment'`, `rule_key` starts `exp-`, and
  the rationale/evidence names the sheet row and the "as of" date with the numbers.
- **Garreth approves first.** Show the drafted rows in the session; write them
  only after he says yes, as `active` (`approved_by = 'garreth'` on content rules).
  Never write unapproved rows: we have not checked that every reader of
  `ban_knowledge_base` skips non-active rows.
- **Later readings.** If a later check-in agrees, raise `support_count` and set
  `last_reinforced_at`; if it disagrees, tell Garreth and propose the change.
  Before adding a rule, look for an existing one that says the same thing.

# Commit messages are short

When Garreth asks for a commit message, give a **short, precise** one
(Garreth, 2026-09-22). A subject line, and at most a few lines of body when
something genuinely needs saying. Not an essay.

The detail belongs in `CHANGELOG.md`, which is written for reading. The commit
message only has to say what changed and which ticket it was. Do not repeat the
changelog entry, do not restate the reasoning, do not list what was and was not
verified — that is already in the changelog and the ticket.
