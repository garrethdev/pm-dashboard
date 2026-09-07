import { Suspense } from "react";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getAccounts } from "@/lib/data/accounts";
import { getContentTypeOptions } from "@/lib/data/scheduler-overrides";
import { formatEtShort } from "@/lib/data/format";

async function AccountsLive() {
  try {
    const [{ data, fetchedAt }, options] = await Promise.all([
      getAccounts(),
      // Selectable content types per character. Falls back to empty so an
      // unreadable registry costs the modal its checkboxes, not the page.
      getContentTypeOptions().catch(() => ({ data: {} })),
    ]);
    return (
      <AccountsTable
        rows={data}
        fetchedAt={formatEtShort(fetchedAt)}
        contentTypeOptions={options.data}
      />
    );
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Accounts</h1>
        <DashCard title="All accounts">
          <p className="text-sm text-text-muted">
            Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
          </p>
        </DashCard>
      </div>
    );
  }
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
