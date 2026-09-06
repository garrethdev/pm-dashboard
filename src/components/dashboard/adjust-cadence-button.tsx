"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AdjustCadenceModal } from "@/components/dashboard/adjust-cadence-modal";
import type { CadenceData } from "@/lib/data/cadence";
import type { FleetDefaults } from "@/lib/data/scheduler-config";

/** The page-header entry point to the fleet cadence editor. Split from the
 *  modal so the page can server-render its data and keep the dialog closed. */
export function AdjustCadenceButton({
  cadence,
  fleet,
}: {
  cadence: CadenceData;
  fleet: FleetDefaults;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary"
      >
        <SlidersHorizontal className="size-3.5" />
        Adjust Cadence
      </button>
      {open && (
        <AdjustCadenceModal cadence={cadence} fleet={fleet} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
