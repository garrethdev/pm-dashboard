/**
 * What to put on a panel that could not load.
 *
 * **The old copy asserted a cause it had not established.** Every one of these
 * panels said "Supabase unreachable", and on 2026-09-08 that sent Garreth
 * looking for an outage that had never happened: the database answered every
 * single request that day with a 200 and no 5xx anywhere, it was just slow —
 * up to 28 seconds — because saving the cadence expired every cached figure at
 * once and 180 panels all refetched together. Our own 10-second cut-off fired,
 * and the screen reported that as the database being down.
 *
 * A timeout means *we stopped waiting*. It does not mean the other end is
 * gone, and it is usually the opposite: something that is down refuses a
 * connection immediately. So the three cases are told apart and named:
 *
 *   we stopped waiting   -> say so, and say it is probably a burst
 *   it answered an error -> quote the code, which is a real fact
 *   anything else        -> quote the message, and claim nothing
 *
 * This is lever 1 of the three in BACKLOG.md ("fix the message... costs a
 * string"). Levers 2 and 3 — staggering the post-save refetch, and PostgREST's
 * connection pool — are still open. This makes the screen honest about what
 * happened; it does not stop it happening.
 */

/**
 * True when the failure was our own deadline, not the far end.
 *
 * `AbortSignal.timeout()` rejects with a `TimeoutError`, which is a
 * `DOMException` rather than an `Error` — so this checks the name rather than
 * the type, because `err instanceof Error` is false for it.
 */
function isOurTimeout(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "TimeoutError";
}

/**
 * One sentence for a panel that has no data to show.
 *
 * `upstream` is the thing that was being read, named the way Garreth would say
 * it — "Supabase", "n8n", "GeeLark". It is used in the copy, so it wants to be
 * a name and not a variable.
 */
export function upstreamMessage(err: unknown, upstream: string): string {
  if (isOurTimeout(err)) {
    return (
      `${upstream} took too long to answer — it is probably still running. ` +
      `This usually happens when several panels reload at once. Press Refresh.`
    );
  }

  const raw = err instanceof Error ? err.message : String(err ?? "");

  // "supabase HTTP 503 on accounts" — the status is a fact worth keeping, and
  // a 5xx genuinely is the far end failing rather than us giving up.
  const status = /HTTP (\d{3})/.exec(raw)?.[1];
  if (status) {
    return `${upstream} answered with an error (${status}). Press Refresh to try again.`;
  }

  return raw
    ? `${upstream} could not be read: ${raw}`
    : `${upstream} could not be read.`;
}
