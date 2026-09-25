/** Pure runner primitives shared by manual and Auto orchestration.
 * Persistence must acquire/renew leases atomically; these helpers grant no lock.
 */
export const STALL_AFTER_MS = 60_000;
export const RENDER_LEASE_MS = 10 * 60_000;

export function batchLetter(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error("Invalid batch sequence");
  let value = index + 1, result = "";
  while (value > 0) {
    value--;
    result = String.fromCharCode(97 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

/** UTC day is supplied explicitly from the batch creation transaction's timestamp. */
export function batchName(contentType: string, date: string, index: number): string {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(contentType)) throw new Error("Invalid batch name prefix");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("Invalid batch date");
  return `${contentType}-${date}-${batchLetter(index)}`;
}

export function isStalled(input: { phase: string; lastMovementAt: string; now: number }): boolean {
  const moved = Date.parse(input.lastMovementAt);
  if (!Number.isFinite(moved) || !Number.isFinite(input.now)) throw new Error("Invalid runner timestamp");
  // Waiting for human review is never a stalled worker, however old the batch is.
  return ["generating", "rendering"].includes(input.phase) && input.now - moved >= STALL_AFTER_MS;
}

export interface AutoDeckSnapshot {
  state: "pending" | "writing" | "written" | "rendering" | "rendered" | "flagged" | "failed" | "approved" | "dropped" | "discarded";
  /** Initial attempt is 1; attempt increments only after a claimed rewrite starts. */
  attempt: number;
  paused: boolean;
  checksPassed: boolean;
}
export type AutoDecision = "wait" | "write" | "render" | "rewrite" | "drop" | "needs_attention" | "await_human_approval" | "settled";

/** DEV-49: three complete attempts, not three extra retries. Infrastructure
 * failures are not quality failures and must not silently exhaust content tries.
 * This is a decision only. A fenced worker applies it transactionally later.
 */
export function nextAutoDecision(deck: AutoDeckSnapshot): AutoDecision {
  if (!Number.isInteger(deck.attempt) || deck.attempt < 1 || deck.attempt > 3) throw new Error("Invalid Auto attempt");
  if (["approved", "dropped", "discarded"].includes(deck.state)) return "settled";
  if (deck.paused) return "wait";
  switch (deck.state) {
    case "pending": return "write";
    case "writing": case "rendering": return "wait";
    case "written": return deck.checksPassed ? "render" : "needs_attention";
    case "rendered": return deck.checksPassed ? "await_human_approval" : "needs_attention";
    case "flagged": return deck.attempt === 3 ? "drop" : "rewrite";
    case "failed": return "needs_attention";
    default: throw new Error("Invalid Auto deck state");
  }
}
