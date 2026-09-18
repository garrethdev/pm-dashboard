import { Suspense } from "react";
import { AccountManagement } from "@/components/dashboard/account-management";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getAccounts } from "@/lib/data/accounts";
import { upstreamMessage } from "@/lib/data/upstream-error";

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function AccountManagementLive() {
  let data;
  try {
    ({ data } = await getAccounts());
  } catch (err) {
    return (
      <DashCard title="Account management">
        <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
      </DashCard>
    );
  }

  // Live accounts only: a retired account has no fleet left to be moved to.
  return <AccountManagement rows={data.filter((r) => r.isActive)} />;
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Suspense fallback={<CardSkeleton title="Account management" lines={10} />}>
        <AccountManagementLive />
      </Suspense>
    </div>
  );
}
