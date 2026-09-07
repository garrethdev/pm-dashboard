import { DashCard } from "@/components/ui/card";
import { ProxiesCard, type AttentionItem } from "@/components/dashboard/proxies-card";
import { getProxyPhoneData, type ProxyPhoneData } from "@/lib/data/proxies";
import { daysTone, formatEtShort, formatPhone } from "@/lib/data/format";

const MAX_ROWS = 6;

function proxyAttention(data: ProxyPhoneData): { attention: AttentionItem[]; footer: string } {
  const attention: AttentionItem[] = [];

  for (const row of data.rows) {
    if (row.proxyHost && !row.subscription) {
      attention.push({
        key: row.profile,
        profile: row.profile,
        detail: `${row.proxyHost}:${row.proxyPort} not in proxy-cheap`,
        tone: "warn",
        label: "No sub",
        extendable: false,
      });
    } else if (row.subscription && row.subscription.status !== "ACTIVE") {
      attention.push({
        key: row.profile,
        profile: row.profile,
        detail: `${row.proxyHost}:${row.proxyPort}`,
        tone: "danger",
        label: row.subscription.status.toLowerCase(),
        extendable: true,
      });
    } else if (row.subscription && row.subscription.daysLeft <= 7 && !row.subscription.autoExtend) {
      attention.push({
        key: row.profile,
        profile: row.profile,
        detail: `expires in ${row.subscription.daysLeft} days`,
        tone: daysTone(row.subscription.daysLeft),
        label: `${row.subscription.daysLeft}d left`,
        extendable: true,
      });
    }
  }

  const healthy = data.rows.filter((r) => r.subscription?.status === "ACTIVE");
  const nearest = Math.min(...healthy.map((r) => r.subscription!.daysLeft));
  const orphanNote =
    data.orphanSubscriptions.length > 0
      ? `, ${data.orphanSubscriptions.length} unassigned subscriptions`
      : "";
  return {
    attention: attention.slice(0, MAX_ROWS),
    footer: `${healthy.length} proxies active, nearest expiry in ${nearest} days${orphanNote}`,
  };
}

function phoneAttention(data: ProxyPhoneData): { attention: AttentionItem[]; footer: string } {
  const withRental = data.rows.filter((r) => r.rental);
  const attention: AttentionItem[] = [];

  for (const row of withRental) {
    const rental = row.rental!;
    if (rental.renewable && rental.includedForRenewal === false) {
      attention.push({
        key: row.profile,
        profile: row.profile,
        detail: `${formatPhone(row.phoneNumber)}, not set to renew`,
        tone: "danger",
        label: rental.daysLeft !== null ? `${rental.daysLeft}d left` : "dropping",
        extendable: true,
      });
    } else if (rental.daysLeft !== null && rental.daysLeft <= 7) {
      attention.push({
        key: row.profile,
        profile: row.profile,
        detail: `${formatPhone(row.phoneNumber)}, cycle renews in ${rental.daysLeft}d`,
        tone: daysTone(rental.daysLeft),
        label: `${rental.daysLeft}d`,
        extendable: true,
      });
    } else if (!rental.renewable) {
      attention.push({
        key: row.profile,
        profile: row.profile,
        detail: `${formatPhone(row.phoneNumber)}, non-renewable rental`,
        tone: "warn",
        label: "one-shot",
        extendable: false,
      });
    }
  }

  return {
    attention: attention.slice(0, MAX_ROWS),
    footer: `${withRental.length} numbers linked to phones, ${data.unmatchedRentals.length} rentals unlinked`,
  };
}

/** Server wrapper: fetches live data, reduces it to display props. */
export async function ProxiesCardLive({ className }: { className?: string }) {
  try {
    const data = await getProxyPhoneData();
    const proxies = proxyAttention(data);
    const phones = phoneAttention(data);
    return (
      <ProxiesCard
        fetchedAt={formatEtShort(data.fetchedAt)}
        className={className}
        proxies={proxies}
        phones={phones}
      />
    );
  } catch (err) {
    return (
      <DashCard title="Proxies & phones" viewAllHref="/proxies" className={className}>
        <p className="text-sm text-text-muted">
          Upstream unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
}
