import { Suspense } from "react";
import { AccountsViews } from "@/components/dashboard/accounts-views";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getAccounts } from "@/lib/data/accounts";
import { nextProfileName } from "@/lib/data/account-rules";
import {
  PLACEHOLDER_ACCOUNTS,
  PLACEHOLDER_PHONES,
  wantsDemo,
} from "@/lib/data/accounts-phone-placeholder";
import { getDevices } from "@/lib/data/devices";
import { getContentTypeOptions } from "@/lib/data/scheduler-overrides";
import { inFleet } from "@/lib/fleet";
import { getFleet } from "@/lib/fleet-server";
import { upstreamMessage } from "@/lib/data/upstream-error";

/**
 * The `try` guards the READ and nothing else; the table is built after it.
 *
 * Wrapping the markup too — which every one of these panels used to do — means
 * a failure while React renders gets caught by the same net and reported as a
 * data problem. The screen would say the database was unreadable when the
 * database was fine, and React's own error handling would never see the fault
 * it was meant to handle. Raised by the 2026-09-09 external review.
 */
async function AccountsLive({ demo }: { demo: boolean }) {
  let loaded;
  try {
    loaded = await Promise.all([
      getAccounts(),
      // Selectable content types per character. Falls back to empty so an
      // unreadable registry costs the modal its checkboxes, not the page.
      getContentTypeOptions().catch(() => ({ data: {} })),
      getFleet(),
      // The by-phone view needs the phones themselves, so a registered phone
      // with no accounts is still listed. Physical only; a failure here costs
      // that view its groups, not the page.
      getDevices().catch(() => ({ data: [] })),
    ]);
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Accounts</h1>
        <DashCard title="All accounts">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
        </DashCard>
      </div>
    );
  }

  const [{ data }, options, fleet, devices] = loaded;
  // Only the fleet being looked at (Cloud or Physical, top right). An account
  // moved to a real phone leaves the Cloud list and appears in the Physical one.
  const rows = inFleet(data, fleet);

  // `?demo=1` draws the invented farm instead, so the by-phone view can be
  // judged before a single account has been moved (P4). Never the default:
  // this is a working screen on live rows.
  const showDemo = demo && fleet === "physical";

  return (
    <AccountsViews
      rows={showDemo ? PLACEHOLDER_ACCOUNTS : rows}
      contentTypeOptions={options.data}
      fleet={fleet}
      // For the Add account form (PF-21). The characters are the keys of the
      // options above, which is the live `characters` table already read here.
      // The suggestion comes from EVERY account, not the fleet being looked at:
      // Profile names are one list across both fleets, and a number free in
      // Physical may well be taken in Cloud.
      characters={Object.keys(options.data).sort()}
      suggestedProfile={nextProfileName(data.map((r) => r.profile))}
      // The invented farm reuses REAL profile names, so with PF-04 wired up a
      // press on its warmup switch would write to a live account. Demo rows
      // move the switch and forget, the way every switch on this page did
      // before PF-04.
      demo={showDemo}
      phones={
        showDemo
          ? PLACEHOLDER_PHONES
          : devices.data.map((d) => ({
              id: d.id,
              name: d.name,
              model: d.model ?? null,
              isActive: d.isActive,
              held: d.accounts.length,
            }))
      }
    />
  );
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { demo } = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-xl font-semibold">Accounts</h1>
          <CardSkeleton title="All accounts" lines={12} />
        </div>
      }
    >
      <AccountsLive demo={wantsDemo(demo)} />
    </Suspense>
  );
}
