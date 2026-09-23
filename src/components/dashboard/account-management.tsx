"use client";

import { useMemo, useState } from "react";
import { DashCard } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Users } from "@/components/ui/icons";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { SearchInput } from "@/components/ui/search-input";
import { DeliveryModeControl } from "@/components/dashboard/delivery-mode-control";
import { MoveBatchDialog } from "@/components/dashboard/move-batch-dialog";
import type { AccountRow } from "@/lib/data/accounts";
import type { MoveCandidate, MoveTarget } from "@/lib/data/move-rules";
import { FLEET_LABEL, fleetOfDeliveryMode, type Fleet } from "@/lib/fleet";
import { cn } from "@/lib/utils";

type FleetFilter = "all" | Fleet;

/**
 * Settings → Account management (Garreth, 2026-09-18).
 *
 * The one place an account is moved between Cloud and Physical. Every live
 * account is listed whatever the top-right switch says, because this is where
 * an account crosses from one fleet to the other; after a move it shows on the
 * other fleet's screens only.
 *
 * SELECTING SEVERAL IS OFF UNTIL ASKED FOR (design ticket P10). A checkbox on
 * every one of thirty-odd cards would be permanent clutter on a screen whose
 * everyday job is moving one account, and the batch is for the handful of days
 * a box of phones arrives. So "Select" turns it on, and the toolbar becomes
 * the batch bar while it is.
 *
 * "By character", which is how P10 describes the batch, needs no new control:
 * the search already matches the character, so typing "Character 3" and
 * pressing Select all is exactly that.
 */
export function AccountManagement({
  rows,
  phones,
  demo = false,
}: {
  rows: AccountRow[];
  /** Every phone with how full it is. Empty until a real one is registered. */
  phones: MoveTarget[];
  /** True on `?demo=1`: the phones are invented and nothing may be saved. */
  demo?: boolean;
}) {
  const [filter, setFilter] = useState<FleetFilter>("all");
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);

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

  // Only Cloud accounts can be moved ONTO a phone, so only they can be picked.
  // A Physical one in the list is not offered a checkbox rather than being
  // hidden: it is still the row you would press to move it back.
  const selectable = useMemo(() => shown.filter((r) => r.deliveryMode === "geelark"), [shown]);
  const pickedRows = useMemo(
    () => rows.filter((r) => picked.has(r.profile)),
    [rows, picked],
  );
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.profile));

  function toggle(profile: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(profile)) next.delete(profile);
      else next.add(profile);
      return next;
    });
  }

  function toggleAll() {
    // Scoped to what the filter and search are showing, which is what makes
    // "by character" work without a character control of its own.
    setPicked((prev) => {
      const next = new Set(prev);
      if (allPicked) selectable.forEach((r) => next.delete(r.profile));
      else selectable.forEach((r) => next.add(r.profile));
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setPicked(new Set());
  }

  const candidates: MoveCandidate[] = pickedRows.map((r) => ({
    profile: r.profile,
    username: r.username,
    character: r.character,
  }));

  /** The phone an account is on now, named from the list rather than carried
   *  on the row: `AccountRow` holds the id, and this screen already has the
   *  phones it belongs to. */
  const phoneName = (deviceId: number | null) =>
    deviceId === null ? null : (phones.find((p) => p.id === deviceId)?.name ?? null);

  return (
    <>
      <DashCard
        title="Account management"
        toolbar={
          selecting ? (
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={toggleAll}
                disabled={selectable.length === 0}
                className="rounded-nested border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-50"
              >
                {allPicked ? "Clear all" : `Select all ${selectable.length}`}
              </button>
              <span className="text-xs text-text-muted">{picked.size} selected</span>
            </div>
          ) : (
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
          )
        }
        actions={
          selecting ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopSelecting}
                className="rounded-nested border border-border px-3 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              {/* The app's own primary action, the same one "Add phone" uses
                  on the Devices page (Garreth, 2026-09-22: "just make it the
                  same text as similar buttons we have"). It carries the
                  weight and the per-theme text colour itself, so there is
                  nothing to set here — the hand-rolled version had neither
                  right. It appears once, and only while selecting, which is
                  what CtaButton asks of its callers. */}
              <CtaButton onClick={() => setBatchOpen(true)} disabled={picked.size === 0}>
                Move onto phones
              </CtaButton>
            </div>
          ) : (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search profile, username, character…"
                className="w-full sm:w-72"
              />
              <button
                type="button"
                onClick={() => setSelecting(true)}
                className="shrink-0 rounded-nested border border-border px-3 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                Select
              </button>
            </div>
          )
        }
      >
        {shown.length === 0 ? (
          <EmptyState icon={Users}>No accounts match</EmptyState>
        ) : (
          // Four across on a desktop so the whole fleet fits on one screen
          // (Garreth, 2026-09-18); two on a tablet, one on a phone.
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {shown.map((r) => {
              const canPick = selecting && r.deliveryMode === "geelark";
              const isPicked = picked.has(r.profile);
              const who = (
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
              );
              return (
                <li
                  key={r.profile}
                  className={cn(
                    "relative flex items-center gap-3 rounded-nested border px-3 py-2.5",
                    isPicked
                      ? "border-accent/60 bg-accent/5"
                      : "border-border bg-card-raised/40",
                    selecting && !canPick && "opacity-50",
                  )}
                >
                  {selecting ? (
                    // The whole card ticks the box, not only the 16px square
                    // (P13 B2-2): the label's ::after is stretched over the
                    // card, under the move pill, which stays its own button.
                    <label
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 after:absolute after:inset-0 after:rounded-nested after:content-['']",
                        canPick && "cursor-pointer",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isPicked}
                        disabled={!canPick}
                        onChange={() => toggle(r.profile)}
                        aria-label={`Select ${r.profile}`}
                        className="size-4 shrink-0 accent-accent"
                      />
                      {who}
                    </label>
                  ) : (
                    who
                  )}
                  {/* The per-account move stays put while selecting, so the
                      screen does not become a different screen. */}
                  <DeliveryModeControl
                    profile={r.profile}
                    mode={r.deliveryMode}
                    editable
                    phones={phones}
                    currentPhone={phoneName(r.deviceId)}
                    demo={demo}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </DashCard>

      {batchOpen && candidates.length > 0 && (
        <MoveBatchDialog
          accounts={candidates}
          phones={phones}
          demo={demo}
          onClose={() => setBatchOpen(false)}
          onDone={() => {
            setBatchOpen(false);
            stopSelecting();
          }}
        />
      )}
    </>
  );
}
