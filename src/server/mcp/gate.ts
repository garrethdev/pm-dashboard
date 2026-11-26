/**
 * Keeps Claude gentle on the database (Garreth, 2026-11-26).
 *
 * The database allows 60 connections, and the 2026-10-09 outage came from too
 * many requests landing at once. Claude can fire tool calls back to back, so:
 *
 * - **One line.** At most MAX_RUNNING tool calls run at once on a server
 *   instance; the rest wait up to WAIT_MS and then answer "busy".
 * - **A call limit.** CALLS_PER_MINUTE per person, so a loop that runs away
 *   stops itself.
 * - **One log line per call** in Vercel's logs: who, which tool, how long,
 *   whether it worked. Phase 1 writes nothing to the database, this included.
 *
 * Both limits live in this server instance's memory. Vercel may run more than
 * one instance, so they are a brake, not a guarantee; the readers' own 60 s
 * cache is what really keeps repeated questions cheap.
 */

export const MAX_RUNNING = 3;
export const WAIT_MS = 20_000;
export const CALLS_PER_MINUTE = 60;

let running = 0;
const waiting: (() => void)[] = [];

export class GateBusy extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateBusy";
  }
}

async function acquire(): Promise<void> {
  if (running < MAX_RUNNING) {
    running++;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const wake = () => {
      clearTimeout(timer);
      running++;
      resolve();
    };
    const timer = setTimeout(() => {
      const i = waiting.indexOf(wake);
      if (i >= 0) waiting.splice(i, 1);
      reject(new GateBusy("The dashboard is busy answering other questions. Try again in a few seconds."));
    }, WAIT_MS);
    waiting.push(wake);
  });
}

function release(): void {
  running = Math.max(0, running - 1);
  const next = waiting.shift();
  if (next) next();
}

const calls = new Map<string, number[]>();

/** True when this person may make another call now. Records the call. */
export function underLimit(email: string, now = Date.now()): boolean {
  const since = now - 60_000;
  const recent = (calls.get(email) ?? []).filter((t) => t > since);
  if (recent.length >= CALLS_PER_MINUTE) {
    calls.set(email, recent);
    return false;
  }
  recent.push(now);
  calls.set(email, recent);
  return true;
}

/** Test hook: forget every recorded call. */
export function resetGate(): void {
  calls.clear();
  running = 0;
  waiting.length = 0;
}

/** Run one tool call through the line, and log it. */
export async function gated<T>(who: string, tool: string, args: unknown, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  if (!underLimit(who)) {
    log({ who, tool, ok: false, ms: 0, error: "call limit" });
    throw new GateBusy(`More than ${CALLS_PER_MINUTE} calls in a minute. Wait a moment, then ask again.`);
  }
  await acquire();
  try {
    const out = await fn();
    log({ who, tool, ok: true, ms: Date.now() - started, args });
    return out;
  } catch (err) {
    log({ who, tool, ok: false, ms: Date.now() - started, args, error: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    release();
  }
}

function log(entry: { who: string; tool: string; ok: boolean; ms: number; args?: unknown; error?: string }): void {
  const args = entry.args === undefined ? undefined : JSON.stringify(entry.args).slice(0, 300);
  console.log(JSON.stringify({ mcp: entry.tool, who: entry.who, ok: entry.ok, ms: entry.ms, args, error: entry.error?.slice(0, 300) }));
}
