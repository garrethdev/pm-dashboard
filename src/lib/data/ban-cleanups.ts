import { proxyForDisplay } from "@/lib/data/device-rules";
import { toPlatform } from "@/lib/platform";
import type { BanCleanup, BanStep } from "@/lib/data/todo-placeholder";

/**
 * Retiring a banned account on a REAL phone — PF-11, the build of design P8
 * (approved by Garreth 2026-09-23).
 *
 * The Cloud Retire asks the Post-Ban robot to delete a Geelark phone. A real
 * phone has no robot, so it is never asked: the app does its own half in one
 * database call (`retire_phone_account`) — the account is marked retired, its
 * queued posts go back to the pool, its open to-do posts are closed — and the
 * phone half is written as checklist steps that sit on the to-do list until a
 * person has ticked them.
 *
 * Not cached, for the to-do list's reason: the steps are ticked while the list
 * is being looked at.
 */

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

/** Same shape as the helper in `post-deliveries.ts`, with the retry made
 *  optional: the retire itself is sent once, because a retry of a write that
 *  timed out in the reply would otherwise be sent blind. */
async function sbFetch(path: string, init: RequestInit, retries = 1): Promise<Response> {
  const key = serviceKey();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
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

/** Postgres raises its refusals as sentences; hand those on rather than a code. */
async function refusal(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // not JSON; fall through
  }
  return `${fallback} (HTTP ${res.status})`;
}

async function read<T>(path: string, what: string): Promise<T> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

/** An error whose message is already a sentence for the screen. */
export class RetireError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface RawAccount {
  id: number;
  geelark_profile: string;
  device_id: number | null;
  delivery_mode: string | null;
  is_active: boolean;
  phone_number: string | null;
}

interface RawDevice {
  id: number;
  name: string;
  proxy: string | null;
}

export interface RetirePreview {
  profile: string;
  /** The phone's name, or null when the account is not on one. */
  phone: string | null;
  /** Other active accounts on the same phone, which share its proxy. */
  others: number;
  /** Content rows the retire will hand back to the pool. */
  queued: number;
  /** The account's own number (P14: numbers belong to accounts). */
  number: string | null;
  proxy: string | null;
}

async function readAccount(profile: string): Promise<RawAccount> {
  const rows = await read<RawAccount[]>(
    `accounts?select=id,geelark_profile,device_id,delivery_mode,is_active,phone_number` +
      `&geelark_profile=eq.${encodeURIComponent(profile)}`,
    "the account",
  );
  const a = rows[0];
  if (!a) throw new RetireError(`No account called ${profile}`, 404);
  if (a.delivery_mode !== "manual") {
    throw new RetireError(`${profile} is on Cloud. Retire it from the Cloud side`, 409);
  }
  return a;
}

async function readDevice(id: number | null): Promise<RawDevice | null> {
  if (id === null) return null;
  const rows = await read<RawDevice[]>(`devices?select=id,name,proxy&id=eq.${id}`, "the phone");
  return rows[0] ?? null;
}

/** What the retire dialog says before the hold. Reads only. */
export async function getRetirePreview(profile: string): Promise<RetirePreview> {
  const account = await readAccount(profile);
  if (!account.is_active) throw new RetireError(`${profile} is already retired`, 409);

  const [device, others, pending] = await Promise.all([
    readDevice(account.device_id),
    account.device_id === null
      ? Promise.resolve([])
      : read<{ id: number }[]>(
          `accounts?select=id&device_id=eq.${account.device_id}&is_active=eq.true&id=neq.${account.id}`,
          "the phone's accounts",
        ),
    sbFetch("rpc/profile_content_pending", {
      method: "POST",
      body: JSON.stringify({ p_profile: profile }),
    }),
  ]);
  if (!pending.ok) throw new Error(await refusal(pending, "Couldn't count the queued posts"));

  return {
    profile,
    phone: device?.name ?? null,
    others: others.length,
    queued: Number(await pending.json()) || 0,
    number: account.phone_number,
    proxy: proxyForDisplay(device?.proxy ?? null),
  };
}

export interface RetireResult {
  already: boolean;
  released?: number;
  closedDeliveries?: number;
  steps?: number;
  phone?: string | null;
}

/**
 * Retire it. One database call, so it all lands or none of it does.
 *
 * `retireProxy` is the dialog's switch (Garreth, 2026-09-23): the proxy step is
 * only written when it is on.
 */
export async function retirePhoneAccount(
  profile: string,
  retireProxy: boolean,
  by: string,
): Promise<RetireResult> {
  const account = await readAccount(profile);
  const device = await readDevice(account.device_id);

  // Sent once. The function answers `already` when it has landed before, so a
  // second press after a timeout is safe; a silent automatic retry is not
  // needed and would hide the timeout from the person holding the button.
  const res = await sbFetch(
    "rpc/retire_phone_account",
    {
      method: "POST",
      body: JSON.stringify({
        p_profile: profile,
        p_retire_proxy: retireProxy,
        p_number: account.phone_number,
        p_proxy: proxyForDisplay(device?.proxy ?? null),
        p_by: by,
      }),
    },
    0,
  );
  if (!res.ok) throw new RetireError(await refusal(res, "Couldn't retire the account"), 502);
  return (await res.json()) as RetireResult;
}

