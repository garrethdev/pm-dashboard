"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { DAY_NAMES, daysOffLabel } from "@/lib/data/work-week-rules";

/** Monday first, the way the week is read here. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/**
 * The day off (Garreth, 2026-10-16): one line and a dropdown, saved on pick
 * (simplified at his request the same day). Nothing is scheduled on it: no
 * posts, no warmups, and the warmup robot rests.
 */
export function WorkWeekCard({ initial }: { initial: number[] }) {
  const router = useRouter();
  const [daysOff, setDaysOff] = useState<number[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(day: number) {
    if (daysOff.length === 1 && daysOff[0] === day) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/work-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysOff: [day] }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; daysOff?: number[] };
      if (!res.ok || !body.daysOff) {
        setError(body.error ?? `Not saved (HTTP ${res.status}).`);
        return;
      }
      setDaysOff(body.daysOff);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashCard title="Day off">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-muted">No posts or warmups are scheduled on</p>
        <Dropdown label={daysOff.length ? daysOffLabel(daysOff) : "No day off"}>
          {(close) => (
            <div role="listbox" aria-label="Day off" className="flex flex-col">
              {WEEK.map((day) => {
                const selected = daysOff.length === 1 && daysOff[0] === day;
                return (
                  <button
                    key={day}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={busy}
                    onClick={() => {
                      close();
                      void pick(day);
                    }}
                    className="flex items-center justify-between gap-6 rounded-[10px] px-2 py-1.5 text-left text-sm hover:bg-card"
                  >
                    {DAY_NAMES[day]}
                    {selected && <Check className="size-3.5 text-accent" />}
                  </button>
                );
              })}
            </div>
          )}
        </Dropdown>
        {busy && <Loader2 className="size-3.5 animate-spin text-text-muted" />}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </DashCard>
  );
}
