import { Suspense } from "react";
import { AccountsCardLive } from "@/components/dashboard/accounts-card-live";
import { AutomationCard } from "@/components/dashboard/automation-card";
import { GeelarkWalletCard } from "@/components/dashboard/geelark-wallet-card";
import { IncidentFeedLive } from "@/components/dashboard/incident-feed-live";
import { InventoryCardLive } from "@/components/dashboard/inventory-card-live";
import { ProxiesCardLive } from "@/components/dashboard/proxies-card-live";
import { TopPostsCard } from "@/components/dashboard/top-posts-card";
import { CardSkeleton } from "@/components/ui/card-skeleton";

/*
 * Layout: a viewport-height hero.
 *  - xl (laptop): Accounts (2/3) + a stack of GeeLark Wallet / Inventory / Automation
 *    (1/3); Proxies + Incident feed sit in a row below the hero.
 *  - 2xl (wide): three columns — Accounts (1/2), the GeeLark/Inventory/Automation
 *    stack (1/4), and a Proxies + Incident stack (1/4). The below-hero row is hidden.
 * Pulse stats live in the topbar; Top Posts closes the page.
 */

export default function Home() {
  return (
    <div className="flex flex-col gap-3">
      {/* Hero — fills the viewport height on xl+. */}
      <div className="grid grid-cols-12 gap-3 xl:h-[calc(100vh-6.5rem)] xl:min-h-[620px]">
        <div className="relative col-span-12 min-h-0 xl:col-span-8 2xl:col-span-6">
          <Suspense
            fallback={<CardSkeleton title="Accounts" lines={12} className="xl:absolute xl:inset-0" />}
          >
            <AccountsCardLive className="xl:absolute xl:inset-0" />
          </Suspense>
        </div>

        {/* Middle stack: GeeLark Wallet (short) over Inventory + Automation. */}
        <div className="col-span-12 flex min-h-0 flex-col gap-3 xl:col-span-4 2xl:col-span-3">
          <div className="shrink-0">
            <Suspense fallback={<CardSkeleton title="GeeLark Wallet" lines={1} />}>
              <GeelarkWalletCard />
            </Suspense>
          </div>
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={<CardSkeleton title="Inventory" lines={6} className="xl:absolute xl:inset-0" />}
            >
              <InventoryCardLive className="xl:absolute xl:inset-0 xl:overflow-auto" />
            </Suspense>
          </div>
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={<CardSkeleton title="Automation" lines={6} className="xl:absolute xl:inset-0" />}
            >
              <AutomationCard className="xl:absolute xl:inset-0 xl:overflow-auto" />
            </Suspense>
          </div>
        </div>

        {/* Third column — only on 2xl (wide): Proxies + Incident stacked. */}
        <div className="hidden min-h-0 flex-col gap-3 2xl:col-span-3 2xl:flex">
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={<CardSkeleton title="Proxies & phones" lines={4} className="absolute inset-0" />}
            >
              <ProxiesCardLive className="absolute inset-0 overflow-auto" />
            </Suspense>
          </div>
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={
                <CardSkeleton title="Incident feed — last 48h" lines={5} className="absolute inset-0" />
              }
            >
              <IncidentFeedLive className="absolute inset-0 overflow-auto" />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Proxies + Incident side by side below the hero — hidden on 2xl (in-hero there). */}
      <div className="grid grid-cols-12 gap-3 2xl:hidden">
        <Suspense
          fallback={
            <CardSkeleton title="Proxies & phones" lines={4} className="col-span-12 xl:col-span-6" />
          }
        >
          <ProxiesCardLive className="col-span-12 xl:col-span-6" />
        </Suspense>

        <Suspense
          fallback={
            <CardSkeleton title="Incident feed — last 48h" lines={5} className="col-span-12 xl:col-span-6" />
          }
        >
          <IncidentFeedLive className="col-span-12 xl:col-span-6" />
        </Suspense>
      </div>

      {/* Top Posts */}
      <TopPostsCard />
    </div>
  );
}
