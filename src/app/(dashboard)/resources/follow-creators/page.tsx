import { DashCard } from "@/components/ui/card";
import { FollowCreatorsView } from "@/components/dashboard/follow-creators-view";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { getFollowBoard } from "@/lib/data/follow-creators";

/**
 * Creators to follow (Garreth, 2026-11-13): the small creators Yurie follows
 * by hand on the farm phones (Warmup Upgrade Plan, Y6). Reached from
 * Resources. Not limited to the Physical fleet switch: the accounts it lists
 * are the ones on a phone whatever the switch says, and people check it from
 * their Macs too.
 */
export default async function FollowCreatorsPage() {
  let board;
  try {
    board = await getFollowBoard();
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold">Creators to follow</h1>
        <DashCard title="Creators to follow">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The creators")}</p>
        </DashCard>
      </div>
    );
  }
  return <FollowCreatorsView board={board} />;
}
