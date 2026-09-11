/**
 * Bell copy — titles, category labels and the one-sentence descriptions.
 *
 * Lives on its own because the same sentence has to be produced in two places:
 * when a run finishes (the post-ban route writes it), and when an older row is
 * read back. Rows written before 2026-09-07 stored a middot-separated fragment
 * list ("phone deleted · no proxy found · 2 content released") rather than a
 * sentence, so the feed re-renders those from their parts instead of showing
 * copy we no longer write.
 */

/** What the cleanup found for one external resource. */
export type StepState = "disabled" | "already-off" | "none";

/** What the Post-Ban workflow reports back. Persisted whole in meta.summary. */
export interface PostBanSummary {
  profile?: string;
  phoneId?: string | null;
  geeErr?: string | null;
  pc?: { found?: boolean; disabled?: boolean; needsManual?: boolean; error?: string | null };
  tv?: { found?: boolean; disabled?: boolean; needsManual?: boolean; error?: string | null };
  supa?: {
    acctPatched?: boolean;
    released?: { source_table: string; released: number }[];
    error?: string | null;
  };
  /** The workflow's own verdict. It emails "[ACTION NEEDED]" on this. */
  manualActionRequired?: boolean;
  /** Plain-English list of what a person still has to do. */
  manualActions?: string[];
}

/**
 * What happened to the cloud phone.
 *
 * Three states, not two. `phoneId` on its own only says a phone was FOUND —
 * the delete's own outcome is `geeErr`, which nothing used to read. So a run
 * that found a phone and then failed to delete it was reported as a deletion,
 * and a run that found nothing was reported the same way as a successful
 * delete. Both directions were wrong.
 */
export type PhoneState = "deleted" | "delete-failed" | "none";

export interface RetireFacts {
  phone: PhoneState;
  proxy: StepState;
  number: StepState;
  released: number;
  /** Steps that errored, already worded as sentence nouns. Empty on legacy rows. */
  failed: string[];
  /** The workflow's own instructions to a human. Empty on legacy rows. */
  manualActions: string[];
  hadError: boolean;
}

/** Which part of the system an item came from. Shown as the grey pill. */
const CATEGORY: Record<string, string> = {
  retire: "Post-Ban",
  warmup_fail: "Warmup",
  proxy_replace: "Proxies",
};

