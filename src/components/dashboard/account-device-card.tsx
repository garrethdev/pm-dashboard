import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Smartphone } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { AccountWarmupToday } from "@/components/dashboard/account-warmup-today";
import { AutomatedWarmupToday } from "@/components/dashboard/automated-warmups";
import { ACCOUNT_ID_COL, type AccountId } from "@/lib/data/account-id";
import { sbRest } from "@/lib/data/supabase";
import { getDeviceForProfile } from "@/lib/data/devices";
import { warmupItemsFor } from "@/lib/data/todo";
import { getSessionsToday, progressToday } from "@/lib/data/warmup-sessions";
import { getAutomatedOverdue, getRunsOnDay } from "@/lib/data/warmup-runs";
import { DAY_NAMES, getDaysOff, isDayOff, weekdayOf } from "@/lib/data/work-week";

/**
 * Which physical phone an account lives on, linking to that phone (PF-02), and
 * — since PF-04 — how today's two warmups stand, with a form to log one. An
 * Automated account shows the same two warmups to read instead (PF-13).
 *
 * Self-contained on purpose: it does its own small reads rather than widening
 * the account-detail payload, so the account page only needs one line to show
 * it. Renders nothing for an account that is not on a phone — which is every
 * Geelark account — and nothing if a read fails, because a missing shortcut is
 * not worth an error on a page about something else.
 */
async function AccountDeviceLink({ profile }: { profile: string }) {
  let device;
  try {
    ({ data: device } = await getDeviceForProfile(profile));
  } catch {
    return null;
  }
  if (!device) return null;

  // The account's own row id, which is what a warmup session points at.
  // `geelark_profile` is what this page is addressed by; the two are one row.
  let accountId: AccountId | null = null;
  let automated = false;
  try {
    const rows = await sbRest<{ id: AccountId; warmup_mode: string | null }[]>(
      `accounts?select=${ACCOUNT_ID_COL},warmup_mode&geelark_profile=eq.${encodeURIComponent(profile)}&limit=1`,
    );
    accountId = rows[0]?.id ?? null;
    automated = rows[0]?.warmup_mode === "script";
  } catch {
    accountId = null;
  }

  const now = new Date();
  const sessions = accountId ? await getSessionsToday({ accountId }, now).catch(() => []) : [];
  const progress = accountId ? progressToday(sessions) : null;

  // An Automated account has nothing for a person to log (PF-13 part 3): its
  // two warmups are shown to read, with the script's own state on each. None
  // on a day off (2026-10-16): the robot is given no accounts that day.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const dayOff = isDayOff(day, await getDaysOff()) ? DAY_NAMES[weekdayOf(day)] : null;
  const scripted =
    accountId && automated
      ? {
          items: dayOff
            ? []
            : warmupItemsFor(
                { id: accountId, warmup_mode: "script" },
                sessions,
                await getRunsOnDay(0, now, { accountId }).catch(() => []),
                day,
                now,
              ),
          overdueDays:
            (await getAutomatedOverdue([accountId], now).catch(() => new Map<AccountId, number>())).get(
              accountId,
            ) ?? null,
        }
      : null;

  return (
    // Side by side from `sm:` up, each card its own width (Garreth, 2026-10-23);
    // stacked on a phone.
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
      <Link
        href={`/devices/${device.id}` as never}
        className="flex w-full items-center justify-between gap-3 rounded-card sm:w-72 border border-border bg-card px-5 py-3.5 shadow-card transition-colors hover:border-text-muted/50"
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

      {scripted && (
        <div className="w-full sm:w-72">
          <AutomatedWarmupToday items={scripted.items} overdueDays={scripted.overdueDays} dayOff={dayOff} />
        </div>
      )}

      {!scripted && accountId !== null && progress && (
        <div className="w-full sm:w-72">
          <AccountWarmupToday
            accountId={accountId}
            deviceId={device.id}
            handle={profile}
            deviceName={device.name}
            progress={progress}
          />
        </div>
      )}
    </div>
  );
}

export function AccountDeviceCard({ profile }: { profile: string }) {
  return (
    <Suspense fallback={null}>
      <AccountDeviceLink profile={profile} />
    </Suspense>
  );
}
