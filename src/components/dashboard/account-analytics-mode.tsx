"use client";

import { useState } from "react";
import { AccountAnalyticsView } from "@/components/dashboard/account-analytics-view";
import { AccountDeepView } from "@/components/dashboard/account-deep-view";
import { FilterPills } from "@/components/ui/filter-pills";
import type { AccountAnalytics } from "@/lib/data/account-analytics";
import type { AccountDeep } from "@/lib/data/account-deep";
import type { AnalyticsPlatform } from "@/lib/platform";

type Mode = "overview" | "deep";

/**
 * The switch on an account's analytics (DA-09; Garreth, 2026-10-23): the
 * usual numbers on one side, the deep ones on the other, same tab, same
 * account. It sits at the right end of each side's own first row, opposite
 * the range pills (Garreth, 2026-10-23). Both sides get their data from the
 * server up front; this only picks which one shows, so switching is instant
 * and nothing is fetched twice.
 */
export function AccountAnalyticsMode({
  analytics,
  account,
  platform,
  deep,
}: {
  analytics: AccountAnalytics;
  account: string | null;
  platform: AnalyticsPlatform;
  deep: AccountDeep | null;
}) {
  const [mode, setMode] = useState<Mode>("overview");
  const modeSwitch = (
    <FilterPills
      inline
      value={mode}
      onChange={setMode}
      options={[
        { value: "overview", label: "Overview" },
        { value: "deep", label: "Deep" },
      ]}
    />
  );
  return (
    <>
      <div hidden={mode !== "overview"}>
        <AccountAnalyticsView initial={analytics} account={account} platform={platform} aside={modeSwitch} />
      </div>
      <div hidden={mode !== "deep"}>
        <AccountDeepView deep={deep} aside={modeSwitch} />
      </div>
    </>
  );
}
