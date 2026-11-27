import { RobotUpdatesHeader, UpdateCard } from "@/components/dashboard/robot-updates";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Robot } from "@/components/ui/icons";
import { getRobotUpdateStatus } from "@/lib/data/robot-updates";
import { upstreamMessage } from "@/lib/data/upstream-error";

/**
 * Settings -> Robot updates (2026-11-27): every version of the warmup robot,
 * newest first, as vertical cards with Download across the bottom. A version
 * the Air already has is marked Installed and its Download is switched off.
 * The steps are on each version's own "How to install" page and the full notes
 * on the Changelog tab, so this stays a list.
 *
 * Read live, not cached: right after Claude publishes a version this is the
 * page someone opens to check it is there.
 */
export const dynamic = "force-dynamic";

export default async function RobotUpdatesPage() {
  let status;
  try {
    status = await getRobotUpdateStatus();
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <RobotUpdatesHeader state={{ kind: "none" }} tab="updates" />
        <Card>
          <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
        </Card>
      </div>
    );
  }
  const { updates, state, installed } = status;

  return (
    <div className="flex flex-col gap-6">
      <RobotUpdatesHeader state={state} tab="updates" />
      {updates.length === 0 ? (
        <EmptyState icon={Robot}>No robot updates yet.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {updates.map((u, i) => (
            <UpdateCard key={u.version} update={u} newest={i === 0} installed={installed.has(u.version)} />
          ))}
        </div>
      )}
    </div>
  );
}
