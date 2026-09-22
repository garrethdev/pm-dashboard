/**
 * Posts handed to a person to post by hand (PF-05).
 *
 * One row of `post_deliveries` per post handed out. On the Geelark fleet the
 * answer to "did this actually go out?" is `geelark_tasks.status = 3`, reported
 * back by the cloud phone. A real iPhone reports nothing, so on the Physical
 * fleet the answer is a row in this table being flipped to `posted`.
 *
 * `post_deliveries` is service-role only (RLS on, no policies), like `devices`
 * and `accounts`, so everything here runs server-side with the service key.
 *
 * Reads here are deliberately **not** cached. A to-do list is written to while
 * it is being looked at, and a cached copy would show an item somebody has
 * just ticked as still outstanding — the one thing this screen must never do.
 * PF-07 owns the screen and can revisit that if a list ever gets big enough to
 * be worth a cache.
 *
 * Reads and writes live in one file on purpose. PF-02 split `devices.ts` from
 * `device-writes.ts` to avoid two people editing the same file at once; the
 * same reasoning applies here, and one new self-contained file touches nothing
 * anyone else is holding.
 */

/** Every state a handed-out post can be in. Mirrors the check constraint. */
export const DELIVERY_STATUSES = ["queued", "posted", "failed", "skipped"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return typeof value === "string" && (DELIVERY_STATUSES as readonly string[]).includes(value);
}

/**
 * True when a row in this state should carry a finished-at time.
 *
 * The database enforces the same rule (`post_deliveries_done_at_check`). It is
 * repeated here so a write built in the app sets the right fields rather than
 * finding out from a 400.
 */
export function isFinished(status: DeliveryStatus): boolean {
  return status !== "queued";
}

export interface PostDelivery {
  id: number;
  /** The content type, as `content_type_registry` names it. */
  contentType: string;
  /** The table the content row lives in, and its id in that table. */
  sourceTable: string;
  sourceId: string;
  accountId: number;
  /** The phone it was handed to. Null when the account is not on one. */
  deviceId: number | null;
  status: DeliveryStatus;
  /** Link to the live post. Null means posted but not yet linked. */
  postUrl: string | null;
  note: string | null;
  doneBy: string | null;
  doneAt: string | null;
  createdAt: string;
}

interface RawDelivery {
  id: number;
  content_type: string;
  source_table: string;
  source_id: string;
  account_id: number;
  device_id: number | null;
  status: string;
  post_url: string | null;
  note: string | null;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
}

const COLS =
  "id,content_type,source_table,source_id,account_id,device_id,status,post_url,note,done_by,done_at,created_at";

function toDelivery(row: RawDelivery): PostDelivery {
  return {
    id: row.id,
    contentType: row.content_type,
    sourceTable: row.source_table,
    sourceId: row.source_id,
    accountId: row.account_id,
    deviceId: row.device_id,
    // The column is constrained to these four, so an unknown value means the
    // constraint was changed without this file; say so rather than silently
    // rendering a status nothing knows how to draw.
    status: isDeliveryStatus(row.status) ? row.status : "queued",
    postUrl: row.post_url,
    note: row.note,
    doneBy: row.done_by,
    doneAt: row.done_at,
    createdAt: row.created_at,
  };
}

/** An error whose message is already a sentence for the screen, with the HTTP
 *  status the route should answer with. */
export class DeliveryWriteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

/** Same shape as the helper in `device-writes.ts`: timeout, one retry, and a
 *  sentence rather than a stack trace when Supabase cannot be reached. */
async function sbFetch(path: string, init: RequestInit, retries = 1): Promise<Response> {
  const key = serviceKey();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Couldn't reach Supabase (${lastErr instanceof Error ? lastErr.message : "timeout"})`,
  );
}

const JSON_HEADERS = { "Content-Type": "application/json" };

async function readRows(path: string, what: string): Promise<PostDelivery[]> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return ((await res.json()) as RawDelivery[]).map(toDelivery);
}

/**
 * Posts still waiting to be posted, oldest first.
 *
 * Narrow it by phone or by account; with neither it is every open delivery in
 * the fleet, which is what a dashboard count wants.
 */
export function getOpenDeliveries(
  filter: { deviceId?: number; accountId?: number } = {},
): Promise<PostDelivery[]> {
  const parts = [`select=${COLS}`, "status=eq.queued", "order=created_at.asc"];
  if (filter.deviceId !== undefined) parts.push(`device_id=eq.${filter.deviceId}`);
  if (filter.accountId !== undefined) parts.push(`account_id=eq.${filter.accountId}`);
  return readRows(`post_deliveries?${parts.join("&")}`, "the posts waiting to go out");
}

/**
 * Posts that actually went out, newest first. This is the Physical fleet's
 * answer to the question `geelark_tasks.status = 3` answers for Cloud.
 */
