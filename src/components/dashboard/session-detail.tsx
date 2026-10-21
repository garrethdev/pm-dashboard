"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, DashCard } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { ArrowLeft, Loader2 } from "@/components/ui/icons";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { reviewPill, typeLabel } from "@/components/dashboard/sessions-view";
import { etDateTime } from "@/lib/data/format";
import { elapsedLabel, spanMinutes, type FrameInfo } from "@/lib/data/phone-session-rules";
import type { PhoneSession, ReviewSeverity } from "@/lib/data/phone-sessions";
import { cn } from "@/lib/utils";

const SEVERITY: Record<ReviewSeverity, { tone: PillTone; label: string }> = {
  low: { tone: "gray", label: "Low" },
  medium: { tone: "warn", label: "Medium" },
  high: { tone: "danger", label: "High" },
};

function Fact({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col", wide && "col-span-2")}>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

function FrameRef({ frames, number }: { frames: FrameInfo[]; number: number }) {
  const f = frames.find((x) => x.number === number);
  return (
    <a href={`#frame-${number}`} className="whitespace-nowrap font-mono text-xs text-text-muted hover:text-text hover:underline">
      Frame {number}
      {f ? ` · ${elapsedLabel(f.elapsedSec)}` : ""}
    </a>
  );
}

/**
 * One recorded session (PF-26): the facts, Claude's read of it, and every
 * frame. A flagged frame in the read links down to its tile.
 *
 * Frames are shown through ten-minute signed links made when the page was
 * drawn; in the demo there are no pictures and the tiles are blank.
 */
export function SessionDetail({
  session,
  frames,
  frameUrls,
  demo = false,
}: {
  session: PhoneSession;
  frames: FrameInfo[];
  frameUrls: Record<string, string>;
  demo?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const review = session.review;
  const pill = reviewPill(session);

  const ask = async () => {
    // Demo mode draws the page and never writes (the rule for every placeholder screen).
    if (demo || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/review`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "The review could not be made.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The review could not be made.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={`/sessions${demo ? "?demo=1" : ""}` as never}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
          >
            <ArrowLeft className="size-3" />
            Sessions
          </Link>
          <h1 className="text-xl font-semibold">
            {session.deviceName ?? `Phone ${session.deviceId}`} · {etDateTime(session.startedAt)}
          </h1>
        </div>
        <CtaButton onClick={ask} disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {busy ? "Reading the frames" : review ? "Review again" : "Review with Claude"}
        </CtaButton>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Phone">{session.deviceName ?? `Phone ${session.deviceId}`}</Fact>
          <Fact label="Started (ET)">{etDateTime(session.startedAt)}</Fact>
          <Fact label="Length">{spanMinutes(session.startedAt, session.endedAt)} min</Fact>
          <Fact label="Frames">{session.frameCount}</Fact>
          <Fact label="Post" wide>
            {session.matchedPost ? (
              <span className="inline-flex items-center gap-1.5">
                <PlatformIcon platform={session.matchedPost.platform} />
                {typeLabel(session.matchedPost.contentType)}
                {session.matchedPost.username && <span className="text-text-muted">· {session.matchedPost.username}</span>}
              </span>
            ) : (
              <span className="text-text-muted">No post</span>
            )}
          </Fact>
        </dl>
      </Card>

      <DashCard
        title="Claude's read"
        actions={<StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
      >
        {error && <p className="mb-4 text-sm text-pill-red">{error}</p>}
        {!review ? (
          <p className="text-sm text-text-muted">Not reviewed yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <p className="text-sm leading-6">{review.summary}</p>
            {review.postSeen !== null && (
              <p className="text-xs text-text-muted">
                {review.postSeen ? "A post was seen going out." : "No post was seen going out."}
                {session.reviewedAt ? ` Read ${etDateTime(session.reviewedAt)}.` : ""}
              </p>
            )}

            {review.anomalies.length > 0 && (
              <ul className="flex flex-col gap-3">
                {review.anomalies.map((a, i) => {
                  const sev = SEVERITY[a.severity];
                  return (
                    <li key={i} className="flex flex-col gap-1 rounded-nested border border-border p-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex shrink-0 items-center gap-3 sm:w-44">
                        <StatusPill tone={sev.tone}>{sev.label}</StatusPill>
                        {a.frame !== null && <FrameRef frames={frames} number={a.frame} />}
                      </div>
                      <p className="text-sm leading-6">{a.what}</p>
                    </li>
                  );
                })}
              </ul>
            )}

            {review.timeline.length > 0 && (
              <ol className="flex flex-col gap-1.5 border-t border-border pt-4">
                {review.timeline.map((t, i) => (
                  <li key={i} className="flex gap-4 text-sm">
                    <span className="w-28 shrink-0">
                      <FrameRef frames={frames} number={t.frame} />
                    </span>
                    <span className="text-text-muted">{t.note}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </DashCard>

      <DashCard title="Frames" actions={<span className="text-xs text-text-muted">{frames.length}</span>}>
        {frames.length === 0 ? (
          <p className="text-sm text-text-muted">No frames were found for this session.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {frames.map((f) => {
              const url = frameUrls[f.path];
              const flagged = review?.anomalies.some((a) => a.frame === f.number) ?? false;
              return (
                <li key={f.path} id={`frame-${f.number}`} className="flex scroll-mt-24 flex-col gap-1">
                  <a
                    href={url ?? "#"}
                    target={url ? "_blank" : undefined}
                    rel="noreferrer"
                    className={cn(
                      "block aspect-[9/19.5] overflow-hidden rounded-nested border bg-pill-bg",
                      flagged ? "border-pill-red" : "border-border",
                    )}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- ten-minute signed links from the private bucket
                      <img src={url} alt={`Frame ${f.number}`} loading="lazy" className="size-full object-cover" />
                    ) : null}
                  </a>
                  <span className="font-mono text-[11px] text-text-muted">
                    {f.number} · {elapsedLabel(f.elapsedSec)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </DashCard>
    </div>
  );
}
