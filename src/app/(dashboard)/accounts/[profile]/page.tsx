import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { AccountAnalyticsView } from "@/components/dashboard/account-analytics-view";
import { AccountDetailTabs } from "@/components/dashboard/account-detail-tabs";
import { AccountDeviceCard } from "@/components/dashboard/account-device-card";
import { AccountTaskLog } from "@/components/dashboard/account-task-log";
import { getAccountAnalytics } from "@/lib/data/account-analytics";
import { getAccountDetail } from "@/lib/data/account-detail";
import { healthTone } from "@/lib/health";
import { formatEtDate } from "@/lib/data/format";
import { PLATFORM_LABEL, type Platform, hasAnalytics } from "@/lib/platform";

/** Route is /accounts/20 — the bare profile number, not "Profile%2020". */
function toProfileName(slug: string): string {
  const digits = slug.replace(/\D+/g, "");
  return digits ? `Profile ${digits}` : decodeURIComponent(slug);
}

const num = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-US");

/** Right-hand metadata row: small label above its value. */
function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-xs leading-4 text-text-muted">{label}</span>
      <div className="text-sm leading-5 font-bold text-text-primary whitespace-nowrap">
        {children}
      </div>
    </div>
  );
}

/** Mirrors the panel's own layout so nothing jumps when it lands — and carries
 *  no title, because the panel it stands in for has none either. */
function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-7 w-72" />
      <div className="grid gap-3 xl:grid-cols-5">
        <div className="grid grid-cols-2 gap-3 xl:col-span-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[106px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[248px] w-full xl:col-span-3" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  );
}

/**
 * Streamed rather than awaited in the page body.
 *
 * The first view of an account resolves five thumbnails through oEmbed —
 * ~3.5s — and every one after that is ~80ms from the post_thumbnails cache.
 * Blocking on it held back the automation log too, which is what most people
 * open an account for. Fetch inside the try, build JSX outside it: JSX returned
 * from a try block is not rendered there, so a render-time error would escape
 * the catch anyway and the guard would be a lie.
 */
async function AnalyticsPanel({
  username,
  platform,
}: {
  username: string | null;
  platform: Platform;
}) {
  // Nothing collects Facebook views yet (PF-08). Say so, rather than look the
  // handle up in the TikTok table and report an account nobody is watching.
  if (!hasAnalytics(platform)) {
    return (
      <p className="text-sm text-text-muted">
        Views are not collected for {PLATFORM_LABEL[platform]} accounts yet.
      </p>
    );
  }
  // Opens on 7 days, matching the fleet Analytics page.
  let analytics;
  try {
    ({ data: analytics } = await getAccountAnalytics(username, platform, "7d"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return <p className="text-sm text-text-muted">Analytics unavailable: {message}</p>;
  }
  return <AccountAnalyticsView initial={analytics} account={username} platform={platform} />;
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  const { data } = await getAccountDetail(toProfileName(profile));
  if (!data) notFound();


  const isIg = data.platform === "instagram";

  const stats: { label: string; value: string }[] = [
    // Reads v_account_health_v3.median_7d_r — a MEDIAN. It was labelled "Avg
    // views" for months, which is a different statistic and a materially
    // different number on a feed with one viral post in it.
    { label: "Median views (7d)", value: num(data.medianViews7d) },
    { label: "Highest views", value: num(data.highestViews) },
    { label: "Total views", value: num(data.totalViews) },
    { label: "Followers", value: num(data.followers) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/accounts"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-3.5" /> All accounts
      </Link>

      {/* Header — ported from Figma node 2:160. Identity + platform badge,
          divider, Character/Created, then four stat cards on the right. */}
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-[18px]">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <Avatar src={data.avatarUrl} className="size-20" />

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center gap-[13px]">
                <h1 className="font-display text-2xl leading-[30px] font-bold text-text-primary">
                  {data.displayName ?? data.profile}
                </h1>
                {/* Platform now reads as a badge on the name, replacing the
                    labelled pill that used to sit on the far right. */}
                <span
                  title={PLATFORM_LABEL[data.platform]}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white"
                >
                  {/* Facebook takes the same black as TikTok: no new brand colour. */}
                  <PlatformIcon
                    platform={data.platform}
                    className={isIg ? "size-[15px] text-[#E4405F]" : "size-[15px] text-black"}
                  />
                </span>
              </div>

              {data.profileUrl ? (
                <a
                  href={data.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-sm leading-5 text-accent hover:opacity-80"
                >
                  @{data.username}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span className="text-sm text-text-muted">no username on file</span>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-xs leading-4 text-text-muted">{data.profile}</span>
                <StatusPill tone={healthTone(data.health)}>{data.health}</StatusPill>
                {data.paused && <StatusPill tone="warn">paused</StatusPill>}
                {!data.isActive && <StatusPill tone="neutral">retired</StatusPill>}
              </div>
            </div>
          </div>

          <div className="hidden h-[91px] w-px shrink-0 bg-border sm:block" />

          {/* Side by side on a phone: stacked, two short pairs took four lines
              of vertical space and pushed the stats below the fold. The desktop
              header is a wide row, so there they stay stacked. */}
          <div className="flex flex-row gap-8 sm:flex-col sm:gap-3">
            <Meta label="Character">{data.character ?? "—"}</Meta>
            <Meta label="Created">
              {data.accountCreatedOn ? formatEtDate(data.accountCreatedOn) : "—"}
            </Meta>
          </div>
        </div>

        {/* Stats */}
        {/* Two-up on a phone. Four across cannot work here: at 375px each card
            would be ~70px, and "19,254" alone is wider than that. A 2x2 grid
            fills the same width and stays readable. From `sm:` up it is the
            single flexible row it has always been. */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-1 sm:flex-nowrap sm:items-stretch sm:justify-end">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center justify-center gap-[13px] rounded-nested border border-border bg-card-raised px-[15px] py-[11px] sm:min-w-[104px] sm:flex-1 sm:basis-[156px] xl:max-w-[156px]"
            >
              <span className="text-center text-xs leading-4 text-text-muted">{s.label}</span>
              <span className="font-display text-xl leading-5 font-semibold tnum text-text-primary">
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <AccountDeviceCard profile={data.profile} />

      {/* mt-6 on top of the column's gap-3 — the tab row starts a new section,
          and at 12px it read as another row of the header card. */}
      <AccountDetailTabs
        className="mt-6"
        logs={<AccountTaskLog executed={data.tasks} pending={data.pendingTasks} />}
        analytics={
          <Suspense fallback={<AnalyticsSkeleton />}>
            <AnalyticsPanel username={data.username} platform={data.platform} />
          </Suspense>
        }
      />
    </div>
  );
}
