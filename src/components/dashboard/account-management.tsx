"use client";

import { useMemo, useState } from "react";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Users } from "@/components/ui/icons";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { SearchInput } from "@/components/ui/search-input";
import { DeliveryModeControl } from "@/components/dashboard/delivery-mode-control";
import type { AccountRow } from "@/lib/data/accounts";
import { FLEET_LABEL, fleetOfDeliveryMode, type Fleet } from "@/lib/fleet";

type FleetFilter = "all" | Fleet;

/**
 * Settings → Account management (Garreth, 2026-09-18).
 *
 * The one place an account is moved between Cloud and Physical. Every live
 * account is listed whatever the top-right switch says, because this is where
 * an account crosses from one fleet to the other; after a move it shows on the
 * other fleet's screens only.
 */
export function AccountManagement({ rows }: { rows: AccountRow[] }) {
  const [filter, setFilter] = useState<FleetFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const physical = rows.filter((r) => r.deliveryMode === "manual").length;
    return { all: rows.length, cloud: rows.length - physical, physical };
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && fleetOfDeliveryMode(r.deliveryMode) !== filter) return false;
      if (!q) return true;
      return [r.profile, r.username, r.character].join(" ").toLowerCase().includes(q);
    });
  }, [rows, filter, query]);

  return (
    <DashCard
      title="Account management"
      toolbar={
        <FilterPills
          inline
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${counts.all}` },
            { value: "cloud", label: `${FLEET_LABEL.cloud} ${counts.cloud}` },
            { value: "physical", label: `${FLEET_LABEL.physical} ${counts.physical}` },
          ]}
        />
      }
      actions={
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search profile, username, character…"
          className="w-full sm:w-72"
        />
      }
    >
      {shown.length === 0 ? (
        <EmptyState icon={Users}>No accounts match</EmptyState>
      ) : (
        // Four across on a desktop so the whole fleet fits on one screen
        // (Garreth, 2026-09-18); two on a tablet, one on a phone.
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((r) => (
            <li
              key={r.profile}
              className="flex items-center gap-3 rounded-nested border border-border bg-card-raised/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.profile}</span>
                  <span className="shrink-0 text-xs text-text-muted">
                    {r.character.replace("Character ", "Char ")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <PlatformIcon platform={r.platform} className="size-3 shrink-0" />
                  <span className="truncate">{r.username ?? "—"}</span>
                </div>
              </div>
              <DeliveryModeControl profile={r.profile} mode={r.deliveryMode} editable />
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}
