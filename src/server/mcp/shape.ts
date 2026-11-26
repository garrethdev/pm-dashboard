/**
 * Every MCP reply leaves through here (Garreth, 2026-11-26).
 *
 * Three jobs, in this order:
 *
 * 1. **Scrub.** Drop any field whose name says secret (password, token, cookie,
 *    key…) and blank any value shaped like one (a login token, a signed link to
 *    a private file). The readers already pick columns by name, so this is the
 *    last check, not the first.
 * 2. **Mask.** Emails, phone numbers and proxy addresses are private but not
 *    secret: Claude gets enough to tell them apart and no more.
 * 3. **Fit.** Claude Code stops reading a reply at 25,000 tokens. A reply is held
 *    under REPLY_CAP characters by cutting its longest lists, and every cut is
 *    named in `meta.cut`, so nothing is ever shortened without saying so.
 *
 * Pure functions, no imports from the data layer: tested in shape.test.ts.
 */

export const REPLY_CAP = 60_000;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;

export interface Meta {
  tool: string;
  view: string;
  fleet?: string;
  /** When the data was read, from the page reader's own cache stamp when it has one. */
  fetchedAt: string;
  /** A remembered copy, served because the live read failed. */
  stale: boolean;
  total?: number;
  returned?: number;
  nextCursor?: string | null;
  truncated: boolean;
  /** Lists shortened to fit the reply: where, and how long each was. */
  cut?: { path: string; total: number; kept: number }[];
  /** How many fields the scrubber removed. */
  removed?: number;
  note?: string;
}

// ---------------------------------------------------------------- paging

