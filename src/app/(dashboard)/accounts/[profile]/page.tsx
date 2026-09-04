import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { AccountTaskLog } from "@/components/dashboard/account-task-log";
import { getAccountDetail } from "@/lib/data/account-detail";
import { healthTone } from "@/lib/health";
import { formatEtDate } from "@/lib/data/format";

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
    { label: "Avg views (7d)", value: num(data.avgViews7d) },
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
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- CDN host isn't in next.config images
              <img
                src={data.avatarUrl}
                alt=""
                className="size-20 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-card-raised text-2xl font-semibold text-text-muted">
                {(data.username ?? data.profile).slice(0, 1).toUpperCase()}
              </span>
            )}

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center gap-[13px]">
                <h1 className="font-display text-2xl leading-[30px] font-bold text-text-primary">
                  {data.displayName ?? data.profile}
                </h1>
                {/* Platform now reads as a badge on the name, replacing the
                    labelled pill that used to sit on the far right. */}
                <span
                  title={isIg ? "Instagram" : "TikTok"}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white"
                >
                  {isIg ? (
                    <InstagramIcon className="size-[15px] text-[#E4405F]" />
                  ) : (
                    <TikTokIcon className="size-[15px] text-black" />
                  )}
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

          <div className="flex flex-col gap-3">
            <Meta label="Character">{data.character ?? "—"}</Meta>
            <Meta label="Created">
              {data.accountCreatedOn ? formatEtDate(data.accountCreatedOn) : "—"}
            </Meta>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-1 flex-nowrap items-stretch justify-end gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex min-w-[104px] flex-1 basis-[156px] flex-col items-center justify-center gap-[13px] rounded-nested border border-border bg-card-raised px-[15px] py-[11px] xl:max-w-[156px]"
            >
              <span className="text-xs leading-4 text-text-muted">{s.label}</span>
              <span className="font-display text-xl leading-5 font-semibold tnum text-text-primary">
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <AccountTaskLog executed={data.tasks} pending={data.pendingTasks} />
    </div>
  );
}
