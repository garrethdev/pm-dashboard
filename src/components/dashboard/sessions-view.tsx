"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashCard } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Film } from "@/components/ui/icons";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { etDateTime } from "@/lib/data/format";
import { spanMinutes } from "@/lib/data/phone-session-rules";
import { KIND_LABEL, type PhoneSession, type SessionKind } from "@/lib/data/phone-sessions";

/** "rich_life" → "Rich life": the hand-out's content type as a label. */
export function typeLabel(contentType: string): string {
  const words = contentType.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "—";
}

/** What the session was, as a pill. Grey until a read or a reviewer has said. */
export function kindPill(kind: SessionKind | null): { tone: PillTone; label: string } {
  if (!kind) return { tone: "gray", label: "Not yet known" };
  return { tone: kind === "posting" ? "info" : kind === "manual_warmup" ? "accent" : "neutral", label: KIND_LABEL[kind] };
}

/** The review's state as a pill: the one thing the list has to say per row. */
export function reviewPill(s: PhoneSession): { tone: PillTone; label: string } {
  if (!s.review) return { tone: "gray", label: "Not reviewed" };
  const n = s.review.anomalies.length;
  if (n === 0) return { tone: "ok", label: "Clean" };
  const high = s.review.anomalies.some((a) => a.severity === "high");
  return { tone: high ? "danger" : "warn", label: `${n} flagged` };
}

const TABLE = "w-full text-sm [&_td]:pr-6 [&_th]:pr-6 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0";
const HEAD = "text-left text-xs text-text-muted";
const TH = "pb-2 font-medium whitespace-nowrap";
const ROW = "border-t border-border";
const TD = "py-2.5 align-middle";

/**
 * The Sessions page (PF-26): every recorded session, newest first, with what
 * it was (posting, manual warmup, other) once Claude's read or a reviewer has
 * said. Reviewers only; the page answers not-found to anyone else. Posts with
 * no recording behind them are not listed (Czedrick, 2026-10-23: the page is
 * for the sessions there are frames to read; the check stays in
 * phone-sessions.ts, unused).
 *
 * "Pick one at random" is the random part of the plan: the Air records every
 * session, and which one gets read is decided here, by chance, never by a
 * schedule she could learn.
 */
export function SessionsView({
  sessions,
  demo = false,
}: {
  sessions: PhoneSession[];
  demo?: boolean;
}) {
  const router = useRouter();
  const suffix = demo ? "?demo=1" : "";

  const pickRandom = () => {
    const pool = sessions.filter((s) => !s.review);
    const from = pool.length > 0 ? pool : sessions;
    if (from.length === 0) return;
    const pick = from[Math.floor(Math.random() * from.length)];
    router.push(`/sessions/${pick.id}${suffix}` as never);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Sessions</h1>
        {sessions.length > 0 && <CtaButton onClick={pickRandom}>Pick one at random</CtaButton>}
      </div>

      <DashCard title="Recorded sessions" className="flex flex-col">
        {sessions.length === 0 ? (
          <EmptyState icon={Film}>No sessions recorded yet</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${TABLE} min-w-[40rem]`}>
              <thead>
                <tr className={HEAD}>
                  <th className={TH}>When (ET)</th>
                  <th className={TH}>Phone</th>
                  <th className={TH}>Length</th>
                  <th className={TH}>Frames</th>
                  <th className={TH}>Kind</th>
                  <th className={TH}>Post</th>
                  <th className={TH}>Review</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const pill = reviewPill(s);
                  const href = `/sessions/${s.id}${suffix}`;
                  return (
                    <tr
                      key={s.id}
                      className={`${ROW} cursor-pointer transition-colors hover:bg-pill-bg/40`}
                      onClick={() => router.push(href as never)}
                    >
                      <td className={`${TD} whitespace-nowrap`}>
                        <Link href={href as never} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {etDateTime(s.startedAt)}
                        </Link>
                      </td>
                      <td className={TD}>{s.deviceName ?? `Phone ${s.deviceId}`}</td>
                      <td className={`${TD} tabular-nums`}>{spanMinutes(s.startedAt, s.endedAt)} min</td>
                      <td className={`${TD} tabular-nums`}>{s.frameCount}</td>
                      <td className={TD}>
                        <StatusPill tone={kindPill(s.kind).tone}>{kindPill(s.kind).label}</StatusPill>
                      </td>
                      <td className={TD}>
                        {s.matchedPost ? (
                          <span className="inline-flex items-center gap-1.5">
                            <PlatformIcon platform={s.matchedPost.platform} />
                            {typeLabel(s.matchedPost.contentType)}
                            {s.matchedPost.username && <span className="text-text-muted">· {s.matchedPost.username}</span>}
                          </span>
                        ) : (
                          <span className="text-text-muted">No post</span>
                        )}
                      </td>
                      <td className={TD}>
                        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>
    </div>
  );
}
