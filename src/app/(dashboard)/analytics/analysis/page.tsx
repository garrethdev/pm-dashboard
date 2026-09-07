import Link from "next/link";
import { ArrowLeft, ExternalLink } from "@/components/ui/icons";
import { Card, DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { CONTENT_RANGES, getTopContent, type ContentRange, type TopContentPost } from "@/lib/data/analytics";
import { formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/*
 * AI analysis of the top-performing content for a range, reached from the
 * "View analysis" button on Top Posts. Scores and verdicts come from
 * judge_score / judge_breakdown on the two perf tables.
 *
 * The range is a query param rather than client state so the page stays a
 * server component — the pills are plain links.
 *
 * Verdict text is model output about the account's own content. It is rendered
 * as data and never treated as instructions.
 */

const nf = (v: number) => v.toLocaleString("en-US");

/** 0-100 judge score: green from 70, amber from 45, red below. */
function scoreTone(score: number) {
  if (score >= 70) return "ok" as const;
  if (score >= 45) return "warn" as const;
  return "danger" as const;
}

const SCORE_LABELS: [string, string][] = [
  ["hook_strength", "Hook"],
  ["retention", "Retention"],
  ["share_propensity", "Share"],
  ["emotional_charge", "Emotion"],
  ["virality", "Virality"],
  ["cognitive_load", "Load"],
];

function ScoreBars({ scores }: { scores: Record<string, number> | null }) {
  if (!scores) return null;
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3">
      {SCORE_LABELS.filter(([k]) => typeof scores[k] === "number").map(([k, label]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] text-text-muted">{label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-card">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(scores[k], 100)}%` }}
            />
          </span>
          <span className="w-6 text-right text-[11px] tnum text-text-muted">{scores[k]}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-text-muted">{label}</span>
      <span className="text-sm font-semibold tnum text-text-primary">{value}</span>
    </div>
  );
}

function PostCard({ post, rank }: { post: TopContentPost; rank: number }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card-raised text-xs font-semibold tnum text-text-muted">
          {rank}
        </span>
        {post.platform === "instagram" ? (
          <InstagramIcon className="size-3.5 shrink-0 text-text-muted" />
        ) : (
          <TikTokIcon className="size-3.5 shrink-0 text-text-muted" />
        )}
        <span className="text-sm font-semibold">@{post.account}</span>
        {post.mediaType && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
            {post.mediaType}
          </span>
        )}
        <span className="text-xs text-text-muted">{formatEtDate(post.postedAt)}</span>
        {post.score != null ? (
          <StatusPill tone={scoreTone(post.score)}>Score {post.score}</StatusPill>
        ) : (
          <StatusPill tone="neutral">not judged</StatusPill>
        )}
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-accent hover:opacity-80"
          >
            Open post <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Metric label="Views" value={nf(post.views)} />
        <Metric label="Eng. rate" value={post.engRate == null ? "—" : `${post.engRate}%`} />
        <Metric label="Likes" value={nf(post.likes)} />
        <Metric label="Comments" value={nf(post.comments)} />
        <Metric label="Shares" value={nf(post.shares)} />
        <Metric label="Saves" value={nf(post.saves)} />
      </div>

      {post.caption && (
        <p className="text-sm text-text-primary italic">&ldquo;{post.caption}&rdquo;</p>
      )}

      {post.verdict ? (
        <p className="text-sm text-text-muted">{post.verdict}</p>
      ) : (
        <p className="text-sm text-text-muted">
          The judge hasn&rsquo;t scored this post yet. It runs on a schedule once a post matures.
        </p>
      )}

      <ScoreBars scores={post.scores} />
    </Card>
  );
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range: ContentRange = CONTENT_RANGES.some((r) => r.key === rawRange)
    ? (rawRange as ContentRange)
    : "week";

  let data;
  try {
    ({ data } = await getTopContent(range));
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Top content analysis</h1>
        <DashCard title="Analysis">
          <p className="text-sm text-text-muted">
            Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
          </p>
        </DashCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/analytics"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-3.5" /> Analytics
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold">Top content analysis</h1>
          {/* Links, not buttons — this stays a server component. */}
          <div className="flex items-center gap-1 rounded-full bg-card-raised p-1">
            {CONTENT_RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/analytics/analysis?range=${r.key}` as never}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                  r.key === range
                    ? "bg-accent text-bg"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
        <span className="text-xs tnum text-text-muted">
          {nf(data.judged)} of {nf(data.posts.length)} judged
        </span>
      </div>

      {data.posts.length === 0 ? (
        <DashCard title="Analysis">
          <p className="text-sm text-text-muted">No posts in this range.</p>
        </DashCard>
      ) : (
        <div className="flex flex-col gap-3">
          {data.posts.map((p, i) => (
            <PostCard key={`${p.platform}-${p.postId}`} post={p} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
