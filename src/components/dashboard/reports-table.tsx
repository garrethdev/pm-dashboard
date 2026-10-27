"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, NotePencil, SlidersHorizontal, X } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { ReportDialog } from "@/components/shell/report-dialog";
import {
  ISSUE_STATUSES,
  categoryLabel,
  kindLabel,
  statusOf,
  type IssueStatus,
  type ReportKind,
} from "@/lib/data/report-rules";
import type { ReportAccount, ReportRow } from "@/lib/data/reports";
import { etDateTime, formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/**
 * The Reports page (Garreth, 2026-10-09; was Issues until 2026-10-27): every
 * issue and observation sent from the floating button, newest first, with
 * who sent it — the one place the app names a person, by decision, because
 * the fixer needs to know who to ask.
 *
 * Laid out like Accounts (Garreth, 2026-10-09): the page's name and a Filters
 * button above the card, the type and status filters folded inside it. Only
 * an issue has a status, so filtering by one leaves the observations out.
 *
 * Send a report sits at the other end of that row, the way Add account does
 * on Accounts, and opens the same form as the floating button: the page that
 * lists reports had no way to start one (Garreth, Czedrick and Yurie,
 * 2026-10-27).
 *
 * The status on each issue is a pill that opens a small menu (StatusMenu).
 * The change shows at once and is put back, with the reason, if the save
 * fails. An observation shows a dash there.
 */
type KindFilter = "all" | ReportKind;
type StatusFilter = "all" | IssueStatus;

const STATUS_TEXT: Record<string, string> = {
  warn: "text-pill-yellow",
  info: "text-info",
  ok: "text-ok",
};

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "issue", label: "Issues" },
  { value: "observation", label: "Observations" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...ISSUE_STATUSES.map((s) => ({ value: s.value as StatusFilter, label: s.label })),
];

