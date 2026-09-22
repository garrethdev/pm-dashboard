import { Suspense } from "react";
import { AccountsCardLive } from "@/components/dashboard/accounts-card-live";
import { AutomationCard } from "@/components/dashboard/automation-card";
import { FleetTopCard } from "@/components/dashboard/fleet-top-card";
import { IncidentFeedLive } from "@/components/dashboard/incident-feed-live";
import { InventoryCardForFleet } from "@/components/dashboard/inventory-card-fleet";
import { ProxiesCardLive } from "@/components/dashboard/proxies-card-live";
import { TodoTodayCard } from "@/components/dashboard/todo-today-card";
import { TopPostsCard } from "@/components/dashboard/top-posts-card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { parseTodoState, type TodoDevice } from "@/lib/data/todo-placeholder";
import { getTodoBoard, type TodoExtras } from "@/lib/data/todo";
import { getFleet } from "@/lib/fleet-server";

/*
 * Two homepages, one per fleet.
 *
 * Cloud is the page exactly as it always was and is not touched (Garreth,
 * 2026-09-18): Accounts, then a stack of GeeLark Wallet / Inventory /
 * Automation, with Proxies + Incident feed below.
 *
 * Physical is design ticket P1: To-do at the top of the right column with
 * Inventory under it, and Proxies, the incident feed and Automation three
 * across below the hero. Automation stays on the Physical side because plenty
 * still runs by robot there (Garreth, 2026-09-22) — only the Posting Agent
 * drops out of it, since Yurie posts by hand. The Devices card left the
 * dashboard; the phones have their own page in the menu.
 */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const fleet = await getFleet();
  if (fleet === "physical") {
    // `?todo=` draws one of the placeholder states, which is how the card is
    // judged in states live data will not produce on demand (a phone switched
    // off, a day already finished). WITHOUT it the card is the real list
    // (PF-07) — a failed read costs the card its contents, not the homepage.
    const params = await searchParams;
    const drawn = params.todo !== undefined;
    const live = drawn
      ? undefined
      : await getTodoBoard()
          .then((b) => ({ initial: b.devices, extras: b.extras, initialDay: 0 }))
          .catch(() => undefined);
    return <PhysicalHome todoState={parseTodoState(params.todo)} live={live} />;
  }
  return <CloudHome />;
}

/**
 * Physical — P1.
 *
 * The hero is two explicit rows on xl so the right column can be To-do today
 * over Devices + Inventory while Accounts spans both. Explicit placement is
 * also what lets the phone order differ: TO-DO TODAY COMES FIRST ON A PHONE,
 * above Accounts, because it is the reason the app was opened at all. On a
 * desktop the eye starts left, so Accounts keeps the lead there.
 */
