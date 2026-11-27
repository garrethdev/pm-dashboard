# Robot updates: how a new robot version reaches the Air

Since 2026-11-27 (branch `RPA-Patch-Feature`), a new version of the warmup
robot (`garrethdev/warmup-runner`) reaches the MacBook Air through the
dashboard, not WhatsApp. Yurie opens **Settings → Robot updates** in Safari on
the Air, clicks **Download**, and follows that version's **How to install**
page. The bell and a strip across the top of every page say an update is
waiting until the robot's own warmup reports show the new version.

The robot is not changed by any of this. Installing still uses its
`air/Update the robot.command`, which picks up the newest
`warmup-runner-*.tar.gz` in Downloads.

## Publishing a version (Claude does this)

Only after Garreth or Czedrick says go, and only once the robot change is
merged into warmup-runner `main`.

1. **Write the install notes** as `install-notes.md`, in this shape:

   ```markdown
   # Friday analytics in robot hours

   ## What changed
   Two to four plain sentences for Yurie. What she will notice, not code.

   ## Steps
   1. In the air folder, double-click Set the Friday analytics time.
   2. Type 1 or 2 and press Return, then type GO and press Return.
      The window must say: DONE

   ## Afterwards
   Anything she does differently from now on. Leave the section out if nothing.
   ```

   - The `#` title is the label on the list (under 80 characters).
   - **Steps** are only this version's own, one action each. They are done
     while the robot is stopped, after "Update the robot" and before "Start
     the robot". Leave out the usual steps (download, stop, update, start):
     the page always shows those. Write `None`, or leave the section out, if
     there are none.
   - `The window must say:` under a step is what she checks, in the window's
     own words.

2. **Dry run**, which changes nothing and prints what would be published:

   ```sh
   node --env-file=.env.local scripts/publish-robot-update.mjs --notes <install-notes.md> --by garreth
   ```

   This builds the package from warmup-runner `main` fresh from GitHub, never
   from a local checkout's branch. To publish a package already made with
   `scripts/make-air-package.sh`, add `--package <file.tar.gz>`; it is
   refused unless its commit is merged into `main`.

3. **Show the dry run to whoever said go.** Publish only after they agree:
   add `--go`. It uploads the file to the private `robot-updates` bucket and
   writes the `robot_updates` row. A version already published is refused.

4. **Check** that `/settings/robot-updates` lists it as Newest.

To add an **older** package to the history (one already installed), give it
the time its package was made with `--published-at <ISO time>`. The list is
ordered by that time, so without it the old package would show as Newest and
the Air would read as behind.

Telling Yurie is a person's job, not Claude's.

## How the dashboard knows what the Air runs

Every warmup report the robot sends starts with `Version: warmup-runner-…`
(warmup-runner `src/session.ts`, since 2026-11-25). The database copies that
into `warmup_reports.robot_version` when a report arrives. The newest report
with a version is the Air (there is one Air). A version made the same day as
the newest published one, or later, counts as up to date: it cannot be an
old one.

## Where things are

| What | Where |
|---|---|
| Table, bucket, version column | `supabase/migrations/20261127072855_robot_updates.sql` (and `…072856_robot_updates_recent_versions.sql`, the fill-in for older reports) |
| Reads, and "is the Air behind" | `src/lib/data/robot-updates.ts` |
| The steps on the How to install page | `src/lib/robot-update-steps.ts` |
| Pages (Updates, Changelog, How to install) | `src/app/(dashboard)/settings/robot-updates/` |
| Download link (ten-minute signed link) | `src/app/api/robot-updates/[version]/download/route.ts` |
| Bell item | `robotUpdateItem` in `src/lib/data/notifications.ts` |
| Banner, Settings entry | `src/components/dashboard/robot-updates.tsx` |
| Publish command and notes reader | `scripts/publish-robot-update.mjs`, `scripts/robot-update-notes.mjs` |

The robot updating itself, with nobody pressing anything, is in
`BACKLOG.md` (V2, "The robot updates itself").
