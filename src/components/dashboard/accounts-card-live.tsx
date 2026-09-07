import { DashCard } from "@/components/ui/card";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { getAccounts } from "@/lib/data/accounts";
import { formatEtShort } from "@/lib/data/format";

/** Homepage Accounts card — the full detail table in compact "card" mode
 *  (same filters/sort/columns, no action buttons). */
export async function AccountsCardLive({ className }: { className?: string }) {
  try {
    const { data, fetchedAt } = await getAccounts();
    return (
      <AccountsTable rows={data} fetchedAt={formatEtShort(fetchedAt)} mode="card" className={className} />
    );
  } catch (err) {
    return (
      <DashCard title="Accounts" viewAllHref="/accounts" className={className}>
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
}