export function ReportsTable({ reports }: { reports: ReportRow[] }) {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  /** Statuses changed on this page, over what the server sent. */
  const [changed, setChanged] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const rows = reports.map((r) => ({ ...r, status: r.status === null ? null : (changed[r.id] ?? r.status) }));
  const shown = rows.filter(
    (r) =>
      (kindFilter === "all" || r.kind === kindFilter) &&
      (statusFilter === "all" || r.status === statusFilter),
  );
  const filtersOn = Number(kindFilter !== "all") + Number(statusFilter !== "all");

  function changeStatus(id: number, from: string, to: string) {
    if (from === to) return;
    setChanged((c) => ({ ...c, [id]: to }));
    setSaving(id);
    setError("");
    fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "The status did not save.");
        }
      })
      .catch((err) => {
        setChanged((c) => ({ ...c, [id]: from }));
        setError(err instanceof Error ? err.message : "Network error");
      })
      .finally(() => setSaving(null));
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="text-xl font-semibold">Reports</h1>
          <Dropdown label="Filters" icon={<SlidersHorizontal className="size-3.5" />} badge={filtersOn}>
            {() => (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">Type</span>
                  <FilterPills value={kindFilter} onChange={setKindFilter} options={KIND_OPTIONS} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">Status</span>
                  <FilterPills value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
                </div>
              </div>
            )}
          </Dropdown>
          <div className="ml-auto">
            <CtaButton
              // The same height, padding and text size as Add account on
              // Accounts, so the two pages' title rows match.
              className="h-[34px] px-3.5! py-0! text-xs!"
              onClick={() => setReporting(true)}
            >
              <NotePencil className="size-3.5" />
              Send a report
            </CtaButton>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Card className="flex flex-col gap-6">
          {shown.length === 0 ? (
            <EmptyState icon={CheckCircle2}>{rows.length === 0 ? "No reports" : "None here"}</EmptyState>
          ) : (
            <>
              {/* A phone gets one card per report: nine columns do not fit
                  375px, and scrolling sideways hid the two that matter most,
                  what happened and its status. */}
              <ul className="flex flex-col sm:hidden">
                {shown.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2.5 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-xs text-text-muted">
                        <span className="font-medium text-text-primary">{kindLabel(row.kind)}</span> ·{" "}
                        {categoryLabel(row.category)} · {etDateTime(row.reportedAt)}
                      </span>
                      {row.status !== null && (
                        <StatusMenu
                          row={{ id: row.id, status: row.status }}
                          saving={saving === row.id}
                          onChange={changeStatus}
                        />
                      )}
                    </div>
                    <p className="text-sm break-words whitespace-pre-line">{row.description}</p>
                    {row.accounts.length > 0 && <AccountList accounts={row.accounts} />}
                    {row.screenshotUrl && <Thumb url={row.screenshotUrl} onOpen={setZoom} />}
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
                      <span className="shrink-0 font-medium text-text-primary">{row.reportedBy}</span>
                      {pageOf(row.pagePath) && (
                        <>
                          <span>·</span>
                          <PageLink path={row.pagePath!} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
                  <thead>
                    <tr className="text-left text-xs text-text-muted">
                      <th className="pb-2 font-medium whitespace-nowrap">Reported</th>
                      <th className="pb-2 font-medium whitespace-nowrap">By</th>
                      {/* Type over category in one column: as two, the table
                          no longer fit a 1280px screen and Status, the one
                          column people press, went off its right edge. */}
                      <th className="pb-2 font-medium whitespace-nowrap">Type</th>
                      <th className="pb-2 font-medium">Details</th>
                      <th className="pb-2 font-medium whitespace-nowrap">Accounts</th>
                      <th className="pb-2 font-medium whitespace-nowrap">Screenshot</th>
                      <th className="pb-2 font-medium whitespace-nowrap">Page</th>
                      {/* As wide as the widest pill, "In progress", so changing a
                          status never shifts the columns beside it. */}
                      <th className="w-28 pb-2 font-medium whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row) => (
                      <tr key={row.id} className="border-t border-border align-top">
                        <td className="py-3 whitespace-nowrap text-text-muted tnum">{etDateTime(row.reportedAt)}</td>
                        <td className="py-3 font-medium whitespace-nowrap">{row.reportedBy}</td>
                        <td className="py-3 whitespace-nowrap">
                          {kindLabel(row.kind)}
                          <span className="block text-xs text-text-muted">{categoryLabel(row.category)}</span>
                        </td>
                        <td className="min-w-56 py-3 break-words whitespace-pre-line">{row.description}</td>
                        <td className="py-3">
                          {row.accounts.length > 0 ? (
                            <AccountList accounts={row.accounts} />
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {row.screenshotUrl ? (
                            <Thumb url={row.screenshotUrl} onOpen={setZoom} />
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="max-w-48 py-3">
                          {pageOf(row.pagePath) ? (
                            <PageLink path={row.pagePath!} />
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {row.status !== null ? (
                            <StatusMenu
                              row={{ id: row.id, status: row.status }}
                              saving={saving === row.id}
                              onChange={changeStatus}
                            />
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
      {reporting && <ReportDialog onClose={() => setReporting(false)} />}
    </>
  );
}

/**
 * The accounts a report names, each linked to its account page, and the post
 * it names, if any, linked to the post itself (Garreth, Czedrick and Yurie, 2026-10-27).
 * The post sits on its own line under the handle: beside it, the column grew wide
 * enough to push Status off a 1280px screen.
 */
function AccountList({ accounts }: { accounts: ReportAccount[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {accounts.map((a) => (
        <li key={a.profile} className="flex flex-col text-xs whitespace-nowrap">
          <span className="flex min-w-0 items-center gap-1.5">
            <PlatformIcon platform={a.platform} />
            <Link
              href={`/accounts/${a.profile.replace(/\D+/g, "")}` as never}
              className="min-w-0 truncate font-medium hover:text-accent"
              title={a.profile}
            >
              {a.label}
            </Link>
          </span>
          {a.postId &&
            (a.postUrl ? (
              <a
                href={a.postUrl}
                target="_blank"
                rel="noreferrer"
                className="pl-5 text-text-muted hover:text-text-primary"
              >
                Post {formatEtDate(a.postedAt)}
              </a>
            ) : (
              <span className="pl-5 text-text-muted">Post {formatEtDate(a.postedAt)}</span>
            ))}
        </li>
      ))}
    </ul>
  );
}

/**
 * The page an issue was reported from, or null when there is none worth
 * showing. "/" is the landing page, which says nothing about where the
 * problem is, so it reads as no page at all (Garreth, 2026-10-09).
 */
function pageOf(path: string | null): string | null {
  return path && path !== "/" ? path : null;
}

/**
 * The status pill, which opens Open / In progress / Fixed.
 *
 * Not a native select: a select is as wide as its longest option, so "Open"
 * sat in a pill sized for "In progress" with a gap on its right (Garreth,
 * 2026-10-09). The menu is FIXED to the window rather than hung off the pill,
 * because the table scrolls sideways and would cut off a menu inside it on the
 * last rows; it opens upward when there is no room below, and closes on
 * scroll so it never drifts away from its pill.
 */
function StatusMenu({
  row,
  saving,
  onChange,
}: {
  row: { id: number; status: string };
  saving: boolean;
  onChange: (id: number, from: string, to: string) => void;
}) {
  const status = statusOf(row.status);
  const [place, setPlace] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [place]);

  function toggle() {
    if (place) {
      setPlace(null);
      return;
    }
    const r = buttonRef.current!.getBoundingClientRect();
    const right = window.innerWidth - r.right;
    // Three options and their padding come to about 120px.
    setPlace(
      r.bottom + 128 > window.innerHeight
        ? { bottom: window.innerHeight - r.top + 6, right }
        : { top: r.bottom + 6, right },
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-haspopup="menu"
        aria-expanded={!!place}
        aria-label={`Status: ${status.label}`}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border border-transparent bg-pill-bg py-0.5 pr-2 pl-2.5 text-xs font-medium whitespace-nowrap outline-none hover:border-border focus-visible:border-accent disabled:opacity-60",
          STATUS_TEXT[status.tone],
        )}
      >
        {status.label}
        <ChevronDown className={cn("size-3 transition-transform", place && "rotate-180")} />
      </button>
      {place && (
        <div
          ref={menuRef}
          role="menu"
          style={place}
          className="fixed z-40 flex w-max flex-col rounded-nested border border-border glass-overlay p-1"
        >
          {ISSUE_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="menuitemradio"
              aria-checked={s.value === status.value}
              onClick={() => {
                setPlace(null);
                onChange(row.id, status.value, s.value);
              }}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-right text-xs font-medium hover:bg-card-raised",
                STATUS_TEXT[s.tone],
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function Thumb({ url, onOpen }: { url: string; onOpen: (url: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      aria-label="Open screenshot"
      className="block w-fit overflow-hidden rounded-md border border-border hover:border-text-muted/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a signed link that expires; nothing to optimise */}
      <img src={url} alt="" className="h-12 w-20 object-cover" />
    </button>
  );
}

function PageLink({ path }: { path: string }) {
  return (
    <a href={path} className="block min-w-0 truncate text-text-muted hover:text-text-primary" title={path}>
      {path}
    </a>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-border glass-overlay text-text-muted hover:text-text-primary"
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- a signed link that expires; nothing to optimise */}
      <img src={src} alt="Screenshot" className="max-h-[90vh] max-w-full rounded-nested object-contain" />
    </div>
  );
}
