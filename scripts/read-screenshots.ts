/**
 * DA-05: read a folder of analytics screenshots into post_screen_readings.
 *
 *   npx tsx scripts/read-screenshots.ts <manifest.json> [--write] [--model=anthropic/claude-sonnet-5.5] [--compare]
 *
 * The manifest lists one entry per post: which platform and account, the post's
 * link if known, and the screenshot files in the order they were taken:
 *
 *   [{ "platform": "tiktok", "account": "glow.with.becky",
 *      "post_url": "https://www.tiktok.com/@glow.with.becky/video/1", "format": "video",
 *      "posted_at": "2026-10-16", "files": ["/path/a.jpeg", "/path/b.jpeg"] }]
 *
 * Without --write nothing is stored: the reading is printed, with what the
 * platform's API stored for the same post beside it when --compare is given.
 * With --write the screenshots go to the post-screens bucket and the reading
 * becomes a row. Reads .env.local for the keys (OPENROUTER_API_KEY, SUPABASE_*).
 */
import fs from "node:fs";
import path from "node:path";
import {
  type Platform,
  type ReadingRow,
  type ScreenGroup,
  insertReading,
  readScreens,
  storedNumbersFor,
  uploadScreens,
} from "../src/server/screen-readings";

interface ManifestEntry {
  platform: Platform;
  account: string;
  post_url?: string | null;
  post_id?: string | null;
  format?: string | null;
  posted_at?: string | null;
  caption?: string | null;
  files: string[];
}

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const NUMBER_FIELDS: (keyof ReadingRow)[] = [
  "views", "views_instagram", "views_facebook", "viewers", "likes", "comments", "shares", "saves", "reposts",
  "new_followers", "profile_visits", "avg_watch_s", "total_watch_s", "watched_full_pct", "retention_avg_pct",
  "drop_off_s", "skip_rate_pct", "followers_pct", "new_viewers_pct",
];

function show(row: ReadingRow, stored: Partial<Record<keyof ReadingRow, number | null>> | null) {
  const lines: string[] = [];
  for (const f of NUMBER_FIELDS) {
    const read = row[f] as number | null;
    const has = stored && f in stored;
    const kept = has ? stored[f] : undefined;
    if (read === null && !has) continue;
    const verdict = !has ? "" : kept === read ? "  ✓" : kept === null && read === null ? "  ✓" : `  ≠ stored ${kept ?? "null"}`;
    lines.push(`  ${f.padEnd(18)} ${read === null ? "null" : read}${verdict}`);
  }
  const named = (label: string, v: Record<string, unknown> | null) => {
    if (v) lines.push(`  ${label.padEnd(18)} ${JSON.stringify(v)}`);
  };
  named("retention_curve", row.retention_curve ? Object.fromEntries(row.retention_curve.map((p) => [p.s, p.pct])) : null);
  named("traffic_sources", row.traffic_sources);
  named("audience_age", row.audience_age);
  named("audience_country", row.audience_country);
  named("audience_gender", row.audience_gender);
  named("rate_signals", row.rate_signals);
  if (row.fyp_restricted !== null) lines.push(`  ${"fyp_restricted".padEnd(18)} ${row.fyp_restricted}`);
  if (row.notes) lines.push(`  notes: ${row.notes}`);
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const manifestPath = args.find((a) => !a.startsWith("--"));
  if (!manifestPath) throw new Error("usage: read-screenshots.ts <manifest.json> [--write] [--compare] [--model=...]");
  const write = args.includes("--write");
  const compare = args.includes("--compare") || write;
  const model = args.find((a) => a.startsWith("--model="))?.slice("--model=".length);
  loadEnv(path.resolve(".env.local"));

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ManifestEntry[];
  let total = 0;
  for (const e of entries) {
    const group: ScreenGroup = {
      platform: e.platform,
      account: e.account,
      postUrl: e.post_url ?? null,
      postId: e.post_id ?? null,
      format: e.format ?? null,
      postedAt: e.posted_at ?? null,
      captionSnippet: e.caption ?? null,
      readBy: "manual",
      screenshots: e.files.map((f) => ({
        name: path.basename(f),
        data: fs.readFileSync(f),
        mediaType: f.toLowerCase().endsWith(".png") ? "png" : "jpeg",
      })).map((s) => ({ ...s, mediaType: `image/${s.mediaType}` as "image/jpeg" | "image/png" })),
    };
    const readAt = new Date();
    const paths = write ? await uploadScreens(group, readAt) : undefined;
    const started = Date.now();
    const result = await readScreens(group, { model, screenshotPaths: paths });
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    const stored = compare && e.post_url ? await storedNumbersFor(e.platform, e.post_url) : null;
    // Instagram's API counts Instagram views only; the app's total includes the Facebook crosspost.
    if (stored && result.row.views_instagram !== null) {
      stored.views_instagram = stored.views;
      delete stored.views;
    }
    const cost = result.costUsd === null ? "?" : `$${result.costUsd.toFixed(4)}`;
    console.log(`\n${e.platform} ${e.account} ${e.post_url ?? "(no link)"}  ${e.files.length} screens`);
    console.log(`  ${result.model}: ${result.inputTokens} in / ${result.outputTokens} out, ${cost}, ${seconds}s${result.problem ? `  PROBLEM: ${result.problem}` : ""}`);
    console.log(show(result.row, stored));
    if (stored === null && compare && e.post_url) console.log("  (not in the performance table)");
    if (write) {
      const id = await insertReading(result.row);
      console.log(`  stored as reading ${id}`);
    }
    total += result.costUsd ?? 0;
  }
  console.log(`\n${entries.length} posts, $${total.toFixed(4)} in total${write ? "" : " (nothing written; add --write)"}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
