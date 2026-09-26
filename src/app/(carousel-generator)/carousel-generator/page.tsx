import { OverviewView } from "@/components/carousel/overview-view";
import { actingUserEmail } from "@/lib/data/writes";
import { overviewData } from "@/server/carousel/repo/catalog";

/*
 * Overview (D16): the generator's front page. Read-only; every press opens
 * the screen that owns the work.
 */
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const viewer = await actingUserEmail().catch(() => "dev@local");
  const data = await overviewData(viewer).catch((err: unknown) => {
    console.error("overview failed", err);
    return null;
  });
  return <OverviewView initial={data} />;
}
