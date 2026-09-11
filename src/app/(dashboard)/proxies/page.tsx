import { Suspense } from "react";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { ProxiesTable } from "@/components/dashboard/proxies-table";
import { ProviderBalanceCards } from "@/components/dashboard/provider-balance-cards";
import { getProxyPhoneData } from "@/lib/data/proxies";
import { formatEtShort } from "@/lib/data/format";
import { upstreamMessage } from "@/lib/data/upstream-error";

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function ProxiesLive() {
  let data;
  try {
    data = await getProxyPhoneData();
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Proxies &amp; phones</h1>
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
      balances={<ProviderBalanceCards />}
    />
  );
}

export default function ProxiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-xl font-semibold">Proxies &amp; phones</h1>
          <CardSkeleton title="Proxies" lines={12} />
        </div>
      }
    >
      <ProxiesLive />
    </Suspense>
  );
}
