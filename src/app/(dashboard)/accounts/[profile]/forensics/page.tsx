import Link from "next/link";
import { ArrowLeft, AlertTriangle, FileSearch } from "lucide-react";
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: React.ReactNode; alert?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-nested bg-card-raised/40 px-3 py-2">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn("text-sm font-semibold tnum", alert && "text-danger")}>{value}</span>
    </div>
  );
}

function Posting({ f }: { f: ForensicsFindings }) {
  const p = f.posting;
  if (!p) return null;
  const violations = p.rule_violations ?? [];
  return (
    <Section title="Posting compliance">
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
        <ul className="mt-1 flex flex-col gap-1">
          {violations.map((v, i) => (
            <li key={i} className="text-sm text-text-muted">
              <span className="tnum text-text-primary">{v.date ?? "—"}</span> — {v.rule ?? "rule"}
              {v.detail ? ` (${v.detail})` : ""}
              {v.account_age_days !== undefined ? ` · day ${v.account_age_days}` : ""}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Health({ f }: { f: ForensicsFindings }) {
  const h = f.health;
  const perf = f.performance;
  const timeline = h?.timeline ?? [];
  if (!h && !perf) return null;
  return (
    <Section title="Health timeline">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Views collapse week" value={perf?.collapse_week ?? "none"} alert={!!perf?.collapse_week} />
        <Stat label="Shadowban detected" value={h?.shadowban_event_date ?? "—"} alert={!!h?.shadowban_event_date} />
        <Stat label="Ban recorded" value={h?.ban_event_date ?? "—"} alert={!!h?.ban_event_date} />
        {/* GeeLark reporting ALIVE through a ban is the known blind spot. */}
        <Stat
          label="GeeLark blind spot"
          value={h?.geelark_blind_spot === undefined ? "—" : h.geelark_blind_spot ? "Yes" : "No"}
          alert={h?.geelark_blind_spot === true}
        />
      </div>
      {timeline.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {timeline.map((t, i) => (
            <li key={i} className="font-mono text-xs text-text-muted">
              {String(t.at ?? "").slice(0, 10)} {t.source ?? ""}: {t.verdict ?? ""}
              {t.detail && t.detail !== "N/A" ? ` (${t.detail})` : ""}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function CaptionMatches({ f }: { f: ForensicsFindings }) {
  const rows = f.caption_ban_trigger_matches ?? [];
  if (!rows.length) return null;
  return (
    <Section title={`Caption ban-trigger matches — ${f.text_items_scanned ?? 0} items scanned`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium">Rule</th>
              <th className="pb-2 font-medium">Severity</th>
              <th className="pb-2 text-right font-medium">Matches</th>
              <th className="pb-2 text-right font-medium">% of items</th>
              <th className="pb-2 pl-6 font-medium">Example</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2.5 font-mono text-xs whitespace-nowrap">{m.rule_key ?? "—"}</td>
                <td className="py-2.5">
                  <StatusPill tone={SEVERITY_TONE[m.severity ?? ""] ?? "neutral"} dot={false}>
                    {m.severity ?? "—"}
                  </StatusPill>
                </td>
                <td className="py-2.5 text-right tnum">{m.matches ?? 0}</td>
                <td className="py-2.5 text-right tnum">
                  {m.pct_of_items === undefined ? "—" : `${m.pct_of_items}%`}
                </td>
                <td className="py-2.5 pl-6 text-text-muted">{(m.examples ?? [])[0] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Failures({ f }: { f: ForensicsFindings }) {
  const rows = f.geelark_failures ?? [];
  if (!rows.length) return null;
  return (
    <Section title="GeeLark delivery failures">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">Meaning</th>
              <th className="pb-2 text-right font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2.5 font-mono text-xs whitespace-nowrap">{r.fail_code ?? "—"}</td>
                <td className="py-2.5 text-text-muted">{r.meaning ?? r.fail_desc ?? "—"}</td>
                <td className="py-2.5 text-right tnum">{r.count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default async function ForensicsPage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
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
        <DashCard title={`Ban forensics — ${name}`}>
          <p className="text-sm text-text-muted">Supabase unreachable — {loadError}</p>
        </DashCard>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <DashCard title={`Ban forensics — ${name}`}>
          <div className="flex items-start gap-3 py-2">
            <FileSearch className="mt-0.5 size-5 shrink-0 text-text-muted" />
            <div className="flex flex-col gap-1">
              <p className="text-sm">No forensics report for this account yet.</p>
              <p className="text-sm text-text-muted">
                Reports are produced by the{" "}
                <span className="font-mono text-xs">[Layer 4] Ban Forensics</span> workflow in n8n.
                Run it for <span className="font-medium text-text-primary">{name}</span> and the
                report will appear here — the workflow now saves every investigation.
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
        <h1 className="text-xl font-semibold">Ban forensics — {name}</h1>
        {latest.confidence && (
          <StatusPill tone={CONFIDENCE_TONE[latest.confidence] ?? "neutral"} dot={false}>
            {latest.confidence} confidence
          </StatusPill>
        )}
        <span className="text-xs text-text-muted">
          investigated {formatEtDate(latest.investigatedAt)}
          {earlier.length > 0 && ` · ${earlier.length} earlier investigation${earlier.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {latest.sourceErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-card border border-warn/40 bg-warn/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <p className="text-sm text-text-muted">
            Built on partial data — {latest.sourceErrors.length} source
            {latest.sourceErrors.length > 1 ? "s" : ""} failed during the run:{" "}
            <span className="text-text-primary">{latest.sourceErrors.slice(0, 4).join("; ")}</span>
          </p>
        </div>
      )}

      {latest.noRecords ? (
        <DashCard title="No records found">
          <p className="text-sm text-text-muted">
            {f?.note ??
              "No rows in accounts, unified_posts, the task ledger, health logs, account events or any content table. That is itself a finding — likely never provisioned, or the profile label does not match."}
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

          {f && (
            <DashCard title="Signals">
              <div className="flex flex-col gap-6">
                <Posting f={f} />
                <CaptionMatches f={f} />
                <Failures f={f} />
                <Health f={f} />
              </div>
            </DashCard>
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

      {(latest.overview || latest.commonalities) && (
        <DashCard title="Investigation context">
          <div className="flex flex-col gap-4">
            {latest.overview && (
              <div>
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Overview
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">{latest.overview}</p>
              </div>
            )}
            {latest.commonalities && (
              <div>
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Shared with the other accounts in this run
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">{latest.commonalities}</p>
              </div>
            )}
          </div>
        </DashCard>
      )}

      <p className="text-xs text-text-muted">
        Produced by the [Layer 4] Ban Forensics workflow
        {latest.executionId ? ` · execution ${latest.executionId}` : ""}. Read-only.
      </p>
    </div>
  );
}