interface RawStep {
  id: number;
  account_id: number;
  device_id: number | null;
  kind: string;
  detail: string | null;
  position: number;
  done_at: string | null;
  created_at: string;
}

const LABELS: Record<BanStep["kind"], string> = {
  signOut: "Sign out on the phone",
  number: "Retire the number",
  proxy: "Retire the proxy",
};

function isKind(k: string): k is BanStep["kind"] {
  return k === "signOut" || k === "number" || k === "proxy";
}

/** "HH:MM" in New York, as every time on the to-do list is shown. */
function etTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * The checklists that belong on one day's list, by phone.
 *
 * An unfinished checklist is shown every day from its retire until it is done:
 * like any unfinished item it carries over (decision 5), and unlike a post it
 * never stops, because a banned account still signed in on a phone is not
 * something that expires. A finished one stays for the rest of the day its
 * last step was ticked, struck through (P8), and then goes.
 */
export async function getCleanupsByDevice(
  from: Date,
  to: Date,
): Promise<Map<number, BanCleanup[]>> {
  const out = new Map<number, BanCleanup[]>();

  // Every step of any checklist that could touch this day: started before it
  // ended, and either still open or finished after it began. Read by account
  // so a checklist is judged whole, never step by step.
  const open = await read<{ account_id: number }[]>(
    `ban_cleanup_steps?select=account_id&created_at=lt.${encodeURIComponent(to.toISOString())}` +
      // Quoted inside or=(…), where a bare "." or ":" in the value would be
      // read as syntax.
      `&or=${encodeURIComponent(`(done_at.is.null,done_at.gte."${from.toISOString()}")`)}`,
    "the ban clean-ups",
  );
  const accountIds = [...new Set(open.map((r) => r.account_id))];
  if (accountIds.length === 0) return out;

  const inList = `(${accountIds.join(",")})`;
  const [steps, accounts] = await Promise.all([
    read<RawStep[]>(
      `ban_cleanup_steps?select=id,account_id,device_id,kind,detail,position,done_at,created_at` +
        `&account_id=in.${inList}&order=position.asc`,
      "the ban clean-ups",
    ),
    read<
      {
        id: number;
        geelark_profile: string | null;
        username: string | null;
        platform: string | null;
      }[]
    >(
      `accounts?select=id,geelark_profile,username,platform&id=in.${inList}`,
      "the banned accounts",
    ),
  ]);
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  for (const accountId of accountIds) {
    const mine = steps.filter((s) => s.account_id === accountId && isKind(s.kind));
    if (mine.length === 0) continue;

    // A finished checklist belongs to the day its LAST step was ticked.
    const allDone = mine.every((s) => s.done_at);
    if (allDone) {
      const last = mine.reduce((a, s) => (s.done_at! > a ? s.done_at! : a), "");
      const at = Date.parse(last);
      if (at < from.getTime() || at >= to.getTime()) continue;
    }

    const deviceId = mine[0]!.device_id;
    if (deviceId === null) continue;
    const a = accountById.get(accountId);

    const cleanup: BanCleanup = {
      accountId: String(accountId),
      handle: a?.username ? `@${a.username}` : (a?.geelark_profile ?? `Account ${accountId}`),
      platform: toPlatform(a?.platform),
      steps: mine.map<BanStep>((s) => ({
        id: String(s.id),
        kind: s.kind as BanStep["kind"],
        label: LABELS[s.kind as BanStep["kind"]],
        ...(s.detail ? { detail: s.detail } : {}),
        done: s.done_at !== null,
        ...(s.done_at ? { doneAt: etTime(s.done_at) } : {}),
      })),
    };
    const list = out.get(deviceId);
    if (list) list.push(cleanup);
    else out.set(deviceId, [cleanup]);
  }
  return out;
}

/**
 * Tick a step, or untick it after a wrong tap.
 *
 * The write only applies when the step is in the state the tick expects, so
 * two people ticking the same step both end with it ticked once, keeping the
 * first time. A tick that finds the step already where it was asked to go is
 * answered as done, not as a conflict: the list is shared, and the answer the
 * person wanted is already true. Resolves true when this call changed it.
 */
export async function setStepDone(id: number, done: boolean, by: string): Promise<boolean> {
  const res = await sbFetch(
    `ban_cleanup_steps?id=eq.${id}&done_at=${done ? "is.null" : "not.is.null"}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        done_at: done ? new Date().toISOString() : null,
        done_by: done ? by : null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!res.ok) throw new RetireError(await refusal(res, "Couldn't save the tick"), 502);
  const changed = (await res.json()) as unknown[];
  if (changed.length > 0) return true;

  // Nothing changed: either it was already there, or the step does not exist.
  const rows = await read<{ id: number }[]>(`ban_cleanup_steps?select=id&id=eq.${id}`, "the step");
  if (rows.length === 0) throw new RetireError("That step is no longer on the list.", 404);
  return false;
}
