"use client";

import { useState } from "react";
import { DashCard } from "@/components/ui/card";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import { daysTone, formatEtDate, formatPhone } from "@/lib/data/format";
import type { ProxyPhoneRow } from "@/lib/data/proxies";

type View = "proxies" | "phones";

const TH = "sticky top-0 z-10 bg-card pb-2 font-medium";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold">Proxies &amp; Phones</h1>
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
        actions={
          <span className="text-sm text-text-muted">
            {rows.length} of {allRows.length}
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          {!charactersAvailable && (
            <p className="rounded-nested bg-warn/10 px-3 py-2 text-xs text-warn">
              Character column unavailable — Supabase unreachable right now; live-API data unaffected.
            </p>
          )}

          <div className="overflow-x-auto">
            {view === "proxies" ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-muted">
                    <th className={TH}>Profile</th>
                    <th className={TH}>Character</th>
                    <th className={TH}>Proxy</th>
                    <th className={TH}>Expiry</th>
                    <th className={TH}>Days left</th>
                    <th className={TH}>Auto-renew</th>
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
                          <StatusPill tone={daysTone(row.subscription.daysLeft)} dot={false}>
                            {row.subscription.daysLeft} d
                          </StatusPill>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {row.subscription ? (
                          <StatusPill tone={row.subscription.autoExtend ? "ok" : "warn"} dot={false}>
                            {row.subscription.autoExtend ? "on" : "off"}
                          </StatusPill>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-muted">
                    <th className={TH}>Profile</th>
                    <th className={TH}>Character</th>
                    <th className={TH}>Phone number</th>
                    <th className={TH}>Rental</th>
                    <th className={TH}>Cycle ends</th>
                    <th className={TH}>Days left</th>
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
                          <StatusPill tone={daysTone(row.rental.daysLeft)} dot={false}>
                            {row.rental.daysLeft} d
                          </StatusPill>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="border-t border-border pt-3 text-xs text-text-muted">
            {allRows.length} cloud phones · sorted soonest proxy expiry first · Extend/renew actions
            arrive in Phase 2 · TCP liveness probe arrives in Phase 3
          </p>
        </div>
      </DashCard>
    </div>
  );
}
