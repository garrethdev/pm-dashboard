import Link from "next/link";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Smartphone } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { LiveViewLink } from "@/components/dashboard/live-view-link";
import { liveViewUrl } from "@/lib/live-view";
import { getDevices } from "@/lib/data/devices";
import { upstreamMessage } from "@/lib/data/upstream-error";

/**
 * Homepage card for the Physical fleet: the phones in use (Garreth,
 * 2026-09-18). It sits where the GeeLark wallet sits in Cloud, because a wallet
 * for cloud phones means nothing to a fleet of real ones.
 *
 * One row per phone in use: its name, what it is, how many of its three places
 * are taken, and a flag when it still has no whoer proof. Phones switched off
 * are left to the Devices page.
 *
 * Live view (PF-14) opens every phone's screen on the MacBook Air. Shown once
 * there are phones and the Air's address is set; with neither there is nothing
 * to look at.
 *
 * The `try` guards the read only — see the note in accounts/page.tsx.
 */
// The same quiet pill as the card's own "View all".
const LIVE_VIEW_LINK =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted";

export async function DevicesCard({ className }: { className?: string }) {
  let devices;
  try {
    ({ data: devices } = await getDevices());
  } catch (err) {
    return (
      <DashCard title="Devices" viewAllHref="/devices" className={className}>
        <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
      </DashCard>
    );
  }

  const inUse = devices.filter((d) => d.isActive);
  const liveView = liveViewUrl();

  return (
    <DashCard
      title="Devices"
      viewAllHref="/devices"
      headerAction={
        inUse.length > 0 && liveView ? (
          <LiveViewLink base={liveView} className={LIVE_VIEW_LINK} />
        ) : undefined
      }
      className={className}
    >
      {inUse.length === 0 ? (
        <EmptyState icon={Smartphone} compact>
          No phones yet
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border">
          {inUse.map((d) => {
            const about = [d.model, d.iosVersion ? `iOS ${d.iosVersion}` : null, d.timezone]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={d.id}>
                <Link
                  href={`/devices/${d.id}` as never}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:text-text-primary"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-nested bg-card-raised text-text-muted">
                    <Smartphone className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.name}</span>
                    {about && (
                      <span className="block truncate text-xs text-text-muted">{about}</span>
                    )}
                  </span>
                  {!d.proofPath && <StatusPill tone="warn">No proof</StatusPill>}
                  <StatusPill tone="gray" className="tnum">
                    {d.accounts.length}
                  </StatusPill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashCard>
  );
}
