/**
 * The quality gate (DEV-09), run inside writing: a deck is flagged when a
 * role is missing or over its limit, when its hook is too close to another
 * deck's in the same batch, or when a line trips a compliance word. A flagged
 * deck is never rendered and never released until it is rewritten.
 *
 * The score is out of 10; under 6 is a flag. The suggested fix is what Auto
 * hands back to the writer as feedback (DEV-49).
 */
import type { CopyRole } from "@/server/carousel/services/writer";

export interface GateResult {
  score: number;
  flagged: boolean;
  kind: "too_long" | "missing" | "too_similar" | "compliance" | null;
  reason: string | null;
  fix: string | null;
}

/** Words that trip the Content Risk Gate on this account (medical claims). */
const RISK_WORDS = ["cure", "cures", "guaranteed", "guarantee", "fda approved", "prescription", "diagnose", "miracle drug", "lose 30", "lose 20 pounds in"];

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));
}

export function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / (wa.size + wb.size - shared);
}

export function gateDeck(copy: Record<string, string>, contract: CopyRole[], hook: string, otherHooks: string[]): GateResult {
  let score = 10;
  let worst: GateResult | null = null;
  const note = (kind: GateResult["kind"], reason: string, fix: string, penalty: number) => {
    score -= penalty;
    if (!worst) worst = { score, flagged: true, kind, reason, fix };
  };

  for (const r of contract) {
    if (r.writer !== "ai" || r.role === "caption") continue;
    const text = copy[r.role] ?? "";
    if (!text.trim()) {
      note("missing", `${r.role.replace(/_/g, " ")} is empty`, `Write the ${r.role.replace(/_/g, " ")} line.`, 5);
      continue;
    }
    if (r.max_chars && text.length > r.max_chars) {
      note("too_long", `${r.role.replace(/_/g, " ")} is ${text.length - r.max_chars} characters over`, `Shorten "${r.role.replace(/_/g, " ")}" to at most ${r.max_chars} characters.`, 4);
    }
    if (r.values?.length && !r.values.includes(text)) {
      note("missing", `${r.role.replace(/_/g, " ")} is not one of the allowed values`, `Pick "${r.role}" from: ${r.values.join(", ")}.`, 3);
    }
    const lower = text.toLowerCase();
    const hit = RISK_WORDS.find((w) => lower.includes(w));
    if (hit) note("compliance", `"${hit}" trips the risk gate`, `Remove the claim "${hit}" and say it as a personal experience instead.`, 6);
  }
  for (const other of otherHooks) {
    const s = similarity(hook, other);
    if (s >= 0.6) {
      note("too_similar", "Too similar to another deck's hook", `Open with a different idea from: "${other}".`, 5);
      break;
    }
  }
  const final = Math.max(0, Math.min(10, score));
  if (worst) return { ...(worst as GateResult), score: final, flagged: final < 6 || (worst as GateResult).kind !== null };
  return { score: final, flagged: false, kind: null, reason: null, fix: null };
}
