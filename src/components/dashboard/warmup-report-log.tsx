"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { Copy, Download, Loader2, Robot, X } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { formatEtDate, formatEtShort } from "@/lib/data/format";
import {
  claudeText,
  countsLine,
  diaryFileName,
  diaryLines,
  outcomeLabel,
  type DiaryLevel,
} from "@/lib/data/warmup-report-format";
import type { WarmupReport, WarmupReportDiary } from "@/lib/data/warmup-reports";
import { cn } from "@/lib/utils";

/**
 * The warmup robot's log for one account (Garreth, 2026-10-09): one row per
 * warmup it ran on the phone, the way Geelark's task history reads, and the
 * diary of any row on a click.
 *
 * The list carries only the summary. The diary is fetched when a row is
 * opened, because it can be a megabyte and most rows are never opened.
 */
export function WarmupReportLog({ reports }: { reports: WarmupReport[] }) {
  const [open, setOpen] = useState<WarmupReport | null>(null);
  const stopped = reports.filter((r) => r.outcome === "stopped").length;

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="shrink-0 text-base font-semibold">Warmup robot log</h2>
        <span className="text-xs text-text-muted">
          {reports.length} warmup{reports.length === 1 ? "" : "s"}
          {stopped > 0 ? `, ${stopped} stopped` : ""}. Click one to read its diary.
        </span>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-text-muted">The robot has not reported a warmup for this account yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm [&_td]:pr-8 [&_th]:pr-8 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="pb-2 font-medium whitespace-nowrap">When (ET)</th>
                <th className="pb-2 font-medium whitespace-nowrap">Warmup</th>
                <th className="pb-2 font-medium whitespace-nowrap">Status</th>
                <th className="pb-2 font-medium whitespace-nowrap">Minutes</th>
                <th className="w-full pb-2 font-medium whitespace-nowrap">Detail</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open the diary of warmup ${r.sessionNo} on ${formatEtDate(r.startedAt)}`}
                  onClick={() => setOpen(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen(r);
                    }
                  }}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-card-raised focus-visible:bg-card-raised focus-visible:outline-none"
                >
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="tnum">{formatEtDate(r.startedAt)}</span>
                    <span className="tnum ml-2 text-xs text-text-muted">{formatEtShort(r.startedAt)}</span>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="rounded-full border border-border bg-card-raised px-2 py-0.5 text-xs">
                      Warmup {r.sessionNo}
                    </span>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <StatusPill tone={r.outcome === "finished" ? "ok" : "danger"}>{outcomeLabel(r)}</StatusPill>
                  </td>
                  <td className="tnum py-2.5 whitespace-nowrap">{r.minutes} min</td>
                  {/* Only this column scrolls, as in the Geelark log. */}
                  <td className="w-full max-w-0 py-2.5 text-xs text-text-muted">
                    <div className="overflow-x-auto whitespace-nowrap">
                      {r.outcome === "stopped" && r.note && (
                        <span className="mr-2 font-medium text-danger">{r.note}</span>
                      )}
                      {countsLine(r.counts)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <WarmupDiarySheet report={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

const LEVEL_CLASS: Record<DiaryLevel, string> = {
  debug: "text-text-muted",
  info: "text-text-muted",
  WARNING: "text-pill-yellow",
  PROBLEM: "text-pill-red",
};

type Loaded =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; diary: WarmupReportDiary };

/** One warmup's diary: its lines, the stop screenshot, and the two buttons. */
function WarmupDiarySheet({ report, onClose }: { report: WarmupReport; onClose: () => void }) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/warmup-reports/${report.id}`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as
          | { report?: WarmupReportDiary; error?: string }
          | null;
        if (!live) return;
        if (!res.ok || !body?.report) {
          setLoaded({ state: "error", message: body?.error ?? `The diary could not be read (HTTP ${res.status}).` });
        } else {
          setLoaded({ state: "ready", diary: body.report });
        }
      } catch {
        if (live) setLoaded({ state: "error", message: "Couldn't reach the server." });
      }
    })();
    return () => {
      live = false;
    };
  }, [report.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const diary = loaded.state === "ready" ? loaded.diary : null;
  const lines = useMemo(() => (diary?.log ? diaryLines(diary.log) : []), [diary]);

  async function copy() {
    if (!diary) return;
    try {
      await navigator.clipboard.writeText(claudeText(diary));
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2500);
  }

  function download() {
    if (!diary) return;
    const url = URL.createObjectURL(new Blob([claudeText(diary)], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = diaryFileName(diary);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Warmup diary"
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col rounded-t-card border border-border glass-overlay sm:max-h-[85vh] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Robot className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 truncate text-base font-semibold">
                Warmup {report.sessionNo} diary
                <StatusPill tone={report.outcome === "finished" ? "ok" : "danger"}>
                  {outcomeLabel(report)}
                </StatusPill>
              </h2>
              <p className="tnum truncate text-xs text-text-muted">
                {formatEtDate(report.startedAt)} {formatEtShort(report.startedAt)} to{" "}
                {formatEtShort(report.endedAt)} ET · {report.minutes} min
                {report.note ? ` · ${report.note}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center text-text-muted hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <p className="text-xs text-text-muted">{countsLine(report.counts)}</p>

          {loaded.state === "loading" && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="size-4 animate-spin" /> Reading the diary…
            </p>
          )}
          {loaded.state === "error" && (
            <p role="alert" className="rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">
              {loaded.message}
            </p>
          )}

          {diary && diary.clearedAt && (
            <p className="rounded-nested border border-border px-3 py-2 text-sm text-text-muted">
              This diary and its screenshot were cleared on {formatEtDate(diary.clearedAt)}: they are kept for 30
              days. The summary above stays.
            </p>
          )}
          {diary && !diary.clearedAt && !diary.log && (
            <p className="text-sm text-text-muted">No diary was sent with this warmup.</p>
          )}

          {diary?.hasScreenshot && (
            <figure className="flex flex-col gap-1.5">
              <figcaption className="text-xs text-text-muted">The screen when it stopped</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element -- a private image behind the sign-in, not an optimisable asset */}
              <img
                src={`/api/warmup-reports/${report.id}/screenshot`}
                alt="The phone's screen when the warmup stopped"
                className="max-h-[60vh] w-auto self-start rounded-nested border border-border"
              />
            </figure>
          )}

          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-nested border border-border bg-card-raised p-3">
              <ol className="font-mono text-xs leading-5">
                {lines.map((l, i) => (
                  <li key={i} className="whitespace-pre">
                    <span className="tnum text-text-muted">{l.time ? `${l.time} ET` : "           "}</span>
                    {"  "}
                    <span className={cn("inline-block w-[7ch]", LEVEL_CLASS[l.level])}>{l.level}</span>
                    {"  "}
                    <span className={l.level === "PROBLEM" ? "text-pill-red" : "text-text-primary"}>{l.msg}</span>
                    {l.extra && <span className="text-text-muted">{`  ${l.extra}`}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          {copied !== "idle" && (
            <span className={cn("mr-auto text-xs", copied === "copied" ? "text-ok" : "text-danger")}>
              {copied === "copied" ? "Copied. Paste it into a chat with Claude." : "Couldn't copy. Use Download instead."}
            </span>
          )}
          <button
            onClick={download}
            disabled={!diary}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            <Download className="size-4" /> Download
          </button>
          <CtaButton onClick={() => void copy()} disabled={!diary}>
            <span className="inline-flex items-center gap-1.5">
              <Copy className="size-4" /> Copy for Claude
            </span>
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
