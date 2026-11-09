import { createHash, createHmac } from "node:crypto";

/**
 * Writing to Cloudflare R2 (2026-11-04), where the small copies of our
 * pictures live (src/server/carousel/services/picture-copies.ts).
 *
 * R2 speaks Amazon S3's language, which wants every request signed with the
 * access key ("Signature Version 4"). This is that signing, written out so
 * the dashboard needs no Amazon library for one kind of request. It is tested
 * against Amazon's own published example (r2.test.ts).
 *
 * Settings, in Vercel and .env.local: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET.
 */

const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();

/** Each part of a path made safe the way S3 wants it, the slashes kept. */
export const encodeKey = (key: string) =>
  key
    .split("/")
    .map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");

export interface SignInput {
  method: string;
  host: string;
  /** Already encoded, starting with a slash. */
  path: string;
  /** Headers to sign, besides host. Must include x-amz-date and x-amz-content-sha256. */
  headers: Record<string, string>;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** The Authorization header for one request. */
export function signV4(i: SignInput): string {
  const all: Record<string, string> = { host: i.host };
  for (const [k, v] of Object.entries(i.headers)) all[k.toLowerCase()] = v.trim();
  const names = Object.keys(all).sort();
  const canonical = [i.method, i.path, "", names.map((n) => `${n}:${all[n]}\n`).join(""), names.join(";"), all["x-amz-content-sha256"]].join("\n");
  const stamp = all["x-amz-date"];
  const scope = `${stamp.slice(0, 8)}/${i.region}/${i.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256(canonical)].join("\n");
  let key = hmac(`AWS4${i.secretAccessKey}`, stamp.slice(0, 8));
  for (const part of [i.region, i.service, "aws4_request"]) key = hmac(key, part);
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
}

function settings() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export const r2Configured = () => settings() !== null;

/** Store one file in the bucket, replacing what was at that key. */
export async function r2Put(key: string, body: Buffer, contentType: string): Promise<void> {
  const s = settings();
  if (!s) throw new Error("R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)");
  const host = `${s.accountId}.r2.cloudflarestorage.com`;
  const path = `/${encodeKey(s.bucket)}/${encodeKey(key)}`;
  const headers = {
    "x-amz-date": new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
    "x-amz-content-sha256": sha256(body),
    "content-type": contentType,
  };
  const authorization = signV4({ method: "PUT", host, path, headers, region: "auto", service: "s3", accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey });
  const res = await fetch(`https://${host}${path}`, { method: "PUT", headers: { ...headers, authorization }, body: new Uint8Array(body), signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`R2 refused the upload (HTTP ${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
}