export function getPostedDeliveries(
  filter: { accountId?: number; since?: string; limit?: number } = {},
): Promise<PostDelivery[]> {
  const parts = [`select=${COLS}`, "status=eq.posted", "order=done_at.desc"];
  if (filter.accountId !== undefined) parts.push(`account_id=eq.${filter.accountId}`);
  if (filter.since !== undefined) parts.push(`done_at=gte.${filter.since}`);
  parts.push(`limit=${filter.limit ?? 200}`);
  return readRows(`post_deliveries?${parts.join("&")}`, "the posts that went out");
}

/** One delivery, read live. Null when it no longer exists. */
export async function getDelivery(id: number): Promise<PostDelivery | null> {
  const rows = await readRows(
    `post_deliveries?select=${COLS}&id=eq.${id}&limit=1`,
    "that post",
  );
  return rows[0] ?? null;
}

export interface QueueDeliveryInput {
  contentType: string;
  sourceTable: string;
  sourceId: string;
  accountId: number;
  deviceId?: number | null;
  note?: string | null;
}

/**
 * Hand a post to a person.
 *
 * Handing out the same content row to the same account twice does nothing at
 * all: the unique index refuses it and `created` comes back false with the row
 * as it already stands. That matters because the Posting Agent fork (PF-06) is
 * an n8n workflow, and n8n retries — a retry must not put a second copy of the
 * same post on somebody's list, and must not drag a post already marked done
 * back onto it.
 */
export async function queueDelivery(
  input: QueueDeliveryInput,
): Promise<{ delivery: PostDelivery; created: boolean }> {
  const body = {
    content_type: input.contentType,
    source_table: input.sourceTable,
    source_id: input.sourceId,
    account_id: input.accountId,
    device_id: input.deviceId ?? null,
    note: input.note ?? null,
  };
  const res = await sbFetch(
    `post_deliveries?select=${COLS}&on_conflict=source_table,source_id,account_id`,
    {
      method: "POST",
      headers: {
        ...JSON_HEADERS,
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    },
    // No retry on a create. A request that timed out may still have landed,
    // and the ignore-duplicates path would then report it as pre-existing.
    0,
  );
  if (!res.ok) {
    if (res.status === 409) {
      throw new DeliveryWriteError("That account no longer exists.", 409);
    }
    console.error(
      `queueing a post rejected (HTTP ${res.status}):`,
      await res.text().catch(() => ""),
    );
    throw new Error(`Handing out the post failed (HTTP ${res.status}). Nothing was changed.`);
  }
  const rows = (await res.json()) as RawDelivery[];
  if (rows[0]) return { delivery: toDelivery(rows[0]), created: true };

  // Ignored as a duplicate: the row is already there. Read it back so the
  // caller gets the same shape either way.
  const existing = await readRows(
    `post_deliveries?select=${COLS}` +
      `&source_table=eq.${encodeURIComponent(input.sourceTable)}` +
      `&source_id=eq.${encodeURIComponent(input.sourceId)}` +
      `&account_id=eq.${input.accountId}&limit=1`,
    "that post",
  );
  if (!existing[0]) throw new Error("Handing out the post returned nothing.");
  return { delivery: existing[0], created: false };
}

export interface MarkDeliveryInput {
  status: DeliveryStatus;
  /** Only meaningful on `posted`; left alone when not given. */
  postUrl?: string | null;
  note?: string | null;
  /** Who did it. Recorded, never shown — the screens show a status, not a name. */
  doneBy?: string | null;
}

/**
 * Flip a delivery: mark it posted, failed or skipped — or put it back on the
 * list by setting it to `queued` again.
 *
 * `done_at` is set from here rather than left to the caller, because the
 * database refuses a finished row without one and a queued row with one.
 */
export async function markDelivery(
  id: number,
  input: MarkDeliveryInput,
): Promise<PostDelivery> {
  const finished = isFinished(input.status);
  const patch: Record<string, unknown> = {
    status: input.status,
    done_at: finished ? new Date().toISOString() : null,
    done_by: finished ? (input.doneBy ?? null) : null,
    updated_at: new Date().toISOString(),
  };
  if (input.postUrl !== undefined) patch.post_url = input.postUrl;
  if (input.note !== undefined) patch.note = input.note;

  const res = await sbFetch(`post_deliveries?id=eq.${id}&select=${COLS}`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    console.error(
      `marking a post rejected (HTTP ${res.status}):`,
      await res.text().catch(() => ""),
    );
    throw new Error(`Saving failed (HTTP ${res.status}). Nothing was changed.`);
  }
  const rows = (await res.json()) as RawDelivery[];
  if (!rows[0]) throw new DeliveryWriteError("That post is no longer on the list.", 404);
  return toDelivery(rows[0]);
}

/** Paste the link for a post already marked done, which is the second half of
 *  ticking one off and the part attribution actually needs. */
export async function setDeliveryUrl(id: number, postUrl: string): Promise<PostDelivery> {
  const res = await sbFetch(`post_deliveries?id=eq.${id}&select=${COLS}`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ post_url: postUrl, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Saving the link failed (HTTP ${res.status}). Nothing was changed.`);
  const rows = (await res.json()) as RawDelivery[];
  if (!rows[0]) throw new DeliveryWriteError("That post is no longer on the list.", 404);
  return toDelivery(rows[0]);
}
