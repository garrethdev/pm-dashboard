import Link from "next/link";
import { installHref, RobotUpdatesHeader } from "@/components/dashboard/robot-updates";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Robot } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { getRobotUpdateStatus, versionDay, versionParts } from "@/lib/data/robot-updates";
import { upstreamMessage } from "@/lib/data/upstream-error";

/**
 * Settings -> Robot updates -> Changelog (2026-11-27): what each robot
 * version changed, newest first, in the words published with it. The same
 * notes the cards cut short, in full, with what to do differently afterwards.
 */
export const dynamic = "force-dynamic";

export default async function RobotUpdatesChangelogPage() {
  let status;
  try {
    status = await getRobotUpdateStatus();
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <RobotUpdatesHeader state={{ kind: "none" }} tab="changelog" />
        <Card>
          <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
        </Card>
      </div>
    );
  }
  const { updates, state, installed } = status;

  return (
    <div className="flex flex-col gap-6">
      <RobotUpdatesHeader state={state} tab="changelog" />
      {updates.length === 0 ? (
        <EmptyState icon={Robot}>No robot updates yet.</EmptyState>
      ) : (
        <div className="max-w-3xl overflow-hidden rounded-card border border-border bg-card shadow-card">
          <ol className="divide-y divide-border">
            {updates.map((u) => (
              <li key={u.version} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:gap-8">
                <div className="flex shrink-0 flex-col gap-0.5 sm:w-32">
                  <span className="text-sm font-medium">{versionDay(u.version) ?? u.version}</span>
                  <span className="text-xs text-text-muted tnum">{versionParts(u.version)?.code}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={installHref(u.version)}
                      className="text-base font-semibold leading-snug hover:underline"
                    >
                      {u.label}
                    </Link>
                    {installed.has(u.version) && <StatusPill tone="ok">Installed</StatusPill>}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-text-muted">{u.whatChanged}</p>
                  {u.afterwards && (
                    <p className="text-sm leading-relaxed whitespace-pre-line text-text-muted">
                      <span className="font-medium text-text-primary">From now on: </span>
                      {u.afterwards}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
