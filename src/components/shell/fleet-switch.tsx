"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Smartphone } from "@/components/ui/icons";
import { FLEET_LABEL, type Fleet } from "@/lib/fleet";
import { cn } from "@/lib/utils";

const FLEETS: Fleet[] = ["cloud", "physical"];

// Icons rather than words (Garreth, 2026-09-18): a cloud and a phone. The name
// is still there for a screen reader and on hover.
const FLEET_ICON = { cloud: Cloud, physical: Smartphone } as const;

/**
 * Cloud | Physical, beside the person's name (Garreth, 2026-09-18).
 *
 * Always on screen so it is never a mystery which fleet a page is showing: an
 * account moved to a real phone disappears from the Cloud screens, and without
 * this in view that reads as the account being gone.
 *
 * Per person: a cookie set by /api/fleet, so Yurie working in Physical never changes what anyone
 * else sees. The active side is raised glass, not the accent; the accent stays
 * with the one action on the page, the same rule the sidebar follows.
 */
export function FleetSwitch({ fleet }: { fleet: Fleet }) {
  const router = useRouter();
  // Shown immediately on press; the server's answer arrives with the refresh.
  const [shown, setShown] = useState<Fleet>(fleet);
  const [pending, startTransition] = useTransition();

  function choose(next: Fleet) {
    if (next === shown) return;
    const before = shown;
    setShown(next);
    fetch("/api/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fleet: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("not saved");
        startTransition(() => router.refresh());
      })
      // Not saved means the page still shows the old fleet, so the switch must too.
      .catch(() => setShown(before));
  }

  return (
    <div
      role="group"
      aria-label="Fleet"
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-card p-0.5",
        pending && "opacity-80",
      )}
    >
      {FLEETS.map((f) => {
        const Icon = FLEET_ICON[f];
        return (
          <button
            key={f}
            type="button"
            aria-pressed={shown === f}
            aria-label={FLEET_LABEL[f]}
            title={FLEET_LABEL[f]}
            onClick={() => choose(f)}
            className={cn(
              "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
              shown === f ? "glass text-text-primary" : "text-text-muted hover:text-text-primary",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
