import { Suspense } from "react";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { ProxiesTable } from "@/components/dashboard/proxies-table";
import { ProviderBalanceCards } from "@/components/dashboard/provider-balance-cards";
import { getProxyPhoneData } from "@/lib/data/proxies";
import { formatEtShort } from "@/lib/data/format";

async function ProxiesLive() {
  try {
    const data = await getProxyPhoneData();
    return (
      <ProxiesTable
        rows={data.rows}
        fetchedAt={formatEtShort(data.fetchedAt)}
        charactersAvailable={data.charactersAvailable}
        balances={<ProviderBalanceCards />}
      />
    );
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Proxies &amp; Phones</h1>
        <DashCard title="Proxies">
          <p className="text-sm text-text-muted">
            Upstream unreachable — {err instanceof Error ? err.message : "unknown error"}
          </p>
        </DashCard>
      </div>
    );
  }
}

export default function ProxiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-xl font-semibold">Proxies &amp; Phones</h1>
          <CardSkeleton title="Proxies" lines={12} />
        </div>
      }
    >
      <ProxiesLive />
    </Suspense>
  );
}
