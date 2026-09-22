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

# Commit messages are short

When Garreth asks for a commit message, give a **short, precise** one
(Garreth, 2026-09-22). A subject line, and at most a few lines of body when
something genuinely needs saying. Not an essay.

The detail belongs in `CHANGELOG.md`, which is written for reading. The commit
message only has to say what changed and which ticket it was. Do not repeat the
changelog entry, do not restate the reasoning, do not list what was and was not
verified — that is already in the changelog and the ticket.
