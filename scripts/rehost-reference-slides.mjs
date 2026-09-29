// Copy reference slides into our own bucket, so they stop disappearing.
//
// TikTok's slide links are signed and expire about two weeks after a scrape.
// A carousel's slide links are kept in one of two places: the analysis row's
// media inventory (the Sep 8 to 12 intake) or the evidence row's media list
// (everything since). For both, this script:
//
//   1. downloads every slide link that is still live, converts HEIC when it
//      needs to, stores the picture in the public bucket `reference-slides`,
//      and records it in `reference_slide_images` by reference and position;
//   2. does the same for an expired slide when `reference_media_refresh`
//      holds a fresh link for it (fetched from Virlo by the n8n workflow
//      "[One-off] Refresh expired reference slides from Virlo").
//
// An analysis row's inventory is also pointed at the copy, with the old link
// kept beside it as `source_image_url`. Evidence rows are not changed.
// Links on Virlo's own storage do not expire and are left alone.
// Safe to run again: a slide already copied is skipped.
//
//   node --env-file=.env.local scripts/rehost-reference-slides.mjs --dry
//   node --env-file=.env.local scripts/rehost-reference-slides.mjs
import decode from "heic-decode";
import sharp from "sharp";

const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const BUCKET = "reference-slides";
const DRY = process.argv.includes("--dry");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const JSONH = { ...H, "content-type": "application/json" };
const now = Date.now() / 1000;

// The database hands back at most 1,000 rows a request, so every read pages.
async function all(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${offset}`, { headers: H });
    if (!r.ok) throw new Error(`read ${path.split("?")[0]}: HTTP ${r.status}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}
const host = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
const tiktok = (u) => /tiktokcdn/i.test(host(u));
const expiry = (u) => { try { return Number(new URL(u).searchParams.get("x-expires")) || 0; } catch { return 0; } };
const expired = (u) => tiktok(u) && expiry(u) > 0 && expiry(u) < now;

async function copy(url, key) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let bytes = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") || "";
  const path = new URL(url).pathname.toLowerCase();
  let ext = "jpg";
  let out = "image/jpeg";
  if (path.endsWith(".heic") || /hei[cf]/.test(type)) {
    const { width, height, data } = await decode({ buffer: bytes });
    bytes = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).jpeg({ quality: 85 }).toBuffer();
  } else if (path.endsWith(".webp") || /webp/.test(type)) { ext = "webp"; out = "image/webp"; }
  else if (path.endsWith(".png") || /png/.test(type)) { ext = "png"; out = "image/png"; }
  const meta = await sharp(bytes).metadata();
  if (!meta.width || !meta.height) throw new Error("not a picture");
  const up = await fetch(`${BASE}/storage/v1/object/${BUCKET}/${key}.${ext}`, { method: "POST", headers: { ...H, "content-type": out, "x-upsert": "true" }, body: new Uint8Array(bytes) });
  if (!up.ok) throw new Error(`store: HTTP ${up.status} ${(await up.text()).slice(0, 80)}`);
  return `${BASE}/storage/v1/object/public/${BUCKET}/${key}.${ext}`;
}

const [fresh, have, analyses, evidence] = await Promise.all([
  all("reference_media_refresh?select=reference_id,images"),
  all("reference_slide_images?select=reference_id,position"),
  all("reference_analysis?select=id,source_reference_id,analysis_version,observed&order=created_at.desc"),
  all("source_discovery_evidence?select=source_reference_id,media_urls&source_format=eq.carousel&source_reference_id=not.is.null"),
]);
const freshBy = new Map(fresh.map((r) => [r.reference_id, r.images ?? []]));
const copied = new Set(have.map((r) => `${r.reference_id}:${r.position}`));
const tally = { references: 0, alreadyCopied: 0, live: 0, expired: 0, expiredWithFreshLink: 0, copied: 0, failed: 0, stillGone: 0, analysisRowsUpdated: 0 };
const rank = (v) => (v === "perez-slides-v1" ? 2 : v === "phase0-multiformat-v1" ? 1 : 0);

