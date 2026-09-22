import Link from "next/link";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Smartphone } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
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
 * The `try` guards the read only — see the note in accounts/page.tsx.
 */
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

  return (
    <DashCard title="Devices" viewAllHref="/devices" className={className}>
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
