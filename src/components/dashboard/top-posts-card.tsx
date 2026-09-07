"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, ExternalLink, Play } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { FilterPills } from "@/components/ui/filter-pills";
import { Skeleton } from "@/components/ui/skeleton";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";

interface TopPost {
  platform: "tiktok" | "instagram";
  account: string;
  postId: string;
  postUrl: string;
  views: number | null;
  engagement: number | null;
  postedAt: string;
  caption: string | null;
  thumbnailUrl: string | null;
}

type Range = "week" | "month" | "all";

function fmt(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function PostThumb({ post }: { post: TopPost }) {
  return (
    <Link
      href={post.postUrl as never}
      target="_blank"
      rel="noreferrer"
      className="group relative flex aspect-[9/16] flex-col justify-end overflow-hidden rounded-nested border border-border bg-card-raised"
    >
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- oEmbed URLs, many CDN subdomains
        <img
          src={post.thumbnailUrl}
          alt={post.caption ?? post.account}
          className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-135 from-card-raised to-card">
          <Play className="size-8 text-text-muted" />
        </div>
      )}
      <div className="absolute inset-0 bg-linear-0 from-black/80 via-black/10 to-transparent" />

      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-black shadow">
        {post.platform === "tiktok" ? (
          <TikTokIcon className="size-3" />
        ) : (
          <InstagramIcon className="size-3" />
        )}
      </span>
      <div className="relative z-10 flex items-center gap-1 p-2 text-white">
        <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="min-w-0">
          <div className="text-sm font-semibold tnum leading-none">{fmt(post.views)} views</div>
          <div className="truncate text-[10px] text-white/70">@{post.account}</div>
        </div>
      </div>
    </Link>
  );
}

/**
 * `platform` is the Analytics page's own selector, passed down rather than
 * duplicated: two platform switchers on one screen that disagreed would be
 * worse than none (Garreth 2026-09-06).
 */
export function TopPostsCard({
  className,
  platform = "all",
}: {
  className?: string;
  platform?: "all" | "tiktok" | "instagram";
}) {
  const [range, setRange] = useState<Range>("week");
  const [posts, setPosts] = useState<TopPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    setError(null);
    fetch(`/api/top-posts?range=${range}&platform=${platform}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        setPosts(d.posts ?? []);
      })
      .catch(() => !cancelled && setError("Couldn't load top posts"));
    return () => {
      cancelled = true;
    };
  }, [range, platform]);

  return (
    <DashCard
      title={
        platform === "tiktok"
          ? "Top Posts · TikTok"
          : platform === "instagram"
            ? "Top Posts · Instagram"
            : "Top Posts"
      }
      className={className}
      toolbar={
        <FilterPills
          value={range}
          onChange={setRange}
          options={[
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
            { value: "all", label: "All Time" },
          ]}
        />
      }
      actions={
        <Link
          href={`/analytics/analysis?range=${range}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <BarChart3 className="size-3.5" />
          View analysis
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-text-muted">{error}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {posts === null
            ? Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-nested" />
              ))
            : posts.length > 0
              ? posts.map((p) => <PostThumb key={p.postId} post={p} />)
              : (
                <p className="col-span-full py-4 text-sm text-text-muted">
                  No posts found for this range.
                </p>
              )}
        </div>
      </div>
    </DashCard>
  );
}
