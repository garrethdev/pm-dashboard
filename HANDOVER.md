# Handover — 2026-09-07

Written at the end of a long session so the next one starts from evidence
instead of rediscovery. Read the **Blocked right now** section first; everything
else can wait.

Owner: Garreth (garreth@arborvita.io). He calls the commits and the pushes —
never commit unprompted, but do suggest one once work piles up.

---

## 1. Blocked right now — Vercel builds do not run

**This is the only thing standing between the team and a working product.**

The app is deployed at **https://pm-dashboard-ashen.vercel.app** and the auth
gate works (`/` → 307 → `/login`, `/login` → 200). But the live site is a build
from ~1 hour before this doc was written, and **every deployment since has
failed to build**.

The symptom, from `vercel ls`:

```
10m   pm-dashboard-ao97h1p3n…   UNKNOWN   Production   ?
1h    pm-dashboard-erod6v9v2…   ● Ready   Production   56s   ← the only build that ever ran
```

Deployments are created, sit at `UNKNOWN` with `0ms` of build time, never become
ready, and sometimes vanish. `vercel promote` refuses them with *"not ready and
cannot be promoted"*. `vercel inspect --logs` returns nothing.

**Already ruled out — do not re-check these:**

| Suspicion | Finding |
|---|---|
| Our code | Builds clean locally every time, 35/35 pages |
| Plan / quota limits | Account is on **Pro**, no banner on project or account |
| Vercel incident | vercel-status.com all green |
| GitHub integration | Direct `vercel deploy --prod` from the CLI fails identically |
| Wedged build queue | 7 stuck deployments were removed; the next one stuck too |
| Alias not moving | Real cause is deeper — deployments genuinely are not ready |

**What was never obtained**, because it needs the dashboard and the CLI hides it:

1. The **status word** the Vercel dashboard shows for the top deployment
   (Queued / Building / Error / Canceled) and any red error line on that page.
2. **Settings → Git → Ignored Build Step.** If a command sits in that box,
   Vercel runs it before each build and skips the build when it exits `0` —
   which produces exactly this signature. This is the leading untested theory.

Ask Garreth for those two as **text**. See §8 for why not a screenshot.

**Consequence that matters:** Vercel captures environment variables when a
deployment is created, so the allowlist additions never took effect.
**Yurie, Milan and Czedrick cannot sign in.** Do not tell anyone to onboard
until one deploy succeeds. One successful build fixes everything queued up:
the login redesign, the greeting names, and the allowlist.

---

## 2. What this project is

A Next.js 16.3.3 dashboard (App Router, React 19, Tailwind v4, TypeScript) for
running a fleet of ~35 TikTok/Instagram accounts: health, content inventory,
scheduling, proxies and phone numbers, analytics, and post-ban cleanup.

Repo `garrethdev/pm-dashboard` (private). App root is the repo root, at
`/Users/czedcaceres/Documents/Peptide Miracles Dashboard/pm-dashboard`.

Data comes from Supabase plus four vendor APIs (GeeLark, proxy-cheap,
TextVerified, ScrapeCreators) read live at page load, and n8n for automation.
`AGENTS.md` in the repo root is written by `next dev` — commit it with your work
rather than fighting it.

---

## 3. Standing constraints — read before touching anything

- **Never commit or push unprompted.** Garreth decides.
- **`.env.local` must never be staged.** It holds the Supabase service-role key,
  GeeLark bearer token, proxy-cheap, TextVerified and ScrapeCreators keys. It is
  gitignored; if it ever shows in `git status`, stop and flag it.
- **Never `select=*` on the `accounts` table.** It carries live passwords and
  tokens. Always select explicit columns. The rule is documented at the top of
  `src/lib/data/supabase.ts`.
- **n8n `update_workflow` only saves a draft.** Compare `versionId` against
  `activeVersionId` and call `publish_workflow`, or the change never goes live.
- **The cyan accent is locked.** Ration it — roughly one accent-coloured control
  per screen — rather than recolouring it.
- **Lint baseline is 36 problems** (35 errors, 1 warning), all pre-existing.
  That number should not grow.

---

## 4. Git and deployment state

Working tree clean. `main` and `origin/main` identical at `95856e4`.

