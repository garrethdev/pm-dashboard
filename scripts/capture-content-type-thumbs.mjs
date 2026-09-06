#!/usr/bin/env node
/**
 * Capture one preview frame per content type into a public bucket.
 *
 *   node scripts/capture-content-type-thumbs.mjs [--force] [--only=ba_2slide]
 *
 * Why a capture rather than a link to the live media: several render buckets
 * are PRIVATE (char3-asmr-question, char3-before-after, grandma-before-after),
 * so unified_posts holds signed URLs with an embedded expiry token. A card
 * pointing at one of those shows a broken image within days. Downloading once
 * through the service key and re-hosting in a public bucket gives the Content
 * Types page a URL that keeps working.
 *
 * Idempotent: a content type that already has a row is skipped unless --force.
 * Requires ffmpeg on PATH (it reads the first frame of a video and resizes a
 * carousel slide with the same command).
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";

const run = promisify(execFile);

// .env.local is Next's file, not Node's — read it here rather than adding a dep.
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");

const BUCKET = "content-type-thumbs";
const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`REST ${res.status} on ${path}: ${await res.text()}`);
  // `Prefer: return=minimal` answers 201 with an empty body, so parse the text
  // rather than calling res.json() and getting "Unexpected end of JSON input".
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Public or signed, both carry the bucket and object path in the same place;
 *  re-fetching through /object/<bucket>/<path> with the service key works for
 *  either and never depends on a token that has since expired. */
function parseStorageUrl(url) {
  const m = /\/storage\/v1\/object\/(?:public\/|sign\/)?([^/]+)\/(.+?)(?:\?|$)/.exec(url);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, { headers: auth });
  if (res.ok) return;
  const made = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!made.ok) throw new Error(`could not create bucket: ${await made.text()}`);
  console.log(`created public bucket ${BUCKET}`);
}

async function download(url) {
  const parsed = parseStorageUrl(url);
  const target = parsed
    ? `${SUPABASE_URL}/storage/v1/object/${parsed.bucket}/${parsed.path}`
    : url;
  const res = await fetch(target, { headers: parsed ? auth : {} });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  await ensureBucket();

  const registry = await rest(
    "content_type_registry?select=content_type,display_name,media_shape,source_date_column",
  );
  const existing = new Set(
    force ? [] : (await rest("content_type_thumbnails?select=content_type")).map((r) => r.content_type),
  );

  const work = registry.filter(
    (r) => (!only || r.content_type === only) && !existing.has(r.content_type),
  );
  if (work.length === 0) {
    console.log("nothing to capture — pass --force to recapture");
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "ct-thumbs-"));
  const done = [];
  const failed = [];

  try {
    for (const type of work) {
      try {
        // Newest first: the preview should look like what the lane ships today,
        // not like its first batch.
        const posts = await rest(
          `unified_posts?select=content_id,media_url,media_urls,posting_date` +
            `&content_type=eq.${encodeURIComponent(type.content_type)}` +
            `&order=posting_date.desc.nullslast&limit=25`,
        );
        const post = posts.find((p) => p.media_url || p.media_urls?.[0]);
        if (!post) {
          failed.push([type.content_type, "no post with media"]);
          continue;
        }
        const sourceUrl = post.media_url ?? post.media_urls[0];

        const raw = join(dir, `${type.content_type}.src`);
        const out = join(dir, `${type.content_type}.jpg`);
        await writeFile(raw, await download(sourceUrl));

        // One command for both shapes: for a video this takes the first frame,
        // for a still it just rescales. 540px wide is twice the card's preview.
        await run("ffmpeg", ["-y", "-i", raw, "-frames:v", "1", "-vf", "scale=540:-2", out]);

        const body = await readFile(out);
        const up = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${type.content_type}.jpg`,
          {
            method: "POST",
            headers: { ...auth, "Content-Type": "image/jpeg", "x-upsert": "true" },
            body,
          },
        );
        if (!up.ok) throw new Error(`upload ${up.status}: ${await up.text()}`);

        await rest("content_type_thumbnails", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            content_type: type.content_type,
            thumb_url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${type.content_type}.jpg`,
            source_content_id: post.content_id,
            source_media_url: sourceUrl,
            captured_at: new Date().toISOString(),
          }),
        });

        done.push(type.content_type);
        console.log(`✓ ${type.content_type}  (${post.content_id})`);
      } catch (err) {
        failed.push([type.content_type, err.message]);
        console.log(`✗ ${type.content_type}  ${err.message}`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  console.log(`\ncaptured ${done.length}, failed ${failed.length}`);
  for (const [t, why] of failed) console.log(`  ${t}: ${why}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
