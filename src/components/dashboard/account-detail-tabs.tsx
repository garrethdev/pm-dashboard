"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Switches the panel under the profile header between what the automation did
 * and how the account is performing.
 *
 * Both panels are rendered on the server and passed in, so switching is instant
 * and neither refetches.
 */
type Tab = "analytics" | "logs";

/** Analytics leads: "how is this account doing" is the question people open an
 *  account to answer, and the automation log is the follow-up when it is doing
 *  badly. */
const TABS: [Tab, string][] = [
  ["analytics", "Account Analytics"],
  ["logs", "Geelark Automation Logs"],
];

export function AccountDetailTabs({
  logs,
  analytics,
  className,
}: {
  logs: React.ReactNode;
  analytics: React.ReactNode;
  /** Spacing belongs to the page that places this, not to the tabs. */
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>("analytics");
  // Which panels have ever been shown. A chart must not first mount inside a
  // hidden element: ResponsiveContainer measures its parent, and a parent with
  // display:none is 0x0, so the chart can come up with no size. recharts 3 uses
  // a ResizeObserver and would probably recover, but "probably" is a poor
  // reason to render a chart nobody has asked for yet.
  const [seen, setSeen] = useState<Set<Tab>>(new Set(["analytics"]));

  const show = (key: Tab) => {
    setTab(key);
    setSeen((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  return (
    // gap-6, not gap-3: the tab row is a section boundary, and at 12px the
    // panel underneath looked attached to the tab rather than under it.
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Underline tabs over a full-width rule, so the row reads as a section
          heading rather than a control floating above the content. */}
      <div role="tablist" aria-label="Account detail" className="flex gap-6 border-b border-border">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => show(key)}
            className={cn(
              // -mb-px pulls the underline onto the container's rule so the two
              // sit on the same line instead of stacking.
              "-mb-px border-b-2 px-0.5 pb-2.5 text-sm whitespace-nowrap transition-colors",
              tab === key
                ? "border-text-primary font-semibold text-text-primary"
                : "border-transparent font-medium text-text-muted hover:text-text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mounted on first use, then kept mounted and merely hidden, so the
          range you picked survives flipping back and forth. */}
      <div hidden={tab !== "analytics"}>{analytics}</div>
      {seen.has("logs") && <div hidden={tab !== "logs"}>{logs}</div>}
    </div>
  );
}