```
main                   95856e4   ← everything merged, pushed
design/overhaul-shell  a569f1a   ← merged into main, safe to delete
perf/cache-components  6d7e114   ← merged into main, safe to delete
```

Both branches are fully merged; they exist only as markers now.

The last twelve commits are this session and the one before it: the dark
glass/glow design overhaul, provider Extend buttons, inventory table fixes, the
Cache Components spike, and the login screen rework.

---

## 5. Auth — how sign-in works

Passwordless magic links via Supabase, with an email allowlist checked in
**three** places: before a link is sent, in `src/proxy.ts` on every request, and
again inside every `/api` route. A valid Supabase session with no allowlist entry
still gets nothing.

`ALLOWED_EMAILS` (set in Vercel across all three environments, and mirrored in
`.env.local`):

```
garreth@arborvita.io          → Garreth
garrethdottin@gmail.com       → Garreth
takeuchiyuriet@gmail.com      → Yurie
milan@arborvita.io            → Milan
czedrickjhake.cc@gmail.com    → Czedrick
cjcaceres.cc@gmail.com        → Czedrick
```

Display names live in `src/lib/people.ts`, mapped explicitly because deriving
them from the email local part produced "Takeuchiyuriet". The map is cosmetic;
`ALLOWED_EMAILS` is what grants access.

**Sessions last weeks.** The magic link is a first-time-on-this-device step, not
a daily one — worth telling people so they do not expect to fight it each
morning.

### The email cap — a live operational limit

Supabase's built-in sender is capped at **2 emails per hour**, confirmed from its
own auth logs (2 sent, then `429: email rate limit exceeded` four times). There
is also a ~58 second per-address cooldown.

**This cap cannot be raised.** The "emails per hour" field under Authentication →
Rate Limits is gated behind configuring custom SMTP. So:

1. Custom SMTP first — Resend, using the `cryptomiami.net` domain (3 DNS
   records). Host `smtp.resend.com`, port 465, username `resend`, password the
   API key.
2. **Then** raise the cap under Authentication → Rate Limits. Easy to set up SMTP
   and still be capped at 2 because this step was missed.

Not urgent: four first-time sign-ins are needed, ever. Two sittings covers it.

Note the Supabase project is named **`story-finder`**, not something
dashboard-specific. Anything else on that project shares the same email budget.

---

## 6. Open work

`BACKLOG.md` is split into two top-level sections deliberately — **V1 — open
work** (bugs, unverified fixes, decisions owed) and **V2 — deferred features**
(understood, costed, consciously postponed). The rule written into it: do not
start a V2 item while a V1 item is open.

### Operational, costs money while it waits

1. **Four active TextVerified rentals are set not to renew** and will drop at
   cycle end. The fix is the free, reversible `includeForRenewal` toggle in their
   panel. This is exactly what the V2 backlog item would automate.
2. **Profile 66's number may still be billing.** The post-ban workflow emailed
   "[ACTION NEEDED] … BILLING STILL ON" on 2026-09-03 while the dashboard
   recorded a clean retire. The detection bug is fixed for future runs; that
   specific number was never checked by hand.
3. **TikTok ingest verification** — five checks written up in V1, due after
   08:30 ET on 2026-09-07.

### In the backlog

- **V1: migrate off `unstable_cache`.** Spiked and backed out this session —
  read that entry before starting, the shape of the job is not what it looks
  like (see §7).
- **V1: hardcoded service-role JWTs** in six n8n nodes in workflow
  `84bcYyXfCgtLB7y4`.
- **V1: two content lanes collapsing** — `jealousy_quotes`, `conspiracy_kitchen`.
  A content decision, not a code one.
- **V2: renew proxies and numbers in-app** rather than linking out.

### Smaller, not filed

- No `.prettierrc`. Its absence let a stray format run reflow 36 files at 80
  columns in an earlier session. Pinning `printWidth: 110` would prevent a
  repeat.
- `lucide-react` is still installed; nothing imports it.
- `commonalities` from the Layer 4 forensics workflow renders nowhere since the
  investigation-context card was removed.
- The incidents page renders ~484 flat pill grounds in one column. Offered to
  drop the ground on that table specifically; never answered.
- Two extra blurred ellipses Garreth drew in Figma frame `5:115` (lower-left,
  10% and 7% opacity) were flagged but never ported.

---

## 7. Things learned the hard way — do not redo these

