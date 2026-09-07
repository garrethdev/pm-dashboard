import Link from "next/link";
import { ArrowLeft, AlertTriangle, FileSearch } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { getForensicsReport } from "@/lib/data/forensics";
import type { ForensicsFindings, ForensicsReport } from "@/lib/data/forensics";
import { formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/**
 * Post-ban forensics report for one account — the destination of a "Ban" row
 * in the incident feed.
 *
 * Everything here is produced by the [Layer 4] Ban Forensics workflow; this
 * page only renders it. When no report exists the page says so rather than
 * inventing an analysis, because "nobody has investigated this yet" is a
 * genuinely different state from "investigated and found nothing".
 */

/** Route is /accounts/45/forensics — the bare number, matching the detail page. */
function toProfileName(slug: string): string {
  const digits = slug.replace(/\D+/g, "");
  return digits ? `Profile ${digits}` : decodeURIComponent(slug);
}

const CONFIDENCE_TONE: Record<string, "ok" | "warn" | "danger" | "neutral"> = {
  high: "danger",
  medium: "warn",
  low: "neutral",
};

const SEVERITY_TONE: Record<string, "critical" | "danger" | "warn" | "neutral"> = {
  high: "danger",
  medium: "warn",
  low: "neutral",
};

/** A labelled figure. `alert` tints the whole tile, not just the number — the
 *  point of this row is that the one bad reading is findable at a glance. */
function Stat({ label, value, alert }: { label: string; value: React.ReactNode; alert?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-nested border px-3 py-2.5",
        alert ? "border-danger/40 bg-danger/10" : "border-border bg-card-raised/40",
      )}
    >
      <span className="text-xs text-text-muted">{label}</span>
      <span
        className={cn("text-sm font-semibold tnum", alert ? "text-danger" : "text-text-primary")}
      >
        {value}
      </span>
    </div>
  );
}