/** An opaque cursor: the offset, base64url. Claude passes it back untouched. */
export function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`).toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const n = Number(raw.startsWith("o:") ? raw.slice(2) : NaN);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function clampLimit(limit: number | undefined, fallback = DEFAULT_LIMIT): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

export interface Page<T> {
  rows: T[];
  total: number;
  returned: number;
  nextCursor: string | null;
}

/** One page of an in-memory list. The total is always the whole list's. */
export function paginate<T>(rows: T[], limit?: number, cursor?: string | null): Page<T> {
  const size = clampLimit(limit);
  const start = Math.min(decodeCursor(cursor), rows.length);
  const slice = rows.slice(start, start + size);
  const end = start + slice.length;
  return {
    rows: slice,
    total: rows.length,
    returned: slice.length,
    nextCursor: end < rows.length ? encodeCursor(end) : null,
  };
}

/** Keep only the named fields of each row. Unknown names are ignored. */
export function pickFields<T extends object>(rows: T[], fields?: string[]): Partial<T>[] {
  if (!fields || fields.length === 0) return rows;
  const want = new Set(fields);
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) if (want.has(k)) out[k] = v;
    return out as Partial<T>;
  });
}

// ---------------------------------------------------------------- scrub and mask

/** Field names that mean "secret". Matched on the name with `_` and `-` removed. */
const SECRET_NAME =
  /(password|passwd|secret|accesstoken|refreshtoken|idtoken|apikey|privatekey|cookie|totp|2fa|otp(seed|code)?$|credential|authorization|bearer|sessionkey|^tokens?$)/;

/** Values that are secrets whatever their field is called. */
const SECRET_VALUE: RegExp[] = [
  /^eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}$/, // a JWT
  /^(sb_secret_|sk-|sk_live_|rk_live_|ghp_|gho_|xox[bpa]-)/, // vendor keys
];

/** A signed link to a file in a private bucket: works for anyone holding it. */
const SIGNED_LINK = /\/storage\/v1\/object\/sign\//;

const norm = (key: string) => key.toLowerCase().replace(/[_\-\s]/g, "");

export function maskEmail(value: string): string {
  return value.replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+)/g, (_m, first: string, domain: string) => `${first}***@${domain}`);
}

/** Keep the last four digits of every run of seven or more. */
export function maskPhone(value: string): string {
  return value.replace(/\+?[\d][\d\s().-]{5,}\d/g, (run) => {
    const digits = run.replace(/\D/g, "");
    if (digits.length < 7) return run;
    return `•••${digits.slice(-4)}`;
  });
}

/** "203.0.113.7:8080:user:pass" or "http://u:p@host:8080" → "203.x.x.x:8080". */
export function maskProxy(value: string): string {
  let rest = value.trim().replace(/^[a-z]+:\/\//i, "");
  if (rest.includes("@")) rest = rest.slice(rest.lastIndexOf("@") + 1);
  const [host, port] = rest.split(":");
  if (!host) return "•••";
  const ip = host.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  const shownHost = ip ? `${ip[1]}.x.x.x` : `${host.slice(0, 1)}•••${host.includes(".") ? host.slice(host.lastIndexOf(".")) : ""}`;
  return port && /^\d+$/.test(port) ? `${shownHost}:${port}` : shownHost;
}

type MaskKind = "email" | "phone" | "proxy" | null;

function maskKindFor(key: string): MaskKind {
  const k = norm(key);
  if (k.includes("email")) return "email";
  if (k.includes("phone") || k === "number" || k === "numbers") return "phone";
  if (k === "proxy" || k.startsWith("proxyhost") || k.startsWith("proxyip") || k.startsWith("proxyaddress") || k.startsWith("proxyurl") || k.startsWith("proxyline")) return "proxy";
  return null;
}

function applyMask(kind: MaskKind, value: string): string {
  if (kind === "email") return maskEmail(value);
  if (kind === "phone") return maskPhone(value);
  if (kind === "proxy") return maskProxy(value);
  return value;
}

export interface ScrubOptions {
  /** Masking on (the default). Off only for fields a tool has already masked. */
  mask?: boolean;
}

/**
 * Walk a value and return a copy with secrets removed and private values
 * masked. `counter.removed` counts what was taken out, so the reply can say so.
 */
export function scrub(value: unknown, counter: { removed: number } = { removed: 0 }, opts: ScrubOptions = {}, kind: MaskKind = null): unknown {
  const mask = opts.mask !== false;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (SECRET_VALUE.some((re) => re.test(value.trim()))) {
      counter.removed++;
      return "[removed]";
    }
    if (SIGNED_LINK.test(value)) {
      counter.removed++;
      return "[private file: link not shared]";
    }
    if (!mask) return value;
    // An email can sit in any field ("doneBy", "review.by"), so every string
    // has its addresses masked, whatever the field is called.
    const masked = kind ? applyMask(kind, value) : value;
    return masked.includes("@") ? maskEmail(masked) : masked;
  }
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  // A list carries its field's mask to its strings; an object inside it starts
  // afresh, so a "phones" list of objects does not mask the dates inside them.
  if (Array.isArray(value)) return value.map((v) => scrub(v, counter, opts, kind));

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    // A secret-sounding name holding a number is a count (input_tokens), not a secret.
    if (SECRET_NAME.test(norm(key)) && v !== null && typeof v !== "number" && typeof v !== "boolean") {
      counter.removed++;
      continue;
    }
    out[key] = scrub(v, counter, opts, maskKindFor(key));
  }
  return out;
}

// ---------------------------------------------------------------- fit

interface ArrayRef {
  path: string;
  holder: unknown[] | Record<string, unknown>;
  key: number | string;
  arr: unknown[];
}

function findArrays(value: unknown, path: string, out: ArrayRef[], holder?: ArrayRef["holder"], key?: ArrayRef["key"]): void {
  if (Array.isArray(value)) {
    if (holder !== undefined && key !== undefined) out.push({ path: path || "data", holder, key, arr: value });
    value.forEach((v, i) => findArrays(v, `${path}[${i}]`, out, value, i));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      findArrays(v, path ? `${path}.${k}` : k, out, value as Record<string, unknown>, k);
    }
  }
}

/**
 * Shorten the longest lists until the serialised reply fits. Returns what was
 * cut. A value with no lists that is still too big is reported, not mangled.
 */
export function fitToCap(envelope: { data: unknown }, cap = REPLY_CAP): { cut: Meta["cut"]; fits: boolean } {
  const cuts = new Map<string, { total: number; kept: number }>();
  for (let guard = 0; guard < 60; guard++) {
    if (JSON.stringify(envelope).length <= cap) {
      return { cut: [...cuts].map(([path, c]) => ({ path, ...c })), fits: true };
    }
    const refs: ArrayRef[] = [];
    findArrays(envelope, "", refs);
    const longest = refs
      .filter((r) => r.arr.length > 1)
      .sort((a, b) => JSON.stringify(b.arr).length - JSON.stringify(a.arr).length)[0];
    if (!longest) break;
    const kept = Math.max(1, Math.floor(longest.arr.length / 2));
    const path = longest.path.replace(/^data\.?/, "") || "data";
    const prev = cuts.get(path);
    cuts.set(path, { total: prev?.total ?? longest.arr.length, kept });
    const shorter = longest.arr.slice(0, kept);
    if (Array.isArray(longest.holder)) longest.holder[longest.key as number] = shorter;
    else longest.holder[longest.key as string] = shorter;
  }
  return { cut: [...cuts].map(([path, c]) => ({ path, ...c })), fits: JSON.stringify(envelope).length <= cap };
}

// ---------------------------------------------------------------- the reply

export interface ToolText {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/**
 * The one way a tool answers. `data` is scrubbed, masked and fitted; `meta`
 * says how old it is, how much there is and what was cut.
 */
export function reply(data: unknown, meta: Omit<Meta, "truncated" | "removed" | "cut"> & { truncated?: boolean }): ToolText {
  const counter = { removed: 0 };
  const envelope = { data: scrub(data, counter), meta: { ...meta, truncated: Boolean(meta.truncated) } as Meta };
  const { cut, fits } = fitToCap(envelope);
  if (cut && cut.length) {
    envelope.meta.cut = cut;
    envelope.meta.truncated = true;
    envelope.meta.note = [envelope.meta.note, "Some lists were shortened to fit one reply. Ask for fewer rows (limit), a narrower view, or detail: \"summary\"."]
      .filter(Boolean)
      .join(" ");
  }
  if (counter.removed) envelope.meta.removed = counter.removed;
  if (!fits) {
    return failure(
      meta.tool,
      `The answer is too large for one reply (over ${REPLY_CAP.toLocaleString("en-US")} characters). Ask for fewer rows with limit, a narrower view, fields, or detail: "summary".`,
    );
  }
  return { content: [{ type: "text", text: JSON.stringify(envelope) }] };
}

export function failure(tool: string, message: string): ToolText {
  return { content: [{ type: "text", text: JSON.stringify({ error: message, tool }) }], isError: true };
}
