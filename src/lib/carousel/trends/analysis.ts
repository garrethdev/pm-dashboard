import { plainText, type CatalogRecord } from "./presentation";
const record = (v: unknown): CatalogRecord => v && typeof v === "object" && !Array.isArray(v) ? v as CatalogRecord : {};
const list = (v: unknown): string[] => Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && !!s.trim()) : [];
export function codeLabel(value: unknown) {
  const text = plainText(value).trim().replaceAll("_", " ");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}
const slide = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
export interface AnalysisGroup { title: string; rows: { label: string; values: string[] }[] }
/** Explicit display allow-list: never expose model bookkeeping or arbitrary JSON. */
export function analysisGroups(analysis: CatalogRecord | null): AnalysisGroup[] {
  if (!analysis) return [];
  const inferred = record(analysis.inferred), payoff = record(inferred.payoff);
  const pattern = record(inferred.reusable_pattern), audience = record(inferred.audience_response);
  const groups: AnalysisGroup[] = [];
  function group(title: string, entries: [string, unknown][]) {
    const rows = entries.map(([label, value]) => ({ label, values: Array.isArray(value) ? list(value) : plainText(value).trim() ? [plainText(value)] : [] })).filter(row => row.values.length);
    if (rows.length) groups.push({ title, rows });
  }
  const product = slide(inferred.first_product_slide), cta = slide(inferred.first_explicit_cta_slide), payoffSlide = slide(payoff.position);
  group("Summary", [
    ["Topic", codeLabel(analysis.topic)], ["Angle", codeLabel(analysis.angle)], ["Hook", codeLabel(analysis.hook_family)],
    ["Story", codeLabel(inferred.story_structure)], ["Tone", codeLabel(analysis.emotional_tone)], ["Look", codeLabel(analysis.visual_style)],
    ["Product", product ? `First shown on slide ${product}` : ""],
  ]);
  group("How it works", [
    ["Why it hooks", inferred.hook_mechanism], ["Opening", analysis.opener_treatment],
    ["Payoff", plainText(payoff.description) ? `${payoffSlide ? `Slide ${payoffSlide}. ` : ""}${plainText(payoff.description)}` : ""],
    ["Proof", analysis.proof_placement], ["Call to action", plainText(analysis.cta_structure) ? `${codeLabel(analysis.cta_structure)}${cta ? ` · Slide ${cta}` : ""}` : ""],
  ]);
  group("Reusable pattern", [["Keep", pattern.invariants], ["Limits", pattern.limitations]]);
  group("Audience response", [["Themes", list(audience.themes)], ["Questions", list(audience.questions)]]);
  return groups;
}

export function coverageLabel(analysis: CatalogRecord | null) {
  const coverage = record(record(analysis?.observed).coverage);
  const inspected = coverage.inspected_images, supplied = coverage.supplied_images;
  if (!Number.isSafeInteger(inspected) || !Number.isSafeInteger(supplied) || Number(inspected) < 0 || Number(supplied) < 1 || Number(inspected) > Number(supplied)) return null;
  return inspected === supplied ? `All ${supplied} slides read` : `${inspected} of ${supplied} slides read`;
}
