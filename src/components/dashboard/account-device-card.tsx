import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Smartphone } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { getDeviceForProfile } from "@/lib/data/devices";

/**
 * Which physical phone an account lives on, linking to that phone (PF-02).
 *
 * Self-contained on purpose: it does its own small read rather than widening
 * the account-detail payload, so the account page only needs one line to show
 * it. Renders nothing for an account that is not on a phone — which is every
 * Geelark account — and nothing if the read fails, because a missing shortcut
 * is not worth an error on a page about something else.
 */
async function AccountDeviceLink({ profile }: { profile: string }) {
  let device;
  try {
    ({ data: device } = await getDeviceForProfile(profile));
  } catch {
    return null;
  }
  if (!device) return null;

  return (
    <Link
      href={`/devices/${device.id}` as never}
      className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-card px-5 py-3.5 shadow-card transition-colors hover:border-text-muted/50 sm:w-fit sm:min-w-72"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pill-bg text-text-muted">
          <Smartphone className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-xs leading-4 text-text-muted">Phone</span>
          <span className="truncate text-sm leading-5 font-bold">{device.name}</span>
        </span>
        {!device.isActive && <StatusPill tone="neutral">Off</StatusPill>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-muted" />
    </Link>
  );
}

export function AccountDeviceCard({ profile }: { profile: string }) {
  return (
    <Suspense fallback={null}>
      <AccountDeviceLink profile={profile} />
    </Suspense>
  );
}
