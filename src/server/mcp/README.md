# PM Dashboard MCP

Lets Claude read the dashboard's data directly. Claude Code connects to
`https://pm-dashboard-ashen.vercel.app/api/mcp` and asks questions through 17
tools. Each tool runs the same code as its page, so Claude and the screens give
the same numbers.

It only reads. Nothing it offers can change anything.

## Connect

1. Make a token:

   ```bash
   node scripts/mcp-token.mjs you@example.com
   ```

   It prints your token, a line for Vercel, and a Claude Code command. It saves
   and sends nothing.

2. Add the printed line to **`MCP_TOKENS`** in Vercel (Production) and
   redeploy. Your email must also be in `ALLOWED_EMAILS`.

3. Run the printed `claude mcp add …` command. In Claude Code, `/mcp` should
   show `pm-dashboard` as connected.

To switch a token off, delete its entry from `MCP_TOKENS` and redeploy.

## Tools

| Tool | What you can ask |
|---|---|
| `pm_overview` | What needs attention today, pipeline and n8n health, the bell |
| `pm_accounts` | Every account with health, tier, median views, errors, last post |
| `pm_account` | One account: detail, posts, analytics, deep analysis, forensics, warmup reports |
| `pm_calendar` | A month or a day of the schedule, the last scheduler run, cadence, limits |
| `pm_inventory` | Ready stock per content type, demand against supply |
| `pm_content_types` | Every lane and how it performs, each character |
| `pm_analytics` | Views over a range, top content, top posts, audience readings |
| `pm_reports` | Issues, observations and the incident history |
| `pm_automation` | The daily n8n workflows and their last runs |
| `pm_todo` | Each phone's list for a day, open and posted deliveries, days off |
| `pm_devices` | The phones and their accounts, proxies and numbers |
| `pm_warmups` | Warmup overview, runs and sessions by day, one report's diary |
| `pm_sessions` | Recorded posting sessions and reviews (reviewers only) |
| `pm_carousels` | Carousel types, batches, decks, templates, image libraries |
| `pm_trends` | The Trends feed, saved and seen, one carousel's study, knowledge |
| `pm_stories` | The story bank, comments, lane fit, uses, hook library, writer rules |
| `pm_resources` | The source-of-truth docs, Creators to follow |

Tools read the **physical** fleet unless Claude asks for `cloud`.

## What a reply looks like

```json
{
  "data": [ ... ],
  "meta": {
    "tool": "pm_accounts", "fleet": "physical",
    "fetchedAt": "2026-11-26T15:04:05Z", "stale": false,
    "total": 31, "returned": 31, "nextCursor": null,
    "truncated": false
  }
}
```

- `total` is how many rows exist. `nextCursor` gets the next page.
- `fetchedAt` is when the data was read. The dashboard caches for 60 seconds.
- `cut` appears when a list was shortened to fit one reply. Nothing is shortened
  without saying so.

## Safety

- **Read-only.** Every tool is marked read-only. `fence.test.ts` fails if this
  folder imports anything that writes or reads a secret. Two display caches
  (post thumbnails, profile cards) refresh as they do when the page is opened.
- **Private data.** Passwords, tokens and keys are dropped from every reply.
  Links to private files are not passed on. Emails, phone numbers and proxy
  addresses are masked.
- **Shut by default.** With `MCP_TOKENS` empty the address answers "not set up".
  The dev sign-in bypass does not open it.
- **Gentle on the database.** At most 3 questions at once, 60 a minute per
  person. One log line per call in Vercel's logs. Nothing is written to the
  database.

## Files

| File | What it does |
|---|---|
| `src/app/api/mcp/route.ts` | The address Claude calls |
| `auth.ts` | Checks the token and the email |
| `server.ts` | Registers the tools as read-only |
| `gate.ts` | The 3-at-once line, the call limit, the log line |
| `shape.ts` | Removes secrets, masks, pages and sizes every reply |
| `tools/` | One file per tool |
| `*.test.ts` | The import fence, page coverage, the reply rules, the door |
| `scripts/mcp-token.mjs` | Makes a token |

A new dashboard page needs a tool, or a reason in `coverage.test.ts`, or that
test fails.

## Coming later

- **Table tools:** any table, SQL questions and file exports, through a
  read-only database role.
- **Sign-in for the Claude apps** (web, desktop, phone).
- **Writing back,** as its own group of tools with its own approval.

The plan: https://claude.ai/artifact/VE88TW8UTsoFdYU4ePQKtk
