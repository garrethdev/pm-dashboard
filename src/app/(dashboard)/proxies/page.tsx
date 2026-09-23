import { getPhysicalProfiles, limitProxyData } from "@/lib/data/fleet-accounts";
import { getFleet } from "@/lib/fleet-server";
import { Suspense } from "react";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { ProxiesTable } from "@/components/dashboard/proxies-table";
import { ProviderBalanceCards } from "@/components/dashboard/provider-balance-cards";
import { getProxyPhoneData } from "@/lib/data/proxies";
import { formatEtShort } from "@/lib/data/format";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { ProxiesPhonesView } from "@/components/dashboard/proxies-phones-view";
import { proxiesPhonePlaceholder } from "@/lib/data/proxies-phone-placeholder";
import { getPhoneProxyData } from "@/lib/data/proxies-phones";
import { wantsDemo } from "@/lib/data/accounts-phone-placeholder";

/**
 * Physical: one row per real phone (P6, approved 2026-09-23). The Geelark list
 * the Cloud page reads cannot see a real phone's proxy or numbers.
 */
async function PhonesLive() {
  let data;
  try {
    data = await getPhoneProxyData();
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Proxies &amp; numbers</h1>
        <DashCard title="Proxies">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The proxy and phone data")}</p>
        </DashCard>
      </div>
    );
  }
  return (
    <ProxiesPhonesView
      rows={data.rows}
      fetchedAt={formatEtShort(data.fetchedAt)}
      balances={<ProviderBalanceCards />}
      demo={false}
    />
  );
}

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function ProxiesLive() {
  let data;
  try {
    // Only the fleet being looked at: a proxy and a number follow their account.
    data = limitProxyData(
      await getProxyPhoneData(),
      await getFleet(),
      new Set((await getPhysicalProfiles()).data),
    );
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Proxies &amp; numbers</h1>
        <DashCard title="Proxies">
          {/* Three upstreams feed this page — Supabase, proxy-cheap and
              GeeLark — and the read does not say which one refused, so the
              copy names the group rather than guessing. */}
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The proxy and phone data")}</p>
        </DashCard>
      </div>
    );
  }

  return (
    <ProxiesTable
      rows={data.rows}
      fetchedAt={formatEtShort(data.fetchedAt)}
      charactersAvailable={data.charactersAvailable}
      // The spare pool and the "paying for nothing" list are the same set —
      // see the note on orphanSubscriptions.
      availableProxies={data.orphanSubscriptions}
      balances={<ProviderBalanceCards />}
    />
  );
}

export default async function ProxiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const physical = (await getFleet()) === "physical";
  // `?demo=1` in Physical still draws P6's invented phones, for judging the
  // layout in states live data will not produce on demand.
  if (physical && wantsDemo((await searchParams).demo)) {
    return (
      <ProxiesPhonesView
        rows={proxiesPhonePlaceholder()}
        fetchedAt="placeholder"
        balances={<ProviderBalanceCards />}
        demo
      />
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-xl font-semibold">Proxies &amp; numbers</h1>
          <CardSkeleton title="Proxies" lines={12} />
        </div>
      }
    >
      {physical ? <PhonesLive /> : <ProxiesLive />}
    </Suspense>
  );
}