**Cache Components is not a drop-in.** `use cache` does nothing without
`cacheComponents: true`, and that flag turns on instant-navigation validation
across every route. The spike got `/login` and `/accounts/[profile]` converted,
cleared all ten dashboard routes with `export const instant = false` on the
layout, and then hit the wall: `new Date()` during prerender throws an error
**that `instant = false` does not clear**. There are 23 clock reads across 12
modules in `src/lib`, and this dashboard is time-relative by nature. That is the
job, not a tail on it. Full write-up is the top V1 backlog entry.

**Streaming a route that can 404 breaks the status code.** Wrapping
`/accounts/[profile]` in Suspense meant `notFound()` ran after the shell had
streamed and the status was committed — a missing profile served the not-found UI
with **HTTP 200 instead of 404**. The build was perfectly happy; only checking
the status code caught it. Reverted. Any route whose data can 404 must decide the
status before the shell is sent.

**proxy-cheap's `?modal=` deep links cannot be opened from outside.** Proven:
reloading such a URL restores the modal, pasting the identical URL into a fresh
tab does not. The difference is per-tab `sessionStorage` — the panel writes modal
state into the URL for show and restores it from storage the reload preserved.
TextVerified is the contrast that proves it is their behaviour and not ours: its
`?open=true` opens the card form from an external link through the same anchor
markup. **Do not spend another round on this.**

**Never guess a vendor panel URL.** Neither panel can be probed from outside —
TextVerified redirects every `/app` path to login before routing, proxy-cheap
sits behind Cloudflare — so a dead route and a real one look identical. Three
guesses shipped and three 404ed in the browser. Every URL in
`src/lib/provider-links.ts` now comes from a logged-in session or the vendor's
own public markup. Ask Garreth to paste one rather than inventing it.

**TextVerified publishes a live OpenAPI spec** at
`https://www.textverified.com/swagger/v2/swagger.json` — public, no auth, and
the authoritative source for their write endpoints. Both vendor APIs 403 the
default Python/urllib User-Agent; use a browser one in any script.

**Verify visually, and verify the right thing.** Headless Chrome with
`--disable-gpu` renders no WebGL, so a screenshot of the login page showed no
background rays and looked like a failure. `--use-gl=swiftshader
--enable-unsafe-swiftshader` renders them. Several design decisions this session
were validated by decoding the PNG and measuring pixel luminance rather than
eyeballing.

---

## 8. Working with Garreth

- He reviews visually and gives precise, concrete design feedback. Take it
  literally; when he says "too short" twice, overshoot rather than creep.
- He wants reasoning in commit messages — what was tried, what failed, why the
  final shape was chosen. The existing log is the house style.
- **Images:** this session's conversation eventually could not receive any image
  at all. The API rejects requests where any image exceeds **2000 pixels** on a
  side, and a full-screen Retina Mac screenshot is 3024px. Worse, once such an
  image is in the history it travels with every later request, so all subsequent
  image reads fail regardless of size. **Ask for text**, or have him drop a file
  on the Desktop — `sips -Z 1600 file.png` downscales it and reading from disk
  works.

---

## 9. Useful commands

```bash
cd "/Users/czedcaceres/Documents/Peptide Miracles Dashboard/pm-dashboard"

npm run dev                    # AUTH_BYPASS=true is in .env.local, so /login is reachable
npm run build                  # expect: 35/35 pages
npx tsc --noEmit               # expect: silent
npx eslint src                 # expect: 36 problems — the baseline, not a regression

npx vercel ls pm-dashboard     # deployment status
npx vercel env ls production   # 14 variables, AUTH_BYPASS must NOT be among them
npx vercel deploy --prod --yes
```

A dev server usually runs on **localhost:3000**. Vendor API calls from it are
live and real.

---

## 10. First moves for the next session

1. Get the Vercel dashboard's status word and error line for the stuck
   deployment, and the contents of Settings → Git → Ignored Build Step. As text.
2. Once a deploy succeeds, verify the live login page shows the three-group
   layout and that `ALLOWED_EMAILS` took effect — then Yurie, Milan and Czedrick
   can sign in.
3. Nudge the two operational items in §6 that are quietly costing money.
4. Delete `design/overhaul-shell` and `perf/cache-components` if Garreth wants
   the branch list tidy; both are fully merged.
