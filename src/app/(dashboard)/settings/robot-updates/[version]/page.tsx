import Link from "next/link";
import { notFound } from "next/navigation";
import { AirStatusPill, BackButton, DownloadButton, installHref, versionName } from "@/components/dashboard/robot-updates";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { airState, getAirVersion, getRobotUpdates, installedVersions } from "@/lib/data/robot-updates";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { installSteps, ROBOT_HOURS_MANILA } from "@/lib/robot-update-steps";

/**
 * "How to install" for one robot version (2026-11-27). Replaces the Word
 * guide that went to Yurie with each update: the same steps every time, the
 * version's own steps in the middle, and the words the window shows when it
 * worked. Redesigned the same day for a clearer order of reading: one list,
 * a short action per step with the how under it, nothing else on the page
 * but what to do if it goes wrong. What changed is on the Changelog tab.
 */
export const dynamic = "force-dynamic";

export default async function RobotUpdateInstallPage({ params }: { params: Promise<{ version: string }> }) {
  const { version: raw } = await params;
  const version = decodeURIComponent(raw);

  let updates, air;
  try {
    [updates, air] = await Promise.all([getRobotUpdates(), getAirVersion()]);
  } catch (err) {
    return (
      <Shell>
        <Card>
          <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
        </Card>
      </Shell>
    );
  }
  const update = updates.find((u) => u.version === version);
  if (!update) notFound();

  const newest = updates[0]!;
  const isNewest = newest.version === update.version;
  const installed = installedVersions(updates, air).has(update.version);
  const steps = installSteps(update.version, update.extraSteps);

  return (
    <Shell>
      <div className="flex items-start gap-3">
        <BackButton href="/settings/robot-updates" label="Back to Robot updates" />
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">{update.label}</h1>
            {installed ? (
              <StatusPill tone="ok">Installed</StatusPill>
            ) : (
              isNewest && <AirStatusPill state={airState(updates, air)} />
            )}
          </div>
          <p className="text-sm text-text-muted tnum">{versionName(update.version)}</p>
        </div>
      </div>

      {!isNewest && !installed && (
        <p className="rounded-nested bg-warn/10 px-4 py-2.5 text-sm text-warn">
          A newer version is out.{" "}
          <Link href={installHref(newest.version)} className="font-medium underline">
            Install {newest.label}
          </Link>{" "}
          instead.
        </p>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <p className="border-b border-border px-6 py-3.5 text-sm text-text-muted">
          Outside the robot&apos;s hours: <span className="text-text-primary">{ROBOT_HOURS_MANILA}</span>, Manila time
        </p>
        <ol className="divide-y divide-border">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-4 px-6 py-5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent tnum">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                <p className={s.extra ? "text-sm leading-relaxed" : "text-[15px] font-medium leading-snug"}>{s.do}</p>
                {s.how && <p className="text-sm leading-relaxed text-text-muted">{s.how}</p>}
                {s.download && (
                  <div className="pt-2">
                    <DownloadButton version={update.version} installed={installed} />
                  </div>
                )}
                {s.expect && (
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    <span className="text-xs text-text-muted">You should see</span>
                    <div className="flex flex-col gap-0.5 rounded-nested bg-card-sunken px-3.5 py-2.5 text-[13px] font-medium">
                      {s.expect.map((line) => (
                        <span key={line} className="break-all">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-1.5 px-1 text-sm text-text-muted">
        <p>
          <span className="font-medium text-text-primary">Window says STOPPED?</span> Send Czedrick a photo and stop
          there.
        </p>
        <p>
          <span className="font-medium text-text-primary">Start the robot says an update is waiting?</span> Do step 3
          again.
        </p>
      </div>

      {update.afterwards && (
        <section className="flex flex-col gap-1.5 px-1">
          <h2 className="text-sm font-semibold">From now on</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-text-muted">{update.afterwards}</p>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex max-w-2xl flex-col gap-6">{children}</div>;
}
