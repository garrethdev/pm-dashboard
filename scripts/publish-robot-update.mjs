// Publishes a warmup robot update to Settings -> Robot updates (2026-11-27).
// Claude runs this, after Garreth or Czedrick has said go. Full procedure:
// docs/ROBOT-UPDATES.md.
//
//   node --env-file=.env.local scripts/publish-robot-update.mjs --notes <install-notes.md> --by garreth
//   node --env-file=.env.local scripts/publish-robot-update.mjs --notes <file> --by czedrick --package <warmup-runner-....tar.gz>
//   ... add --go to really publish. Without it, it only shows what it would publish.
//   --published-at <ISO time>: only for adding an OLDER package to the history
//   (the list is ordered by this; leaving it out means now, i.e. newest).
//
// The package is built here from garrethdev/warmup-runner's main on GitHub
// (git archive, exactly as scripts/make-air-package.sh does), never from a
// local checkout's own branch: on 2026-11-27 the copy on this Mac was found
// 8 changes behind and would have undone three updates. With --package, that
// file is used instead, but only if its commit is already merged into main.
//
// Then: upload to the private robot-updates bucket, and write the
// robot_updates row the pages read. Nothing is changed without --go, and a
// version already published is refused.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { parseInstallNotes } from "./robot-update-notes.mjs";

const BUCKET = "robot-updates";
const MAX_BYTES = 100 * 1024 * 1024;
const VERSION_RE = /^warmup-runner-(\d{4}-\d{2}-\d{2})-([0-9a-f]{7,40})$/;

const { values: opt } = parseArgs({
  options: {
    notes: { type: "string" },
    by: { type: "string" },
    package: { type: "string" },
    repo: { type: "string", default: process.env.ROBOT_REPO || join(homedir(), "Documents", "warmup-runner") },
    go: { type: "boolean", default: false },
    "published-at": { type: "string" },
  },
});

function stop(message) {
  console.error(`\nSTOPPED: ${message}\nNothing was published.`);
  process.exit(1);
}

const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) stop("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed (run with --env-file=.env.local).");
if (!opt.notes) stop("--notes <install-notes.md> is needed.");
if (opt.by !== "garreth" && opt.by !== "czedrick") stop("--by must be garreth or czedrick: whoever said go.");

const publishedAt = opt["published-at"] ? new Date(opt["published-at"]) : null;
if (publishedAt && Number.isNaN(publishedAt.getTime())) stop("--published-at is not a date and time.");
if (publishedAt && publishedAt > new Date()) stop("--published-at is in the future.");

const git = (...args) => execFileSync("git", ["-C", opt.repo, ...args], { encoding: "utf8" }).trim();

// 1. The robot's main, fresh from GitHub.
try {
  git("fetch", "--quiet", "origin", "main");
} catch {
  stop(`could not fetch main in ${opt.repo}.`);
}
const mainSha = git("rev-parse", "origin/main");

// 2. The package: given, or built from main.
let file;
let version;
let commitSha;
if (opt.package) {
  file = opt.package;
  version = basename(file).replace(/\.tar\.gz$/, "");
  const m = VERSION_RE.exec(version);
  if (!m) stop(`${basename(file)} is not named warmup-runner-<date>-<code>.tar.gz.`);
  try {
    commitSha = git("rev-parse", "--verify", `${m[2]}^{commit}`);
  } catch {
    stop(`commit ${m[2]} is not in ${opt.repo}.`);
  }
  try {
    git("merge-base", "--is-ancestor", commitSha, "origin/main");
  } catch {
    stop(`commit ${m[2]} is not merged into main yet. Merge first, then publish.`);
  }
  const listing = execFileSync("tar", ["-tzf", file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (!listing.split("\n").includes("warmup-runner/package.json")) stop("that file is not a robot package.");
  if (commitSha !== mainSha) console.log(`Note: ${m[2]} is merged but is not the newest commit on main (${mainSha.slice(0, 7)}).`);
} else {
  commitSha = mainSha;
  const day = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  version = `warmup-runner-${day}-${git("rev-parse", "--short", commitSha)}`;
  file = join(mkdtempSync(join(tmpdir(), "robot-update-")), `${version}.tar.gz`);
  git("archive", "--format=tar.gz", "--prefix=warmup-runner/", "-o", file, commitSha);
}

const bytes = statSync(file).size;
if (bytes > MAX_BYTES) stop(`the package is ${(bytes / 1048576).toFixed(1)} MB, over the bucket's 100 MB.`);
const body = readFileSync(file);
const sha256 = createHash("sha256").update(body).digest("hex");

// 3. The notes.
let notes;
try {
  notes = parseInstallNotes(readFileSync(opt.notes, "utf8"));
} catch (err) {
  stop(`${opt.notes}: ${err.message}`);
}

console.log(`
Version:      ${version}
Built from:   ${commitSha} (${commitSha === mainSha ? "newest on main" : "merged into main"})
File:         ${file}
Size:         ${(bytes / 1048576).toFixed(1)} MB   sha256 ${sha256}
Label:        ${notes.label}
Published by: ${opt.by}${publishedAt ? `\nPublished at: ${publishedAt.toISOString()} (history: an older package)` : ""}

What changed:
${notes.whatChanged}

Extra steps (while the robot is stopped): ${notes.extraSteps.length === 0 ? "none" : ""}
${notes.extraSteps.map((s, i) => `  ${i + 1}. ${s.do}${s.expect ? `\n     The window must say: ${s.expect}` : ""}`).join("\n")}
Afterwards: ${notes.afterwards ?? "nothing"}
`);

const headers = { apikey: key, Authorization: `Bearer ${key}` };

const existing = await fetch(`${base}/rest/v1/robot_updates?select=version&version=eq.${encodeURIComponent(version)}`, { headers });
if (!existing.ok) stop(`reading robot_updates failed (HTTP ${existing.status}). Has the migration been applied?`);
if ((await existing.json()).length > 0) stop(`${version} is already published.`);

if (!opt.go) {
  console.log("Dry run: nothing published. Add --go to publish.");
  process.exit(0);
}

// 4. Upload, then the row. If the row fails, the file is removed again.
const path = `${version}.tar.gz`;
const up = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/gzip", "x-upsert": "false", "cache-control": "3600" },
  body,
});
if (!up.ok) stop(`upload failed (HTTP ${up.status}): ${(await up.text()).slice(0, 300)}`);
console.log("Uploaded.");

const row = await fetch(`${base}/rest/v1/robot_updates`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify({
    version,
    commit_sha: commitSha,
    label: notes.label,
    what_changed: notes.whatChanged,
    extra_steps: notes.extraSteps,
    afterwards: notes.afterwards,
    file_path: path,
    file_bytes: bytes,
    sha256,
    published_by: opt.by,
    ...(publishedAt ? { published_at: publishedAt.toISOString() } : {}),
  }),
});
if (!row.ok) {
  const why = (await row.text()).slice(0, 300);
  await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, { method: "DELETE", headers }).catch(() => {});
  stop(`saving the version failed (HTTP ${row.status}): ${why}. The uploaded file was removed.`);
}

console.log(`\nDONE: ${version} is published.\nHow to install: /settings/robot-updates/${version}`);
