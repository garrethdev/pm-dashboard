import { DashCard } from "@/components/ui/card";
import { ContentTypesView } from "@/components/dashboard/content-types-view";
import { CT_DEFAULT_RANGE, getContentTypes } from "@/lib/data/content-types";
import { getFleetDefaults } from "@/lib/data/scheduler-config";

/*
 * Content Types — the registry as a catalogue.
 *
 * No inventory here on purpose: how much of a lane is left to post is the
 * Inventory page's question, and mixing the two makes a lane with a great
 * median look bad because it happens to be running dry. This page answers only
 * "is this lane worth posting", so the answer stays a performance answer.
 *
 * The <h1> lives inside ContentTypesView, never in the fallback — two headings
 * for the same page across a Suspense boundary left the analytics page with a
 * subtree that never hydrated.
 */

async function ContentTypesLive() {
  let data;
  try {
    const { data: fleet } = await getFleetDefaults();
    ({ data } = await getContentTypes(CT_DEFAULT_RANGE, fleet.glpWeek));
  } catch (err) {
    return (
      <DashCard title="Content types">
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
  return <ContentTypesView initial={data} />;
}

export default function ContentTypesPage() {
  return <ContentTypesLive />;
}
