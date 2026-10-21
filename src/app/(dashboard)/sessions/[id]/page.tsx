import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { DashCard } from "@/components/ui/card";
import { SessionDetail } from "@/components/dashboard/session-detail";
import { parseRowId } from "@/lib/data/device-rules";
import { DEMO_SESSIONS, demoFrames } from "@/lib/data/phone-session-placeholder";
import { signFrameUrls } from "@/lib/data/phone-session-storage";
import { getSession, getSessionFrames } from "@/lib/data/phone-sessions";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { getFleet } from "@/lib/fleet-server";
import { viewerIsReviewer } from "@/lib/reviewer-server";
import SessionLoading from "./loading";

async function SessionLive({ id }: { id: number }) {
  let session;
  let frames;
  let frameUrls;
  try {
    session = await getSession(id);
    if (!session || session.status !== "stored") notFound();
    frames = await getSessionFrames(id);
    // Signed on every render and never cached: the links live ten minutes.
    frameUrls = await signFrameUrls(frames.map((f) => f.path));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // notFound()
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Session</h1>
        <DashCard title="Recorded session">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The session")}</p>
        </DashCard>
      </div>
    );
  }
  return <SessionDetail session={session} frames={frames} frameUrls={frameUrls} />;
}

/** One recorded session (PF-26). Same gates as the list. */
export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const fleet = await getFleet();
  if (fleet !== "physical") redirect("/");
  if (!(await viewerIsReviewer())) notFound();

  const id = parseRowId((await params).id);
  if (id === null) notFound();

  const query = await searchParams;
  if (query.demo !== undefined) {
    const session = DEMO_SESSIONS.find((s) => s.id === id);
    if (!session) notFound();
    return <SessionDetail session={session} frames={demoFrames(session)} frameUrls={{}} demo />;
  }

  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionLive id={id} />
    </Suspense>
  );
}