function PhysicalHome({
  todoState,
  live,
}: {
  todoState: ReturnType<typeof parseTodoState>;
  live?: { initial: TodoDevice[]; extras: TodoExtras; initialDay: number };
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-12 gap-3 xl:h-[calc(100vh-6.5rem)] xl:min-h-[620px] xl:grid-rows-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* To-do today — first on a phone, top of the right column on a desktop. */}
        <div className="relative order-1 col-span-12 min-h-0 xl:order-none xl:col-span-4 xl:col-start-9 xl:row-start-1 2xl:col-span-3 2xl:col-start-10">
          <TodoTodayCard
            state={todoState}
            live={live}
            className="flex xl:absolute xl:inset-0 xl:overflow-auto"
          />
        </div>

        {/* Accounts — spans both rows beside the right column. */}
        <div className="relative order-2 col-span-12 min-h-0 xl:order-none xl:col-span-8 xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:col-span-9">
          <Suspense
            fallback={<CardSkeleton title="Accounts" lines={12} className="xl:absolute xl:inset-0" />}
          >
            <AccountsCardLive className="xl:absolute xl:inset-0" />
          </Suspense>
        </div>

        {/* Inventory under To-do. Automation moved down to the row below the
            hero on 2026-09-22 (Garreth), beside Proxies and the incident feed:
            it is something you check on, not something you work from. */}
        <div className="order-3 col-span-12 flex min-h-0 flex-col gap-3 xl:order-none xl:col-span-4 xl:col-start-9 xl:row-start-2 2xl:col-span-3 2xl:col-start-10">
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={<CardSkeleton title="Inventory" lines={6} className="xl:absolute xl:inset-0" />}
            >
              <InventoryCardForFleet className="xl:absolute xl:inset-0 xl:overflow-auto" />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Proxies, the incident feed and Automation, three across. Physical
          keeps this row at every width: with only To-do and Inventory beside
          Accounts, the hero has no third column to fold them into. */}
      <div className="grid grid-cols-12 gap-3">
        <Suspense
          fallback={
            <CardSkeleton title="Proxies & numbers" lines={4} className="col-span-12 xl:col-span-4" />
          }
        >
          <ProxiesCardLive className="col-span-12 xl:col-span-4" />
        </Suspense>

        <Suspense
          fallback={
            <CardSkeleton title="Incident feed, last 48h" lines={5} className="col-span-12 xl:col-span-4" />
          }
        >
          <IncidentFeedLive className="col-span-12 xl:col-span-4" />
        </Suspense>

        <Suspense
          fallback={<CardSkeleton title="Automation" lines={6} className="col-span-12 xl:col-span-4" />}
        >
          <AutomationCard className="col-span-12 xl:col-span-4" />
        </Suspense>
      </div>

      <TopPostsCard />
    </div>
  );
}

/**
 * Cloud — the page as it always was.
 *
 * Layout: a viewport-height hero.
 *  - xl (laptop): Accounts (2/3) + a stack of GeeLark Wallet / Inventory / Automation
 *    (1/3); Proxies + Incident feed sit in a row below the hero.
 *  - 2xl (wide): three columns — Accounts (1/2), the GeeLark/Inventory/Automation
 *    stack (1/4), and a Proxies + Incident stack (1/4). The below-hero row is hidden.
 * Pulse stats live in the topbar; Top Posts closes the page.
 */
function CloudHome() {
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
            {/* GeeLark wallet in Cloud, the phones in use in Physical. */}
            <Suspense fallback={<CardSkeleton title="" lines={1} />}>
              <FleetTopCard />
            </Suspense>
          </div>
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={<CardSkeleton title="Inventory" lines={6} className="xl:absolute xl:inset-0" />}
            >
              <InventoryCardForFleet className="xl:absolute xl:inset-0 xl:overflow-auto" />
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
              fallback={<CardSkeleton title="Proxies & numbers" lines={4} className="absolute inset-0" />}
            >
              <ProxiesCardLive className="absolute inset-0 overflow-auto" />
            </Suspense>
          </div>
          <div className="relative min-h-0 flex-1">
            <Suspense
              fallback={
                <CardSkeleton title="Incident feed, last 48h" lines={5} className="absolute inset-0" />
              }
            >
              <IncidentFeedLive className="absolute inset-0 overflow-auto" />
            </Suspense>
          </div>
        </div>
      </div>

      <BelowHero />
      <TopPostsCard />
    </div>
  );
}

/** Proxies + Incident side by side below the hero — hidden on 2xl (in-hero there). */
function BelowHero() {
  return (
    <div className="grid grid-cols-12 gap-3 2xl:hidden">
      <Suspense
        fallback={
          <CardSkeleton title="Proxies & numbers" lines={4} className="col-span-12 xl:col-span-6" />
        }
      >
        <ProxiesCardLive className="col-span-12 xl:col-span-6" />
      </Suspense>

      <Suspense
        fallback={
          <CardSkeleton title="Incident feed, last 48h" lines={5} className="col-span-12 xl:col-span-6" />
        }
      >
        <IncidentFeedLive className="col-span-12 xl:col-span-6" />
      </Suspense>
    </div>
  );
}
