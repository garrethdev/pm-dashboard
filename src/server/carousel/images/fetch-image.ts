import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(network, prefix, "ipv4");

export function isPublicImageIPv4(address: string) {
  return isIP(address) === 4 && !blocked.check(address, "ipv4");
}

function imageUrl(raw: string, origins: readonly string[]) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid image URL"); }
  if (raw.length > 8192 || url.protocol !== "https:" || url.port || url.username || url.password || url.hash ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) || !origins.includes(url.origin)) throw new Error("Image origin is not allowed");
  return url;
}

function isRaster(bytes: Buffer) {
  return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ||
    bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

/** No redirects, ambient proxy agent, credentials, cookies or second DNS lookup.
 * Connect to the checked address, retaining the original host for TLS certificate
 * verification/SNI and HTTP routing. Sharp subsequently validates the full raster.
 */
function download(url: URL, address: string, maxBytes: number, signal: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = request({ protocol: "https:", hostname: address, port: 443, servername: url.hostname,
      path: url.pathname + url.search, method: "GET", agent: false, rejectUnauthorized: true, signal,
      headers: { Host: url.host, Accept: "image/jpeg,image/png,image/webp", "Accept-Encoding": "identity" } }, response => {
      const fail = () => { response.destroy(); reject(new Error("Image response rejected")); };
      const type = String(response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      const encoding = response.headers["content-encoding"];
      const length = response.headers["content-length"];
      if (response.statusCode !== 200 || !["image/jpeg", "image/png", "image/webp"].includes(type) ||
        encoding && encoding !== "identity" || length !== undefined && (!/^\d+$/.test(length) || Number(length) > maxBytes)) { fail(); return; }
      const chunks: Buffer[] = []; let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) { fail(); return; }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (!response.complete || !size || length !== undefined && size !== Number(length)) { fail(); return; }
        const bytes = Buffer.concat(chunks, size);
        if (!isRaster(bytes)) { fail(); return; }
        resolve(bytes);
      });
      response.on("error", () => reject(new Error("Image transfer failed")));
      response.on("aborted", () => reject(new Error("Image transfer aborted")));
    });
    req.on("error", () => reject(new Error("Image request failed")));
    req.end();
  });
}

/** Server-owned policy only: never build allowedOrigins from a request or saved
 * manifest. Empty configuration denies everything. IPv6-only hosts intentionally
 * fail closed until an equivalent IPv6 address policy has been reviewed.
 * Timeout covers DNS and body transfer; DNS results are pinned to prevent rebinding.
 */
export async function fetchImageBytes(raw: string, policy: {
  allowedOrigins: readonly string[]; maxBytes?: number; timeoutMs?: number;
}): Promise<Buffer> {
  const maxBytes = policy.maxBytes ?? 20_000_000, timeoutMs = policy.timeoutMs ?? 15_000;
  if (!Array.isArray(policy.allowedOrigins) || policy.allowedOrigins.length > 32 ||
    !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 20_000_000 ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new Error("Invalid image fetch policy");
  const url = imageUrl(raw, policy.allowedOrigins);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Image fetch timed out")); }, timeoutMs);
  });
  const work = async () => {
    const records = await lookup(url.hostname, { family: 4, all: true });
    if (controller.signal.aborted) throw new Error("Image fetch timed out");
    if (!records.length || records.some(record => !isPublicImageIPv4(record.address))) throw new Error("Image address is not public");
    return download(url, records[0].address, maxBytes, controller.signal);
  };
  try { return await Promise.race([work(), timedOut]); }
  catch { throw new Error("Image could not be downloaded safely"); }
  finally { clearTimeout(timer); controller.abort(); }
}
