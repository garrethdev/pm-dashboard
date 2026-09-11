import { Suspense } from "react";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getAccounts } from "@/lib/data/accounts";
import { getContentTypeOptions } from "@/lib/data/scheduler-overrides";
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
async function AccountsLive() {
  let loaded;
  try {
    loaded = await Promise.all([
      getAccounts(),
      // Selectable content types per character. Falls back to empty so an
      // unreadable registry costs the modal its checkboxes, not the page.
      getContentTypeOptions().catch(() => ({ data: {} })),
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

  const [{ data }, options] = loaded;
  return <AccountsTable rows={data} contentTypeOptions={options.data} />;
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-xl font-semibold">Accounts</h1>
          <CardSkeleton title="All accounts" lines={12} />
        </div>
      }
    >
      <AccountsLive />
    </Suspense>
  );
}
