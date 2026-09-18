import { DashCard } from "@/components/ui/card";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { getAccounts } from "@/lib/data/accounts";
import { inFleet } from "@/lib/fleet";
import { getFleet } from "@/lib/fleet-server";
import { upstreamMessage } from "@/lib/data/upstream-error";

/** Homepage Accounts card — the full detail table in compact "card" mode
 *  (same filters/sort/columns, no action buttons).
 *
 *  The `try` guards the read only — see the note in accounts/page.tsx. */
export async function AccountsCardLive({ className }: { className?: string }) {
  let data;
  let fleet;
  try {
    let accounts;
    [accounts, fleet] = await Promise.all([getAccounts(), getFleet()]);
    // Only the fleet being looked at (Cloud or Physical, top right).
    data = inFleet(accounts.data, fleet);
  } catch (err) {
    return (
      <DashCard title="Accounts" viewAllHref="/accounts" className={className}>
        <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
      </DashCard>
    );
  }

  return <AccountsTable rows={data} mode="card" fleet={fleet} className={className} />;
}
