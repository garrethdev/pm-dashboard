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
 * else sees. The active side is a solid fill in the text colour, not the
 * accent; the accent stays with the one action on the page, the same rule the
 * sidebar follows. It was raised glass until P13 (B1-1), which light mode
 * flattens into the track's own colour, so neither side looked chosen.
 */
export function FleetSwitch({ fleet }: { fleet: Fleet }) {
  const router = useRouter();
  // Shown immediately on press; the server's answer arrives with the refresh.
  const [shown, setShown] = useState<Fleet>(fleet);
  /**
   * Follow the fleet when something OTHER than this switch changes it.
   *
   * The switch used to be the only way to change fleets, so reading the prop
   * once was enough. Since PF-20 the bell shows both fleets, and opening an
   * item that belongs to the other one takes the switch with it — which left
   * this reading "Cloud" on a page that was plainly showing Physical. The
   * switch exists so it is never a mystery which fleet a page is showing, so
   * that is the one thing it must not get wrong.
   *
   * Assigning during render rather than in an effect: React re-runs this
   * component immediately with the new state, before anything is painted, so
   * the wrong side is never on screen.
   */
  const [seen, setSeen] = useState<Fleet>(fleet);
  if (seen !== fleet) {
    setSeen(fleet);
    setShown(fleet);
  }
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
          // A 44px target around the 32px half, for a thumb (P13 B1-2). The
          // overhang is taken back by the negative margin, so the switch
          // stays the height of the bell beside it.
          <button
            key={f}
            type="button"
            aria-pressed={shown === f}
            aria-label={FLEET_LABEL[f]}
            title={FLEET_LABEL[f]}
            onClick={() => choose(f)}
            className={cn(
              "-my-1.5 flex h-11 w-14 items-center justify-center",
              shown === f ? "text-bg" : "text-text-muted hover:text-text-primary",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                shown === f && "bg-text-primary",
              )}
            >
              <Icon className="size-4" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
