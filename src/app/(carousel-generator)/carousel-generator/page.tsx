import { OverviewView } from "@/components/carousel/overview-view";
import { authBypassed } from "@/lib/auth";
import { actingUserEmail } from "@/lib/data/writes";
import { fallback, logError } from "@/server/carousel/log";
import { overviewData } from "@/server/carousel/repo/catalog";

/*
 * Overview (D16): the generator's front page. Read-only; every press opens
 * the screen that owns the work.
 */
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  // Under the dev bypass there is no session to read, so the placeholder
  // person's saves and votes are shown. Anywhere else a missing session means
  // no personal sections rather than somebody else's.
  const viewer = await actingUserEmail().catch((err: unknown) => {
    if (!authBypassed()) logError("overview session read", err);
    return authBypassed() ? "dev@local" : "";
  });
  const data = await overviewData(viewer).catch(fallback("overview", null));
  return <OverviewView initial={data} />;
}
