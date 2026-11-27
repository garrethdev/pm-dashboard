import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { ArrowLeft, ChevronRight, Download, Robot } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import {
  fileSize,
  getCachedAirState,
  versionDay,
  versionParts,
  type AirState,
  type RobotUpdate,
} from "@/lib/data/robot-updates";

/**
 * The pieces the Robot updates pages share (2026-11-27; redesigned the same
 * day at the requester's ask: vertical cards, the Air's state as one pill by
 * the title, Updates and Changelog as two tabs).
 */

/** "27 November · eedde13", or the raw text for anything that is not a package name. */
export function versionName(version: string): string {
  const p = versionParts(version);
  return p ? `${versionDay(version)} · ${p.code}` : version;
}

export function AirStatusPill({ state }: { state: AirState }) {
  if (state.kind === "current") return <StatusPill tone="ok">Up to date</StatusPill>;
  if (state.kind === "behind") return <StatusPill tone="warn">Update waiting</StatusPill>;
  if (state.kind === "unknown") return <StatusPill tone="gray">Not reported yet</StatusPill>;
  return null;
}

export function installHref(version: string): string {
  return `/settings/robot-updates/${encodeURIComponent(version)}`;
}

function downloadHref(version: string): string {
  return `/api/robot-updates/${encodeURIComponent(version)}/download`;
}

/** Switched off once the version is installed: downloading it again could
 *  only take the robot backwards. */
export function DownloadButton({
  version,
  installed,
  className,
}: {
  version: string;
  installed: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <Download className="size-4" />
      Download
    </>
  );
  return installed ? (
    <CtaButton disabled className={className}>
      {inner}
    </CtaButton>
  ) : (
    <CtaButton href={downloadHref(version)} className={className}>
      {inner}
    </CtaButton>
  );
}

/** A round back button, sat to the left of a page title. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-text-muted transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-4" />
    </Link>
  );
}

/** Back button, title, the Air's state, and the Updates / Changelog switch. */
export function RobotUpdatesHeader({ state, tab }: { state: AirState; tab: "updates" | "changelog" }) {
  const tabs = [
    { key: "updates", label: "Updates", href: "/settings/robot-updates" },
    { key: "changelog", label: "Changelog", href: "/settings/robot-updates/changelog" },
  ] as const;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <BackButton href="/settings" label="Back to Settings" />
        <h1 className="text-xl font-semibold">Robot updates</h1>
        <AirStatusPill state={state} />
      </div>
      <nav className="flex w-fit items-center gap-0.5 rounded-full bg-card-raised p-0.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
              tab === t.key ? "bg-accent text-bg" : "text-text-muted hover:text-text-primary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** One version as a vertical card: what it is, then Download across the
 *  bottom and "How to install" under it. */
export function UpdateCard({
  update,
  newest,
  installed,
}: {
  update: RobotUpdate;
  newest: boolean;
  installed: boolean;
}) {
  return (
    <Card glass={newest} className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {newest && <StatusPill tone="accent">Newest</StatusPill>}
          {installed && <StatusPill tone="ok">Installed</StatusPill>}
        </div>
        <span className="shrink-0 text-xs text-text-muted tnum">
          {versionDay(update.version) ?? update.version} · {fileSize(update.fileBytes)}
        </span>
      </div>
      <h2 className="text-base font-semibold leading-snug">{update.label}</h2>
      <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-text-muted">{update.whatChanged}</p>
      <div className="flex flex-col items-stretch gap-2.5">
        <DownloadButton version={update.version} installed={installed} className="w-full" />
        <Link
          href={installHref(update.version)}
          className="self-center text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          How to install
        </Link>
      </div>
    </Card>
  );
}

/**
 * The Robot updates row on the Settings page: where the pages are reached
 * from, with the Air's state beside it so a waiting update shows there too.
 */
export async function RobotUpdatesEntry() {
  const state = await getCachedAirState();
  return (
    <Link
      href="/settings/robot-updates"
      className="flex items-center gap-4 rounded-card border border-border bg-card p-5 shadow-card transition-colors hover:border-accent/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Robot className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">Robot updates</span>
        <span className="text-sm text-text-muted">
          {state.kind === "none" ? "No versions yet" : `Newest: ${state.latest.label}`}
        </span>
      </span>
      <AirStatusPill state={state} />
      <ChevronRight className="size-4 shrink-0 text-text-muted" />
    </Link>
  );
}

/**
 * The strip across the top of every dashboard page while the Air is behind
 * the newest robot version. Goes by itself once a warmup report shows the new
 * version. Shows nothing on a failed read.
 */
export async function RobotUpdateBanner() {
  const state = await getCachedAirState();
  if (state.kind !== "behind") return null;
  return (
    <Link
      href={installHref(state.latest.version)}
      className="mb-4 flex items-center gap-3 rounded-nested border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn transition-colors hover:bg-warn/15"
    >
      <Robot className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">Robot update waiting:</span> {state.latest.label}
      </span>
      <span className="shrink-0 font-medium">How to install</span>
      <ChevronRight className="size-4 shrink-0" />
    </Link>
  );
}
