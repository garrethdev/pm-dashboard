"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { ExtendButton } from "@/components/ui/extend-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import { cycleSort, type SortDir } from "@/components/ui/sort-button";
import { daysTone, formatEtDate, formatPhone } from "@/lib/data/format";
import type { ProxyPhoneRow } from "@/lib/data/proxies";
import { phoneExtendHref, proxyExtendHref } from "@/lib/provider-links";
import { cn } from "@/lib/utils";

type View = "proxies" | "phones";

const TH = "sticky top-0 z-10 bg-card pb-2 font-medium";

/** Trailing action cell. Empty when the row has nothing to extend. */
function ExtendCell({ href }: { href: string | null }) {
  return (
    <td className="py-2.5 text-right">{href && <ExtendButton href={href} />}</td>
  );
}

/** Proxies & phones detail — header search + pill switcher between two tables. */
export function ProxiesTable({
  rows: allRows,
  fetchedAt,
  charactersAvailable,
  balances,
}: {
  rows: ProxyPhoneRow[];
  fetchedAt: string;
  charactersAvailable: boolean;
  /** Rendered under the page header — a server component passed in as a slot. */
  balances?: React.ReactNode;
}) {
  const [view, setView] = useState<View>("proxies");
  const [query, setQuery] = useState("");
  // One sortable column, but keyed anyway: both tables have a "Days left" and
  // the sort deliberately survives a switch between them, re-reading whichever
  // countdown the visible table is showing.
  const [sort, setSort] = useState<{ key: "daysLeft"; dir: SortDir } | null>(null);
  const q = query.trim().toLowerCase();
  // Match phone digits only when the query is phone-like, so text like "char 3"
  // doesn't match every number containing a 3.
  const phoneQuery = /^[\d\s()+-]{3,}$/.test(query.trim()) ? query.replace(/\D/g, "") : "";

  const rows = allRows.filter((r) => {
    if (q === "") return true;
    const base =
      r.profile.toLowerCase().includes(q) || (r.character?.toLowerCase().includes(q) ?? false);
    if (view === "proxies") {
      return base || (r.proxyHost?.toLowerCase().includes(q) ?? false);
    }
    return (
      base ||
      (phoneQuery !== "" && (r.phoneNumber ?? "").replace(/\D/g, "").includes(phoneQuery))
    );
  });

  /** Whichever countdown the visible table is showing. */
  const daysLeftOf = (r: ProxyPhoneRow) =>
    view === "proxies" ? (r.subscription?.daysLeft ?? null) : (r.rental?.daysLeft ?? null);

  if (sort) {
    const dir = sort.dir === "desc" ? -1 : 1;
    // Rows with no subscription or no matched rental have no countdown at all;
    // they sink to the bottom either way rather than pretending to be zero.
    rows.sort((a, b) => {
      const av = daysLeftOf(a);
      const bv = daysLeftOf(b);
      if (av === null || bv === null) return av === bv ? 0 : av === null ? 1 : -1;
      return (av - bv) * dir;
    });
  }

  /** Sortable column header, matching the Accounts table's. */
  const daysLeftHeader = () => {
    const active = sort !== null;
    const Icon = active ? (sort.dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
    return (
      <th className={TH}>
        <button
          type="button"
          onClick={() => setSort((s) => cycleSort(s, "daysLeft", "asc"))}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-text-primary",
            active && "text-accent",
          )}
        >
          Days left
          <Icon className={cn("size-3", !active && "opacity-50")} />
        </button>
      </th>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold">Proxies &amp; phones</h1>
          {/* The view selector belongs to the page, not the card — the card
              keeps its own smaller title naming whichever view is active. */}
          <FilterPills
            value={view}
            onChange={setView}
            options={[
              { value: "proxies", label: "Proxies" },
              { value: "phones", label: "Phone numbers" },
            ]}
          />
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={
            view === "proxies" ? "Search profile, character, IP…" : "Search profile, character, number…"
          }
          className="w-full max-w-sm"
        />
      </div>

      {balances}

      <DashCard
        title={view === "proxies" ? "Proxies" : "Phone numbers"}
        fetchedAt={fetchedAt}
        headerAction={
          <span className="text-sm text-text-muted">
            {rows.length} of {allRows.length}
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          {!charactersAvailable && (
            <p className="rounded-nested bg-warn/10 px-3 py-2 text-xs text-warn">
              Character column unavailable. Supabase is unreachable; live-API data is unaffected.
            </p>
          )}

          <div className="overflow-x-auto">
            {view === "proxies" ? (
              <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
                <thead>
                  <tr className="text-left text-xs text-text-muted">
                    <th className={TH}>Profile</th>
                    <th className={TH}>Character</th>
                    <th className={TH}>Proxy</th>
                    <th className={TH}>Expiry</th>
                    {daysLeftHeader()}
                    <th className={TH}>Auto-renew</th>
                    <th className={`${TH} text-right`}>
                      <span className="sr-only">Extend</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.profile} className="border-t border-border">
                      <td className="py-2.5 font-medium whitespace-nowrap">{row.profile}</td>
                      <td className="py-2.5 text-text-muted whitespace-nowrap">
                        {row.character ?? "—"}
                      </td>
                      <td className="py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.proxyHost ? `${row.proxyHost}:${row.proxyPort}` : "—"}
                      </td>
                      <td className="py-2.5 whitespace-nowrap tnum">
                        {row.subscription ? (
                          formatEtDate(row.subscription.expiresAt)
                        ) : row.proxyHost ? (
                          <StatusPill tone="warn">not in proxy-cheap</StatusPill>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5">
                        {row.subscription ? (
                          <StatusPill tone={daysTone(row.subscription.daysLeft)}>
                            {row.subscription.daysLeft} d
                          </StatusPill>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {row.subscription ? (
                          <StatusPill tone={row.subscription.autoExtend ? "ok" : "warn"}>
                            {row.subscription.autoExtend ? "on" : "off"}
                          </StatusPill>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <ExtendCell href={proxyExtendHref(row)} />
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
                <thead>
                  <tr className="text-left text-xs text-text-muted">
                    <th className={TH}>Profile</th>
                    <th className={TH}>Character</th>
                    <th className={TH}>Phone number</th>
                    <th className={TH}>Rental</th>
                    <th className={TH}>Cycle ends</th>
                    {daysLeftHeader()}
                    <th className={`${TH} text-right`}>
                      <span className="sr-only">Extend</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.profile} className="border-t border-border">
                      <td className="py-2.5 font-medium whitespace-nowrap">{row.profile}</td>
                      <td className="py-2.5 text-text-muted whitespace-nowrap">
                        {row.character ?? "—"}
                      </td>
                      <td className="py-2.5 whitespace-nowrap tnum">{formatPhone(row.phoneNumber)}</td>
                      <td className="py-2.5">
                        {row.rental ? (
                          row.rental.renewable ? (
                            row.rental.includedForRenewal === false ? (
                              <StatusPill tone="danger">not renewing</StatusPill>
                            ) : (
                              <StatusPill tone="ok">renewable</StatusPill>
                            )
                          ) : (
                            <StatusPill tone="warn">one-shot</StatusPill>
                          )
                        ) : (
                          <span className="text-xs text-text-muted italic">no rental match</span>
                        )}
                      </td>
                      <td className="py-2.5 whitespace-nowrap tnum">
                        {row.rental?.cycleEndsAt ? formatEtDate(row.rental.cycleEndsAt) : "—"}
                      </td>
                      <td className="py-2.5">
                        {row.rental?.daysLeft != null ? (
                          <StatusPill tone={daysTone(row.rental.daysLeft)}>
                            {row.rental.daysLeft} d
                          </StatusPill>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <ExtendCell href={phoneExtendHref(row)} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DashCard>
    </div>
  );
}
