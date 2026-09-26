/** Normalized adapter contracts. Raw provider responses must be validated here;
 * the scorer rubric and compliance patterns must come from the existing workflow. */
export interface GateItem {
  content_id: string;
  type: string;
  text_hook: string;
  caption: string;
  on_screen_text: string;
}
export interface QualityScore { score: number; suggestions: string[] }
export interface RiskVerdict {
  risk_level: "low" | "medium" | "high";
  action: "approve" | "review" | "delete";
  violations: string[];
  llm_reasons: string[];
  suggestions: string[];
}
export interface GateAdapters {
  compliance(item: GateItem): unknown;
  score(item: GateItem, signal: AbortSignal): Promise<unknown>;
  risk(payload: { items: GateItem[] }, signal: AbortSignal): Promise<unknown>;
}
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === "string");
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function quality(value: unknown): value is QualityScore {
  return object(value) && typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 1 && value.score <= 10 && strings(value.suggestions);
}
function risk(value: unknown): value is RiskVerdict {
  return object(value) && typeof value.risk_level === "string" && ["low", "medium", "high"].includes(value.risk_level) &&
    typeof value.action === "string" && ["approve", "review", "delete"].includes(value.action) &&
    strings(value.violations) && strings(value.llm_reasons) && strings(value.suggestions);
}

/** Bound waiting even when a provider ignores abort; late responses cannot change
 * the returned decision. Adapters must forward the signal to their HTTP client. */
async function bounded(call: (signal: AbortSignal) => Promise<unknown>, timeoutMs: number) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      // Keep evidence as it arrived, even if an adapter reuses/mutates its object
      // while the other provider is pending. Non-cloneable output fails closed.
      Promise.resolve().then(() => call(controller.signal)).then(value => structuredClone(value)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Gate timeout")); }, timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

/** Runs on every written version. A passed result concerns copy checks ONLY:
 * music, rendering and final human approval remain separate requirements. No writes. */
export async function evaluateCopy(item: GateItem, adapters: GateAdapters, timeoutMs = 20_000) {
  item = { ...item };
  adapters = { ...adapters };
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new Error("Invalid gate timeout");
  for (const key of ["content_id", "type", "text_hook", "caption", "on_screen_text"] as const) {
    if (typeof item[key] !== "string" || !item[key].trim()) throw new Error(`Missing gate input: ${key}`);
  }
  const reasons: string[] = [], suggestions: string[] = [];
  let complianceHits: string[] | null = null;
  // The deterministic backstop must run regardless of either remote call's outcome.
  try {
    const hits = adapters.compliance({ ...item });
    if (strings(hits)) { complianceHits = [...hits]; reasons.push(...hits.map(hit => `Compliance: ${hit}`)); }
    else reasons.push("Compliance check failed");
  } catch { reasons.push("Compliance check failed"); }
  const [scoreResult, riskResult] = await Promise.allSettled([
    bounded(signal => adapters.score({ ...item }, signal), timeoutMs),
    bounded(signal => adapters.risk({ items: [{ ...item }] }, signal), timeoutMs),
  ]);
  let score: QualityScore | null = null, verdict: RiskVerdict | null = null;
  if (scoreResult.status === "fulfilled" && quality(scoreResult.value)) {
    score = structuredClone(scoreResult.value);
    suggestions.push(...score.suggestions);
    if (score.score < 6) reasons.push(`Score ${score.score}`);
  } else reasons.push("Not scored");
  if (riskResult.status === "fulfilled" && risk(riskResult.value)) {
    verdict = structuredClone(riskResult.value);
    suggestions.push(...verdict.suggestions);
    if (verdict.risk_level === "high" || verdict.action === "delete") {
      reasons.push(...(verdict.violations.length ? verdict.violations : ["Content risk gate rejected copy"]));
    } else if (verdict.action === "review") reasons.push("Content risk gate requires review");
  } else reasons.push("Not gated");
  return {
    state: reasons.length ? "flagged" as const : "copy_checks_passed" as const,
    reasons: [...new Set(reasons)], suggestions: [...new Set(suggestions)],
    complianceHits, score, risk: verdict,
    // No raw provider errors (which can contain secrets) enter stored metadata.
    retryable: complianceHits === null || score === null || verdict === null,
  };
}