// One slide list per reference: the fullest analysis inventory, else the evidence's media list.
const lists = new Map();
for (const a of analyses) {
  const inv = a.observed?.media_inventory;
  if (!Array.isArray(inv) || !inv.length) continue;
  const cur = lists.get(a.source_reference_id);
  if (!cur || rank(a.analysis_version) > rank(cur.analysis.analysis_version)) lists.set(a.source_reference_id, { analysis: a, slides: [...inv].sort((x, y) => (x.position ?? 0) - (y.position ?? 0)).map((m, i) => ({ position: m.position ?? i + 1, url: m.image_url, entry: m })) });
}
for (const e of evidence) {
  if (lists.has(e.source_reference_id) || !Array.isArray(e.media_urls) || !e.media_urls.length) continue;
  lists.set(e.source_reference_id, { analysis: null, slides: e.media_urls.map((url, i) => ({ position: i + 1, url, entry: null })) });
}

const rowsOut = [];
for (const [ref, list] of lists) {
  const again = freshBy.get(ref) ?? [];
  let touched = false;
  let changedInventory = false;
  for (const s of list.slides) {
    if (!s.url || !tiktok(s.url)) continue;
    touched = true;
    if (copied.has(`${ref}:${s.position}`)) { tally.alreadyCopied++; continue; }
    let from = s.url;
    if (expired(s.url)) {
      tally.expired++;
      const next = again[s.position - 1];
      if (!next || expired(next)) { tally.stillGone++; continue; }
      tally.expiredWithFreshLink++;
      from = next;
    } else tally.live++;
    if (DRY) continue;
    try {
      const url = await copy(from, `${ref}/${s.position}`);
      rowsOut.push({ reference_id: ref, position: s.position, url, source_url: s.url });
      if (s.entry) {
        s.entry.source_image_url = s.entry.source_image_url ?? s.url;
        s.entry.image_url = url;
        changedInventory = true;
      }
      tally.copied++;
    } catch (e) {
      tally.failed++;
      console.log("failed", ref, s.position, String(e.message).slice(0, 100));
    }
  }
  if (touched) tally.references++;
  if (changedInventory && list.analysis) {
    const r = await fetch(`${BASE}/rest/v1/reference_analysis?id=eq.${list.analysis.id}`, { method: "PATCH", headers: { ...JSONH, Prefer: "return=minimal" }, body: JSON.stringify({ observed: list.analysis.observed }) });
    if (r.ok) tally.analysisRowsUpdated++;
    else console.log("update failed", list.analysis.id, r.status, (await r.text()).slice(0, 100));
  }
  if (rowsOut.length >= 200) await flush();
}
await flush();

async function flush() {
  if (!rowsOut.length) return;
  const batch = rowsOut.splice(0, rowsOut.length);
  const r = await fetch(`${BASE}/rest/v1/reference_slide_images?on_conflict=reference_id,position`, { method: "POST", headers: { ...JSONH, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(batch) });
  if (!r.ok) console.log("record failed", r.status, (await r.text()).slice(0, 200));
}

// Slides copied by the first version of this script live only in the analysis rows; record them too.
if (!DRY) {
  const back = [];
  for (const [ref, list] of lists) for (const s of list.slides) if (s.url && s.url.includes(`/${BUCKET}/`) && !copied.has(`${ref}:${s.position}`)) back.push({ reference_id: ref, position: s.position, url: s.url, source_url: s.entry?.source_image_url ?? null });
  for (let i = 0; i < back.length; i += 500) await fetch(`${BASE}/rest/v1/reference_slide_images?on_conflict=reference_id,position`, { method: "POST", headers: { ...JSONH, Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(back.slice(i, i + 500)) });
  tally.recordedFromEarlierRuns = back.length;
}
console.log(JSON.stringify({ dry: DRY, freshLinksFor: freshBy.size, ...tally }));
