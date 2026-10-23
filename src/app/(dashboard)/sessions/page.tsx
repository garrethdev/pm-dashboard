import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { DashCard } from "@/components/ui/card";
import { SessionsView } from "@/components/dashboard/sessions-view";
import { DEMO_MISSING, DEMO_SESSIONS } from "@/lib/data/phone-session-placeholder";
import { getMissingRecordings, getSessions } from "@/lib/data/phone-sessions";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { getFleet } from "@/lib/fleet-server";
import { viewerIsReviewer } from "@/lib/reviewer-server";
import SessionsLoading from "./loading";

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function SessionsLive() {
  let sessions;
  let missing;
  try {
    [sessions, missing] = await Promise.all([getSessions({ limit: 200 }), getMissingRecordings()]);
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Sessions</h1>
        <DashCard title="Recorded sessions">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The list of sessions")}</p>
        </DashCard>
      </div>
    );
  }
  return <SessionsView sessions={sessions} missing={missing} />;
}

/**
 * Recorded posting sessions (PF-26). Physical only, and only for the people
 * on REVIEWER_EMAILS: anyone else gets the not-found page, so the page does
 * not exist as far as they can tell. `?demo=` draws it with placeholder
 * sessions, the way the phone-farm screens were judged before their data.
 */
export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const fleet = await getFleet();
  if (fleet !== "physical") redirect("/");
  if (!(await viewerIsReviewer())) notFound();

  const params = await searchParams;
  if (params.demo !== undefined) return <SessionsView sessions={DEMO_SESSIONS} missing={DEMO_MISSING} demo />;

  return (
    <Suspense fallback={<SessionsLoading />}>
      <SessionsLive />
    </Suspense>
  );
}