export function categoryLabel(type: string): string {
  return (
    CATEGORY[type] ??
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** "a", "a and b", "a, b and c" — no serial comma, matching the rest of the UI. */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function posts(n: number): string {
  return `${n} post${n === 1 ? "" : "s"}`;
}

export function retireTitle(profile: string, failedOutright = false): string {
  return failedOutright ? `${profile} could not be retired` : `${profile} retired`;
}

/**
 * One sentence, no separators. Leads with the outcome because that is what the
 * bell is scanned for, then the only number with a downstream consequence (what
 * went back into the content pool), then whatever is left for a human to do.
 *
 * The per-resource plumbing (which proxy, which phone) is deliberately dropped:
 * it made the old copy three lines long and it is on the account page anyway.
 */
export function retireBody(f: RetireFacts): string {
  const inventory = f.released > 0 ? `${posts(f.released)} went back to inventory` : "";
  // Nothing was actually switched off — the account had already gone dormant.
  // "none" specifically, not "not deleted": a FAILED delete means there is very
  // much still a phone, which is the opposite of dormant.
  const dormant = f.phone === "none" && f.proxy !== "disabled" && f.number !== "disabled";

  if (f.hadError) {
    const who = f.failed.length > 0 ? joinList(f.failed) : "one step";
    const verb = f.failed.length > 1 ? "need" : "needs";
    return `Cleanup finished but ${who} ${verb} a manual check${inventory ? `, and ${inventory}` : ""}`;
  }
  if (dormant) {
    return inventory
      ? `Everything was already shut down and ${inventory}`
      : "Everything was already shut down and there was no content to release";
  }
  return inventory
    ? `Cleanup finished cleanly and ${inventory}`
    : "Cleanup finished cleanly with no content to release";
}

/**
 * Recover the facts from a pre-2026-09-07 body so old rows can be re-worded.
 * Returns null for anything already written as a sentence.
 *
 * Which step failed was never stored — only the severity was — so `failed`
 * comes back empty and the sentence says "one step" rather than naming it.
 */
export function parseLegacyRetireBody(body: string, severity: string): RetireFacts | null {
  if (!body.includes("·")) return null;
  const parts = body.split("·").map((p) => p.trim());
  const has = (s: string) => parts.includes(s);
  const released = Number(
    /^(\d+) content released$/.exec(parts.find((p) => p.endsWith("content released")) ?? "")?.[1] ?? 0,
  );
  return {
    // Legacy rows never recorded a failed delete, only the two happy states.
    phone: has("phone deleted") ? "deleted" : "none",
    proxy: has("proxy auto-extend off") ? "disabled" : has("proxy already off") ? "already-off" : "none",
    number: has("number renewal off") ? "disabled" : has("number already off") ? "already-off" : "none",
    released,
    failed: [],
    manualActions: [],
    hadError: severity === "warning" || severity === "critical",
  };
}

/** disabled by us / found but already off / not there at all. */
function stepState(r: { found?: boolean; disabled?: boolean } | undefined): StepState {
  return r?.disabled ? "disabled" : r?.found ? "already-off" : "none";
}

/**
 * Everything the sentence builders need, straight from a workflow summary.
 *
 * `manualActionRequired` is the workflow's own verdict and the only reliable
 * one — it is what drives its "[ACTION NEEDED]" email. The dashboard used to
 * infer trouble by looking for the substring "failed" in each error field,
 * which missed the common case: Profile 66 came back with
 * `tv.error = "number not found: …"` and `manualActionRequired = true`, and the
 * bell still reported it as a clean retire while the workflow was emailing
 * "BILLING STILL ON".
 */
export function factsFromSummary(s: PostBanSummary): RetireFacts {
  const failed: string[] = [];
  if (s.pc?.error || s.pc?.needsManual) failed.push("the proxy");
  if (s.tv?.error || s.tv?.needsManual) failed.push("the phone number");
  if (s.supa?.error) failed.push("the content release");
  // geeErr is the cloud phone delete's own outcome. It has been on this type
  // since the beginning and was never read, so a failed delete was invisible
  // in both the bell and the incident feed.
  if (s.geeErr) failed.push("the cloud phone");
  const manualActions = s.manualActions ?? [];
  const phone: PhoneState = s.geeErr ? "delete-failed" : s.phoneId ? "deleted" : "none";
  return {
    phone,
    proxy: stepState(s.pc),
    number: stepState(s.tv),
    released: (s.supa?.released ?? []).reduce((n, r) => n + (r.released ?? 0), 0),
    failed,
    manualActions,
    hadError: Boolean(s.manualActionRequired) || manualActions.length > 0 || failed.length > 0,
  };
}

/**
 * Does this look like a report the workflow actually produced?
 *
 * The webhook can answer 200 with something that is not a summary at all —
 * n8n's own "Workflow was started" acknowledgement is the common one. That used
 * to be wrapped as `{ raw: text }` and fed through factsFromSummary(), where
 * every field was absent, every absent field read as "nothing to do", and the
 * bell announced "Everything was already shut down and there was no content to
 * release" about a cleanup that had not even been reported on yet.
 *
 * A real summary carries at least one of the keys the workflow always sets.
 */
export function isPostBanSummary(v: unknown): v is PostBanSummary {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const keys = ["phoneId", "geeErr", "pc", "tv", "supa", "manualActionRequired", "manualActions"];
  return keys.some((k) => k in (v as Record<string, unknown>));
}

/**
 * Copy for a live run whose outcome we genuinely do not know: the webhook
 * answered with something unreadable, or never answered at all.
 *
 * It deliberately does NOT say "nothing was changed". The request reached n8n,
 * so the workflow may have deleted the phone, cancelled the proxy, released the
 * content, or any prefix of that list. Claiming otherwise sends someone to look
 * in the wrong place.
 */
export function retireUnverifiedBody(reason: string): string {
  return (
    `${reason}, so what the cleanup actually did is unknown. It may have ` +
    `completed, partly completed or not started. Check the account's proxy, ` +
    `number and cloud phone before retrying — a second run is safe only once ` +
    `you know where the first one stopped`
  );
}

/**
 * The long form, for the incident feed.
 *
 * The bell deliberately drops the per-resource plumbing to stay one readable
 * line, but a cleanup that needs a human is exactly when you want to know which
 * resources were touched — so the incident row spells all four out. Same facts,
 * more of them; still one sentence with no separator characters.
 */
export function retireDetail(f: RetireFacts): string {
  const steps = [
    f.phone === "deleted"
      ? "cloud phone deleted"
      : f.phone === "delete-failed"
        ? "cloud phone could NOT be deleted"
        : "cloud phone was already gone",
    f.proxy === "disabled"
      ? "proxy auto renewal turned off"
      : f.proxy === "already-off"
        ? "proxy was already off"
        : "no proxy found",
    f.number === "disabled"
      ? "number renewal turned off"
      : f.number === "already-off"
        ? "number was already off"
        : "no number found",
  ];
  if (f.released > 0) steps.push(`${posts(f.released)} released back to inventory`);

  const base = joinList(steps);
  if (!f.hadError) return base;
  // The workflow spells out what is still billing and how to check it. Those
  // are its words, verbatim — this row exists so nobody has to open n8n.
  if (f.manualActions.length > 0) {
    return `${base}, and still needs a manual check: ${f.manualActions.join(" ")}`;
  }
  // Which step errored was only recorded from 2026-09-07 on; before that the
  // severity was the whole story, hence "one step".
  const who = f.failed.length > 0 ? joinList(f.failed) : "one step";
  return `${base}, but ${who} ${f.failed.length > 1 ? "need" : "needs"} a manual check`;
}
