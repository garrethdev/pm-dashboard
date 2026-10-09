"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, SlidersHorizontal, X } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { ISSUE_STATUSES, categoryLabel, statusOf, type IssueStatus } from "@/lib/data/issue-rules";
import type { IssueRow } from "@/lib/data/issues";
import { etDateTime } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/**
 * The Issues page (Garreth, 2026-10-09): every report sent from the floating
 * button, newest first, with who sent it — the one place the app names a
 * person, by decision, because the fixer needs to know who to ask.
 *
 * Laid out like Accounts (Garreth, 2026-10-09): the page's name and a Filters
 * button above the card, the status filter folded inside that button.
 *
 * The status on each row is a pill that opens a small menu (StatusMenu). The
 * change shows at once and is put back, with the reason, if the save fails.
 */
type Filter = "all" | IssueStatus;

const STATUS_TEXT: Record<string, string> = {
  warn: "text-pill-yellow",
  info: "text-info",
  ok: "text-ok",
};

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ISSUE_STATUSES.map((s) => ({ value: s.value as Filter, label: s.label })),
];

export function IssuesTable({ issues }: { issues: IssueRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  /** Statuses changed on this page, over what the server sent. */
  const [changed, setChanged] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  const rows = issues.map((r) => ({ ...r, status: changed[r.id] ?? r.status }));
  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  function changeStatus(id: number, from: string, to: string) {
    if (from === to) return;
    setChanged((c) => ({ ...c, [id]: to }));
    setSaving(id);
    setError("");
    fetch(`/api/issues/${id}`, {
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
          <h1 className="text-xl font-semibold">Issues</h1>
          <Dropdown
            label="Filters"
            icon={<SlidersHorizontal className="size-3.5" />}
            badge={filter === "all" ? 0 : 1}
          >
            {() => (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">Status</span>
                <FilterPills value={filter} onChange={setFilter} options={FILTER_OPTIONS} />
              </div>
            )}
          </Dropdown>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Card className="flex flex-col gap-6">
          {shown.length === 0 ? (
            <EmptyState icon={CheckCircle2}>{rows.length === 0 ? "No issues reported" : "None here"}</EmptyState>
          ) : (
            <>
              {/* A phone gets one card per issue: seven columns do not fit
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
                        {categoryLabel(row.category)} · {etDateTime(row.reportedAt)}
                      </span>
                      <StatusMenu row={row} saving={saving === row.id} onChange={changeStatus} />
                    </div>
                    <p className="text-sm break-words whitespace-pre-line">{row.description}</p>
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
                      <th className="pb-2 font-medium whitespace-nowrap">Category</th>
                      <th className="pb-2 font-medium">What happened</th>
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
                        <td className="py-3 whitespace-nowrap text-text-muted">{categoryLabel(row.category)}</td>
                        <td className="min-w-64 py-3 break-words whitespace-pre-line">{row.description}</td>
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
                          <StatusMenu row={row} saving={saving === row.id} onChange={changeStatus} />
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
    </>
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
  row: IssueRow;
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
