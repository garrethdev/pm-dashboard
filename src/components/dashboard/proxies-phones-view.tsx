"use client";

import { useState } from "react";
import { ArrowUpRight, Globe, Smartphone } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { StatusPill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import { daysTone, formatEtDate, formatPhone } from "@/lib/data/format";
import type { PhoneNumberRow, PhoneProxyRow } from "@/lib/data/proxies-phones";
import { phoneExtendHref, proxyExtendHref } from "@/lib/provider-links";

/**
 * Proxies & numbers on the Physical side — design ticket P6.
 *
 * The Cloud page lists Geelark profiles, so a real phone's proxy (a line of
 * text on the device) and the numbers on it appeared nowhere, and an
 * expiring proxy on a real phone would go unnoticed. This is the same page
 * with the same two views, but every row is a PHONE.
 *
 * Phone first (P tickets): below `md` each phone is a stacked block rather
 * than a table row scrolled sideways; from `md` it is the Cloud page's table.
 *
 * No Replace proxy here: on Cloud that button writes to Geelark, and a real
 * phone's proxy is changed by hand in ShadowRocket.
 */

type View = "proxies" | "phones";

const TH = "pb-2 font-medium";

/**
 * Extend, drawn exactly as the real one. The placeholder rows carry invented
 * subscription ids, so a real link would open somebody's proxy-cheap panel on
 * a proxy that does not exist; in the design review it goes nowhere.
 */
function Extend({ demo, href }: { demo: boolean; href: string | null }) {
  const cls =
    "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border bg-card-raised px-3 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent md:h-auto md:py-1";
  if (demo || !href) {
    return (
      <button type="button" className={cls}>
        Extend
        <ArrowUpRight className="size-3" />
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      Extend
      <ArrowUpRight className="size-3" />
    </a>
  );
}

function DaysLeft({ days }: { days: number | null }) {
  if (days === null) return <span className="text-text-muted">—</span>;
  return <StatusPill tone={daysTone(days)}>{days} d</StatusPill>;
}

function PhoneName({ row }: { row: PhoneProxyRow }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">{row.name}</span>
      {!row.isActive && <StatusPill tone="gray">Off</StatusPill>}
    </span>
  );
}

/** The accounts on the phone, one per line: they all share its one proxy
 *  (Garreth, 2026-09-23). The platform mark tells an account's Instagram from
 *  its Facebook, which carry the same handle. */
function Accounts({ row }: { row: PhoneProxyRow }) {
  if (row.accounts.length === 0) return <span className="text-text-muted">—</span>;
  return (
    <ul className="flex flex-col gap-1">
      {row.accounts.map((a) => (
        <li key={`${a.platform}-${a.handle}`} className="flex min-w-0 items-center gap-1.5 text-text-muted">
          <PlatformIcon platform={a.platform} />
          <span className="truncate">{a.handle}</span>
        </li>
      ))}
    </ul>
  );
}

function ProxyAddress({ row }: { row: PhoneProxyRow }) {
  return (
    <span className="font-mono text-xs">
      {row.proxyHost ? `${row.proxyHost}:${row.proxyPort}` : "—"}
    </span>
  );
}

function Expiry({ row }: { row: PhoneProxyRow }) {
  if (row.subscription) return <span className="tnum">{formatEtDate(row.subscription.expiresAt)}</span>;
  if (row.proxyHost) return <StatusPill tone="warn">not in proxy-cheap</StatusPill>;
  return <span className="text-text-muted">—</span>;
}

function AutoRenew({ row }: { row: PhoneProxyRow }) {
  if (!row.subscription) return <span className="text-text-muted">—</span>;
  return (
    <StatusPill tone={row.subscription.autoExtend ? "ok" : "warn"}>
      {row.subscription.autoExtend ? "on" : "off"}
    </StatusPill>
  );
}

function RentalPill({ n }: { n: PhoneNumberRow }) {
  if (!n.rental) return <span className="text-xs text-text-muted italic">no rental match</span>;
  if (!n.rental.renewable) return <StatusPill tone="warn">one-shot</StatusPill>;
  if (n.rental.includedForRenewal === false) return <StatusPill tone="danger">not renewing</StatusPill>;
  return <StatusPill tone="ok">renewable</StatusPill>;
}

/** Soonest expiry first; a proxy proxy-cheap does not know sits at the top,
 *  a phone with no proxy yet at the bottom — the Cloud page's order. */
function byExpiry(a: PhoneProxyRow, b: PhoneProxyRow): number {
  const key = (r: PhoneProxyRow) => r.subscription?.daysLeft ?? (r.proxyHost ? -1 : 9999);
  return key(a) - key(b);
}

export function ProxiesPhonesView({
  rows: allRows,
  fetchedAt,
  balances,
  demo,
}: {
  rows: PhoneProxyRow[];
  fetchedAt: string;
  balances?: React.ReactNode;
  demo: boolean;
}) {
  const [view, setView] = useState<View>("proxies");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const phoneQuery = /^[\d\s()+-]{3,}$/.test(query.trim()) ? query.replace(/\D/g, "") : "";

  const rows = allRows
    .filter((r) => {
      if (q === "") return true;
      const base =
        r.name.toLowerCase().includes(q) || r.accounts.some((a) => a.handle.toLowerCase().includes(q));
      if (view === "proxies") return base || (r.proxyHost?.toLowerCase().includes(q) ?? false);
      return (
        base ||
        (phoneQuery !== "" && r.numbers.some((n) => n.number.replace(/\D/g, "").includes(phoneQuery)))
      );
    })
    .sort(byExpiry);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold">Proxies &amp; numbers</h1>
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
          placeholder={view === "proxies" ? "Search phone, account, IP…" : "Search phone, account, number…"}
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
        {rows.length === 0 ? (
          <EmptyState icon={view === "proxies" ? Globe : Smartphone}>
            {query.trim() ? "Nothing matches" : "No phones yet"}
          </EmptyState>
        ) : view === "proxies" ? (
          <ProxiesList rows={rows} demo={demo} />
        ) : (
          <NumbersList rows={rows} demo={demo} />
        )}
      </DashCard>
    </div>
  );
}

