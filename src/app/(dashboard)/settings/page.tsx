import { Suspense } from "react";
import { AccountManagement } from "@/components/dashboard/account-management";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getAccounts } from "@/lib/data/accounts";
import { wantsDemo, PLACEHOLDER_PHONES } from "@/lib/data/accounts-phone-placeholder";
import { getDevices } from "@/lib/data/devices";
import type { MoveTarget } from "@/lib/data/move-rules";
import { upstreamMessage } from "@/lib/data/upstream-error";

/**
 * The phones the move screens offer (design ticket P10).
 *
 * `?demo=1` draws the invented farm instead — the same phones the Accounts
 * by-phone view and the To-do screens use, so the three describe one farm
 * rather than three. It exists because no phone is registered yet, so the real
 * picker is an empty box and there is no design to judge. It is never the
 * default: Settings moves LIVE accounts, and a placeholder that quietly
 * replaced the real phones would be a lie the day the first one arrives.
 */
async function moveTargets(demo: boolean): Promise<MoveTarget[]> {
  if (demo) {
    return PLACEHOLDER_PHONES.map((p) => ({
      id: p.id,
      name: p.name,
      model: p.model,
      isActive: p.isActive,
      // An invented spread: one full, one part-full, one empty, one off — the
      // four states the picker has to show.
      held: p.id === 1 ? 3 : p.id === 2 ? 2 : 0,
    }));
  }
  const { data } = await getDevices();
  return data.map((d) => ({
    id: d.id,
    name: d.name,
    model: d.model,
    isActive: d.isActive,
    held: d.accounts.filter((a) => a.isActive).length,
  }));
}

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function AccountManagementLive({ demo }: { demo: boolean }) {
  let rows;
  let phones: MoveTarget[];
  try {
    const [accounts, targets] = await Promise.all([getAccounts(), moveTargets(demo)]);
    rows = accounts.data;
    phones = targets;
  } catch (err) {
    return (
      <DashCard title="Account management">
        <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
      </DashCard>
    );
  }

  // Live accounts only: a retired account has no fleet left to be moved to.
  return <AccountManagement rows={rows.filter((r) => r.isActive)} phones={phones} demo={demo} />;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const demo = wantsDemo((await searchParams).demo);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Suspense fallback={<CardSkeleton title="Account management" lines={10} />}>
        <AccountManagementLive demo={demo} />
      </Suspense>
    </div>
  );
}