function Posting({ f }: { f: ForensicsFindings }) {
  const p = f.posting;
  if (!p) return null;
  const violations = p.rule_violations ?? [];
  return (
    <DashCard title="Posting compliance">
      <div className="flex flex-col gap-5">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Posts published" value={p.total_posted ?? "—"} />
          {/* A boolean in the source data, not a count — rendering it raw showed
              an empty cell for every account that behaved correctly. */}
          <Stat
            label="Posted before day 9"
            value={p.posted_before_day_9 === undefined ? "—" : p.posted_before_day_9 ? "Yes" : "No"}
            alert={p.posted_before_day_9 === true}
          />
          <Stat label="Max posts / day" value={p.max_posts_per_day ?? "—"} />
          <Stat label="Active posting days" value={p.active_posting_days ?? "—"} />
          <Stat
            label="Rule violations"
            value={p.rule_violation_count ?? "—"}
            alert={(p.rule_violation_count ?? 0) > 0}
          />
        </div>

        {violations.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* The violations used to sit as one unlabelled line under the
                grid, reading as a stray caption rather than the detail behind
                the red number above it. */}
            <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              {violations.length} violation{violations.length > 1 ? "s" : ""}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {violations.map((v, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-nested border-l-2 border-danger/60 bg-danger/5 py-2 pr-3 pl-3 text-sm"
                >
                  <span className="font-medium tnum text-text-primary">{v.date ?? "—"}</span>
                  <span className="text-text-primary">{v.rule ?? "rule"}</span>
                  {v.detail && <span className="text-text-muted">{v.detail}</span>}
                  {v.account_age_days !== undefined && (
                    <span className="ml-auto text-xs whitespace-nowrap text-text-muted">
                      account day {v.account_age_days}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashCard>
  );
}

function CaptionMatches({ f }: { f: ForensicsFindings }) {
  const rows = f.caption_ban_trigger_matches ?? [];
  if (!rows.length) return null;
  const barTone: Record<string, string> = {
    high: "bg-danger",
    medium: "bg-warn",
    low: "bg-text-muted",
  };
  return (
    <DashCard
      title="Caption ban triggers"
      actions={
        <span className="text-xs whitespace-nowrap text-text-muted">
          {f.text_items_scanned ?? 0} captions scanned
        </span>
      }
    >
      {/* One row per rule rather than a five-column table. The example is the
          widest thing here and the reason the table was unreadable: squeezed
          into a column it truncated mid-word, so it now gets its own line. */}
      <ul className="flex flex-col gap-2">
        {rows.map((m, i) => {
          const pct = m.pct_of_items ?? 0;
          const example = (m.examples ?? [])[0];
          return (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-nested border border-border bg-card-raised/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <StatusPill tone={SEVERITY_TONE[m.severity ?? ""] ?? "neutral"}>
                  {m.severity ?? "—"}
                </StatusPill>
                <span className="font-mono text-xs text-text-primary">{m.rule_key ?? "—"}</span>
                <span className="ml-auto text-xs whitespace-nowrap text-text-muted">
                  <span className="font-semibold tnum text-text-primary">{m.matches ?? 0}</span>{" "}
                  matches, <span className="tnum">{pct}%</span> of captions
                </span>
              </div>
              {/* How much of the account's output tripped this rule — a number
                  like "9%" is hard to weigh against another number; a bar is not. */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "h-full rounded-full",
                    barTone[m.severity ?? ""] ?? "bg-text-muted",
                  )}
                  style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                />
              </div>
              {example && (
                <p className="line-clamp-2 text-xs leading-relaxed text-text-muted italic">
                  &ldquo;{example}&rdquo;
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </DashCard>
  );
}

function Failures({ f }: { f: ForensicsFindings }) {
  const rows = f.geelark_failures ?? [];
  if (!rows.length) return null;
  const total = rows.reduce((a, r) => a + (r.count ?? 0), 0);
  return (
    <DashCard
      title="GeeLark delivery failures"
      actions={<span className="text-xs whitespace-nowrap text-text-muted">{total} in total</span>}
    >
      <table className="w-full text-left text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            <th className="pb-2 font-medium">Code</th>
            <th className="pb-2 font-medium">Meaning</th>
            <th className="w-px pb-2 font-medium">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2.5 font-mono text-xs whitespace-nowrap">{r.fail_code ?? "—"}</td>
              <td className="py-2.5 text-text-muted">{r.meaning ?? r.fail_desc ?? "—"}</td>
              <td className="py-2.5 tnum">{r.count ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashCard>
  );
}

interface TimelineEntry {
  at?: string;
  source?: string;
  verdict?: string;
  detail?: string;
}

interface TimelineRow {
  kind: "change" | "routine";
  from: string;
  to: string;
  label: string;
  detail?: string;
  count: number;
  first: string;
  last: string;
}


/**
 * Turn the raw log into the handful of things that actually happened.
 *
 * The source interleaves two very different records: state CHANGES, which are
 * the story, and routine GeeLark polls, which repeat "ALIVE (Completed)" every
 * few days for weeks. Printed one line each they buried three real events under
 * eleven identical ones. Consecutive routine checks with the same verdict are
 * folded into a single row carrying their count and date range.
 */
function condenseTimeline(rows: TimelineEntry[]): TimelineRow[] {
  const out: TimelineRow[] = [];
  for (const t of rows) {
    const date = String(t.at ?? "").slice(0, 10);
    const routine = (t.source ?? "").includes("geelark_health_log");
    const verdict = (t.verdict ?? "").trim();

    if (routine) {
      const prev = out[out.length - 1];
      if (prev?.kind === "routine" && prev.label === verdict) {
        prev.count += 1;
        prev.last = date;
        continue;
      }
      out.push({
        kind: "routine",
        from: "",
        to: "",
        label: verdict,
        count: 1,
        first: date,
        last: date,
      });
      continue;
    }

    // "(unknown -> healthy (med7d=281 …))" — the transition is the headline and
    // the metrics behind it are the supporting detail. The first state of an
    // account's life is written "(new)", parentheses and all, so those have to
    // be tolerated or the very first row falls back to the bare word
    // "health_change" and says nothing.
    const detail = t.detail ?? "";
    const move = /\(?([a-z_]+)\)?\s*->\s*\(?([a-z_]+)\)?/i.exec(detail);
    // Metrics arrive with empty values before there is anything to measure
    // ("med7d= med28d= zero21=0"); a key with no number is noise, not data.
    const metrics = /\(([^()]*=[^()]*)\)/
      .exec(detail)?.[1]
      ?.split(/\s+/)
      .filter((kv) => /=.+/.test(kv))
      .join(" ");
    out.push({
      kind: "change",
      from: move?.[1] ?? "",
      to: move?.[2] ?? "",
      label: move ? `${move[1]} → ${move[2]}` : verdict || "change",
      detail: metrics || undefined,
      count: 1,
      first: date,
      last: date,
    });
  }
  return out;
}

function Health({ f }: { f: ForensicsFindings }) {
  const h = f.health;
  const perf = f.performance;
  const rows = condenseTimeline(h?.timeline ?? []);
  if (!h && !perf) return null;

  return (
    <DashCard title="Health timeline">
      <div className="flex flex-col gap-5">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Views collapse week"
            value={perf?.collapse_week ?? "none"}
            alert={!!perf?.collapse_week}
          />
          <Stat
            label="Shadowban detected"
            value={h?.shadowban_event_date ?? "—"}
            alert={!!h?.shadowban_event_date}
          />
          <Stat label="Ban recorded" value={h?.ban_event_date ?? "—"} alert={!!h?.ban_event_date} />
          {/* GeeLark reporting ALIVE through a ban is the known blind spot. */}
          <Stat
            label="GeeLark blind spot"
            value={h?.geelark_blind_spot === undefined ? "—" : h.geelark_blind_spot ? "Yes" : "No"}
            alert={h?.geelark_blind_spot === true}
          />
        </div>

        {rows.length > 0 && (
          <ol className="flex flex-col">
            {rows.map((r, i) => (
              <li key={i} className="flex gap-3">
                {/* Rail: a line joining the rows, so the eye follows the
                    sequence instead of re-reading dates. */}
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 w-px flex-1 bg-border" />
                </div>

                <div
                  className={cn(
                    "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
                    i < rows.length - 1 && "pb-3",
                  )}
                >
                  <span className="text-xs tnum text-text-muted">
                    {r.first}
                    {r.count > 1 && r.last !== r.first ? ` – ${r.last}` : ""}
                  </span>
                  {r.kind === "change" ? (
                    <>
                      <span className="text-sm font-medium text-text-primary">{r.label}</span>
                      {r.detail && (
                        <span className="font-mono text-[11px] text-text-muted">{r.detail}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-text-muted">
                      {r.count > 1 ? `${r.count} routine checks` : "routine check"}, {r.label}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </DashCard>
  );
}

export default async function ForensicsPage({ params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params;
  const name = toProfileName(profile);
  const num = profile.replace(/\D+/g, "") || profile;

  let latest: ForensicsReport | null = null;
  let earlier: string[] = [];
  let loadError: string | null = null;
  try {
    // cachedFetcher wraps the payload as { data, fetchedAt }.
    const { data } = await getForensicsReport(name);
    latest = data.latest;
    earlier = data.earlier;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "unknown error";
  }

  const back = (
    <Link
      href={`/accounts/${num}` as never}
      className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-4" /> {name}
    </Link>
  );

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <DashCard title={`Ban forensics: ${name}`}>
          <p className="text-sm text-text-muted">Supabase unreachable: {loadError}</p>
        </DashCard>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <DashCard title={`Ban forensics: ${name}`}>
          <div className="flex items-start gap-3 py-2">
            <FileSearch className="mt-0.5 size-5 shrink-0 text-text-muted" />
            <div className="flex flex-col gap-1">
              <p className="text-sm">No forensics report for this account yet.</p>
              <p className="text-sm text-text-muted">
                Reports are produced by the{" "}
                <span className="font-mono text-xs">[Layer 4] Ban Forensics</span> workflow in n8n.
                Run it for <span className="font-medium text-text-primary">{name}</span> and the
                report will appear here. The workflow saves every investigation.
              </p>
            </div>
          </div>
        </DashCard>
      </div>
    );
  }

  const f = latest.findings;

  return (
    <div className="flex flex-col gap-6">
      {back}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-semibold">Ban forensics: {name}</h1>
        {latest.confidence && (
          <StatusPill tone={CONFIDENCE_TONE[latest.confidence] ?? "neutral"}>
            {latest.confidence} confidence
          </StatusPill>
        )}
        <span className="text-xs text-text-muted">
          investigated {formatEtDate(latest.investigatedAt)}
          {earlier.length > 0 &&
            `, ${earlier.length} earlier investigation${earlier.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {latest.sourceErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-card border border-warn/40 bg-warn/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <p className="text-sm text-text-muted">
            Built on partial data. {latest.sourceErrors.length} source
            {latest.sourceErrors.length > 1 ? "s" : ""} failed during the run:{" "}
            <span className="text-text-primary">{latest.sourceErrors.slice(0, 4).join("; ")}</span>
          </p>
        </div>
      )}

      {/* What the run was looking at, before what it concluded. It used to sit
          in an "Investigation context" card below the recommendations, which is
          after the reader has already had to make sense of the verdict without
          it (Garreth 2026-09-07). */}
      {latest.overview && (
        <DashCard title="Overview">
          <p className="text-sm leading-relaxed text-text-muted">{latest.overview}</p>
        </DashCard>
      )}

      {latest.noRecords ? (
        <DashCard title="No records found">
          <p className="text-sm text-text-muted">
            {f?.note ??
              "No rows in accounts, unified_posts, the task ledger, health logs, account events or any content table. That is itself a finding, likely never provisioned, or the profile label does not match."}
          </p>
        </DashCard>
      ) : (
        <>
          <DashCard title="Verdict">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Likely cause
                </h3>
                <p className="text-sm leading-relaxed">
                  {latest.likelyCause ?? "The model did not return a cause for this profile."}
                </p>
              </div>
              {latest.evidence && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Evidence
                  </h3>
                  <p className="text-sm leading-relaxed text-text-muted">{latest.evidence}</p>
                </div>
              )}
            </div>
          </DashCard>

          {/* Four separate cards, not four unlabelled bands inside one
              "Signals" card. They answer different questions — did it break the
              posting rules, did the captions trip a filter, did delivery fail,
              and what did its health do over time — and stacking them under one
              heading left the reader to work out where each began. */}
          {f && (
            <>
              <Posting f={f} />
              <CaptionMatches f={f} />
              <Failures f={f} />
              <Health f={f} />
            </>
          )}
        </>
      )}

      {latest.recommendations.length > 0 && (
        <DashCard title="Recommendations">
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {latest.recommendations.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {r}
              </li>
            ))}
          </ol>
        </DashCard>
      )}
    </div>
  );
}
