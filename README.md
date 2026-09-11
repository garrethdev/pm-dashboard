# Peptide Miracles dashboard

The content-operations dashboard: accounts, posting cadence, the content
calendar, inventory, analytics and incidents. Next.js, deployed on Vercel,
reading a Supabase project (`qlcmgxgwpzmiebzxflai`) and n8n.

Live: https://pm-dashboard-ashen.vercel.app/

## Run it on your own machine

Open a terminal in VS Code — **Terminal → New Terminal**, or `` Ctrl+` `` — and
run these two lines:

```bash
cd "/Users/czedcaceres/Documents/Peptide Miracles Dashboard/pm-dashboard"
npm run dev
```

**There are two folders with almost the same name, and only one of them runs.**
`Peptide Miracles Dashboard` is the outer container — handoff docs, the logo
files, the design file. The app is `pm-dashboard` inside it. A terminal opened
in VS Code usually starts in the outer one, so the prompt reads
`… Peptide Miracles Dashboard %` and `npm run dev` would fail there.

If you are already in the outer folder, one word is enough:

```bash
cd pm-dashboard
npm run dev
```

You are in the right place when the prompt ends `… pm-dashboard %`.

Wait for `Ready in …`, then open **http://localhost:3000**.

That is it. You do not need to log in: `.env.local` sets `AUTH_BYPASS=true`,
which skips the magic-link sign-in on your own machine only. It has no effect on
the deployed site.

**To stop it:** click into that terminal and press `Ctrl+C`.

**Leave it running while you work.** Saving a file reloads the page by itself —
there is no need to stop and start it between changes.

### After pulling new changes

Only when someone has added a new package:

```bash
npm install
```

If the site throws an error about a missing module right after a `git pull`,
that is the fix.

### If it will not start

**"address already in use" / "port 3000 is in use"** — it is already running in
another terminal tab. Either use that one, or close it and start again.

**A blank page, or every panel showing an error** — check `.env.local` still
exists in this folder. It holds the database and API keys and is deliberately
not in git, so it does not travel with a clone.

**Changes not showing** — hard-refresh the browser (`Cmd+Shift+R`).

### Checking your work before you push

```bash
npm test        # the unit tests — a couple of seconds
npm run typecheck
npm run build
```

GitHub runs all three on every push and pull request, and a failure blocks the
merge. Running them here first saves waiting for the answer.

`npm run lint` also works, but it currently reports 32 errors that predate the
tests and are being cleared separately — CI reports that count rather than
failing on it, so do not be alarmed by it, and do not add to it.

## What is live and what is only local

Running locally still reads and writes **the real production database**. There
is no separate test database. A cadence change made at localhost:3000 is a
cadence change, and the scheduler will act on it.

The only thing local-only is the sign-in bypass.

## The other files worth knowing

| File | What it is |
|---|---|
| `CHANGELOG.md` | Every change, newest first, in plain language |
| `BACKLOG.md` | Open work, split V1 (shipping) / V2 (deferred) / V3 (architecture) |
| `supabase/migrations/` | Every schema change the dashboard depends on, plus a README that explains what the folder is and is not |
| `CLAUDE.md` | Conventions for Claude Code working in this repo |
| `.github/workflows/ci.yml` | The checks GitHub runs on every push, and why lint is not one of the blocking ones |
| `src/**/*.test.ts` | The unit tests, each one sitting next to the file it tests |

## Deploying

Pushing to `main` deploys to production through Vercel. There is no separate
release step, so a push is a deploy.

If a change needs a database migration, **apply the migration first**. The code
and the database go live together, and code that calls a function which does not
exist yet fails on the deployed site rather than at build time.