function ProxiesList({ rows, demo }: { rows: PhoneProxyRow[]; demo: boolean }) {
  return (
    <>
      {/* Phone width: one block per phone, the countdown beside the date. */}
      <ul className="flex flex-col md:hidden">
        {rows.map((row) => (
          <li key={row.deviceId} className="flex flex-col gap-1.5 border-t border-border py-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <PhoneName row={row} />
              {row.subscription && <Extend demo={demo} href={proxyExtendHref(row)} />}
            </div>
            {row.accounts.length > 0 && (
              <div className="text-xs">
                <Accounts row={row} />
              </div>
            )}
            {row.proxyHost ? <ProxyAddress row={row} /> : <span className="text-sm text-text-muted">No proxy</span>}
            {(row.subscription || row.proxyHost) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                <Expiry row={row} />
                {row.subscription && (
                  <>
                    <DaysLeft days={row.subscription.daysLeft} />
                    <span className="text-xs text-text-muted">Auto-renew</span>
                    <AutoRenew row={row} />
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className={TH}>Phone</th>
              <th className={TH}>Accounts</th>
              <th className={TH}>Proxy</th>
              <th className={TH}>Expiry</th>
              <th className={TH}>Days left</th>
              <th className={TH}>Auto-renew</th>
              <th className={`${TH} text-right`}>
                <span className="sr-only">Extend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.deviceId} className="border-t border-border">
                <td className="py-2.5 whitespace-nowrap">
                  <PhoneName row={row} />
                </td>
                <td className="py-2.5 whitespace-nowrap">
                  <Accounts row={row} />
                </td>
                <td className="py-2.5 whitespace-nowrap">
                  <ProxyAddress row={row} />
                </td>
                <td className="py-2.5 whitespace-nowrap">
                  <Expiry row={row} />
                </td>
                <td className="py-2.5">
                  <DaysLeft days={row.subscription?.daysLeft ?? null} />
                </td>
                <td className="py-2.5">
                  <AutoRenew row={row} />
                </td>
                <td className="py-2.5 text-right">
                  {row.subscription && <Extend demo={demo} href={proxyExtendHref(row)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * One line per account, each with its own number (P14, Garreth 2026-09-23:
 * numbers belong to accounts). An account with no number recorded still gets
 * its line, so a missing number shows as a gap rather than as nothing.
 */
function numberLines(row: PhoneProxyRow): { account: PhoneProxyRow["accounts"][number] | null; n: PhoneNumberRow | null }[] {
  if (row.accounts.length === 0) return [{ account: null, n: null }];
  return row.accounts.map((account) => ({
    account,
    n:
      row.numbers.find(
        (x) => x.account?.handle === account.handle && x.account?.platform === account.platform,
      ) ?? null,
  }));
}

function AccountName({ account }: { account: PhoneProxyRow["accounts"][number] | null }) {
  if (!account) return <span className="text-text-muted">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-text-muted">
      <PlatformIcon platform={account.platform} />
      <span className="truncate">{account.handle}</span>
    </span>
  );
}

function NumbersList({ rows, demo }: { rows: PhoneProxyRow[]; demo: boolean }) {
  return (
    <>
      <ul className="flex flex-col md:hidden">
        {rows.map((row) => (
          <li key={row.deviceId} className="flex flex-col gap-2 border-t border-border py-3 first:border-0 first:pt-0">
            <PhoneName row={row} />
            {row.accounts.length === 0 ? (
              <span className="text-sm text-text-muted">No accounts</span>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {numberLines(row).map(({ account, n }) => (
                  <li
                    key={account ? `${account.platform}-${account.handle}` : "none"}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-xs">
                        <AccountName account={account} />
                      </span>
                      {n ? (
                        <>
                          <span className="tnum text-sm">{formatPhone(n.number)}</span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <RentalPill n={n} />
                            {n.rental?.cycleEndsAt && (
                              <span className="tnum text-xs text-text-muted">{formatEtDate(n.rental.cycleEndsAt)}</span>
                            )}
                            {n.rental && <DaysLeft days={n.rental.daysLeft} />}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-text-muted">No number</span>
                      )}
                    </div>
                    {n?.rental && <Extend demo={demo} href={phoneExtendHref(n)} />}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className={TH}>Phone</th>
              <th className={TH}>Account</th>
              <th className={TH}>Phone number</th>
              <th className={TH}>Rental</th>
              <th className={TH}>Cycle ends</th>
              <th className={TH}>Days left</th>
              <th className={`${TH} text-right`}>
                <span className="sr-only">Extend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) =>
              // A phone's accounts read as one group: its name on the first
              // line only, and the rule above the group rather than every line.
              numberLines(row).map(({ account, n }, i) => (
                <tr
                  key={`${row.deviceId}-${account ? `${account.platform}-${account.handle}` : "none"}`}
                  className={i === 0 ? "border-t border-border" : ""}
                >
                  <td className="py-2.5 whitespace-nowrap">{i === 0 && <PhoneName row={row} />}</td>
                  <td className="py-2.5 whitespace-nowrap">
                    <AccountName account={account} />
                  </td>
                  <td className="tnum py-2.5 whitespace-nowrap">{n ? formatPhone(n.number) : "—"}</td>
                  <td className="py-2.5">{n ? <RentalPill n={n} /> : <span className="text-text-muted">—</span>}</td>
                  <td className="tnum py-2.5 whitespace-nowrap">
                    {n?.rental?.cycleEndsAt ? formatEtDate(n.rental.cycleEndsAt) : "—"}
                  </td>
                  <td className="py-2.5">
                    <DaysLeft days={n?.rental?.daysLeft ?? null} />
                  </td>
                  <td className="py-2.5 text-right">{n?.rental && <Extend demo={demo} href={phoneExtendHref(n)} />}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
