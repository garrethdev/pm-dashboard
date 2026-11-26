# The dashboard's MCP server

Claude can read the dashboard's data straight from the dashboard. It connects to
one address, `/api/mcp`, and asks questions through 17 tools. Every tool runs
the same code the matching page runs, so Claude and the screens give the same
numbers. **Nothing it offers can change anything.**

Built 2026-11-26 (Garreth: "an MCP that allows us to directly within Claude have
access to the full data of the PM dashboard… read-only"). This is phase 1 of the
plan at https://claude.ai/artifact/VE88TW8UTsoFdYU4ePQKtk: one person, in Claude
Code, with a personal token.

## Connect

1. Make a token. On a Mac with this repo:

   ```bash
   node scripts/mcp-token.mjs you@example.com
   ```

   It prints the token, the line for Vercel, and the Claude Code command. It
   saves nothing and sends nothing.

2. In Vercel, add the printed line to **MCP_TOKENS** (Production), then
   redeploy. Vercel holds only the token's SHA-256, never the token. Your email
   must also be in **ALLOWED_EMAILS**.

3. Run the printed `claude mcp add …` command. Then, in Claude Code, `/mcp`
   should list `pm-dashboard` as connected.

To switch a token off, delete its entry from MCP_TOKENS and redeploy. Removing
someone from ALLOWED_EMAILS switches theirs off too.

## The tools

| Tool | Pages | What it reads |
|---|---|---|
| `pm_overview` | Home, the bell | Headline counts, pipeline and n8n health, open notifications, today's to-do totals |
| `pm_accounts` | Accounts, Settings | Every account with health, tier, median views, errors, last post and warmup |
| `pm_account` | One account, Forensics | One account: row, detail and task log, posts, analytics, deep analysis, ban forensics, warmup reports |
| `pm_calendar` | Content calendar | A month, a day, the last scheduler run, the cadence, each account's limits |
| `pm_inventory` | Inventory | Ready stock per content type; demand against supply with a what-if |
| `pm_content_types` | Content types | Every lane with its performance; each character |
| `pm_analytics` | Analytics, Analysis | Views summary, top content, top posts, stored audience readings |
| `pm_reports` | Reports, Incidents | Issues and observations; incident history |
| `pm_automation` | Automation | The daily n8n workflows and their last runs |
| `pm_todo` | To-do | Each phone's list for a day, open and posted deliveries, days off |
| `pm_devices` | Devices, Proxies | The phones and their accounts; proxies and numbers (masked) |
| `pm_warmups` | Warmups | The overview, runs and sessions by day, one report's diary |
| `pm_sessions` | Sessions | Recorded posting sessions and reviews. Reviewers only |
| `pm_carousels` | Carousel Generator | Types, batches, decks, templates, writing, image libraries |
| `pm_trends` | Trends | Your unseen feed, seen, saved, trending, one carousel's study, digests, knowledge |
| `pm_stories` | (no page yet) | Story bank, comments, lane fit, uses, hook library, writer rules |
| `pm_resources` | Resources | The source-of-truth docs; Creators to follow |

The Generate pages, sign-in and not-found have no tool, with the reason in
`src/server/mcp/coverage.test.ts`. That test fails when a new page has neither.

## Every reply

```json
{
  "data": [ ... ],
  "meta": {
    "tool": "pm_accounts", "view": "list", "fleet": "physical",
    "fetchedAt": "2026-11-26T15:04:05Z", "stale": false,
    "total": 59, "returned": 50, "nextCursor": "bzo1MA",
    "truncated": false
  }
}
```

- **Fleet.** Tools read the physical fleet unless asked for `cloud`
  (`MCP_DEFAULT_FLEET` changes the default).
- **Paging.** `total` is how many exist; pass `nextCursor` back as `cursor`.
  Lists default to 50 rows, at most 500.
- **No silent cuts.** A reply is held under 60,000 characters (Claude Code stops
  at 25,000 tokens). When a list is shortened to fit, `meta.cut` says which and
  how long it was.
- **Age.** `fetchedAt` is when the data was read. The readers cache for 60
  seconds, as the pages do. `stale: true` means a remembered copy was served
  because the live read failed.

## What keeps it read-only

- **Only read tools exist.** Each is registered with `readOnlyHint: true`.
- **An import fence.** `src/server/mcp/fence.test.ts` fails if anything in
  `src/server/mcp/` imports a write module (`writes.ts`, `*-writes.ts` and the
  rest), a function named like a write (`set…`, `mark…`, `save…`), or a secret
  reader (`createAdminClient`, `fetchProxyCredentials`, `readConnection`,
  `signStorageUrls`).
- **Two display caches still refresh, as on the pages.** Opening an account's
  analytics or the top posts refreshes post thumbnails (`post_thumbnails`), and
  an account's detail refreshes its profile card (`account_profile_cards`),
  exactly as opening those pages does. Nothing else is written.
- **The Trends feed does not mark anything seen.** Only scrolling on the page
  does that.

## Private data

- **Secrets never leave.** Every reply passes `scrub()` in `shape.ts`: any field
  named like a password, token, secret, cookie or key is dropped, and any value
  shaped like a login token or a vendor key is blanked. `meta.removed` counts
  them. The readers already pick columns by name; this is the last check.
- **Private files are not linked.** A signed link to a private bucket
  (screenshots, creator photos, device proofs) is replaced with
  `[private file: link not shared]`. Public picture links stay.
- **Masked:** emails (`g***@example.com`), phone numbers (`•••0142`) and proxy
  addresses (`203.x.x.x:8080`).

## Load on the database

- At most 3 tool calls run at once on a server instance; others wait up to 20
  seconds, then answer "busy".
- 60 calls a minute per person.
- Both limits live in one server instance's memory, so they are a brake, not a
  guarantee. The readers' 60-second cache is what keeps repeated questions cheap.
- The server never fetches a picture.
- One log line per call in Vercel's logs (`{"mcp": tool, "who", "ok", "ms"}`).
  Nothing is written to the database.

## Code

| File | What |
|---|---|
| `src/app/api/mcp/route.ts` | The route. A fresh server and transport per request, no sessions, JSON replies |
| `src/server/mcp/auth.ts` | The door: MCP_TOKENS, ALLOWED_EMAILS, reviewers |
| `src/server/mcp/server.ts` | Registers the tools, read-only, through the gate |
| `src/server/mcp/gate.ts` | The line of 3, the call limit, the log line |
| `src/server/mcp/shape.ts` | Scrub, mask, page, fit, the reply envelope |
| `src/server/mcp/tools/*.ts` | One file per tool |
| `src/proxy.ts` | Lets `/api/mcp` past the cookie check |
| `scripts/mcp-token.mjs` | Makes a token |

## Not in phase 1

- The table tools (any table, SQL, file export) need a read-only database role.
  That is phase 2 and needs a migration.
- Sign-in for the Claude apps (web, desktop, phone) is phase 3.
- Wallet balances, Trends search (it spends embedding credit) and the recorded
  frames of a posting session are left out.
