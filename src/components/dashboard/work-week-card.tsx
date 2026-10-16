"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "@/components/ui/icons";
import { CtaButton } from "@/components/ui/cta-button";
import { DashCard } from "@/components/ui/card";
import { DAY_NAMES, daysOffLabel, workingDaysPerWeek } from "@/lib/data/work-week-rules";
import { cn } from "@/lib/utils";

/** Monday first, the way the week is read here. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/**
 * The days off (Garreth, 2026-10-16): pick the days nothing is scheduled.
 *
 * One setting for everything: the Smart Scheduler plans no posts on them, the
 * To-do list asks for nothing, and the warmup robot is given no accounts. A
 * press marks a day off or back on; nothing changes until Save.
 */
export function WorkWeekCard({ initial }: { initial: number[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState<number[]>(initial);
  const [picked, setPicked] = useState<number[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);

  const dirty = [...picked].sort().join() !== [...saved].sort().join();
  const noneLeft = picked.length >= 7;

  function toggle(day: number) {
    setMessage(null);
    setPicked((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/work-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysOff: picked }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; daysOff?: number[] };
      if (!res.ok || !body.daysOff) {
        setMessage({ tone: "danger", text: body.error ?? `Saving failed (HTTP ${res.status}).` });
        return;
      }
      setSaved(body.daysOff);
      setPicked(body.daysOff);
      setMessage({ tone: "ok", text: "Saved." });
      router.refresh();
    } catch {
      setMessage({ tone: "danger", text: "Couldn't reach the server. Nothing was saved." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashCard title="Days off">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          Nothing is scheduled on a day off: no warmups, no posts, and the warmup robot rests. Anything
          left over from the day before comes back on the next working day. Days are New York days.
        </p>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days off">
          {WEEK.map((day) => {
            const off = picked.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={off}
                onClick={() => toggle(day)}
                disabled={busy}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  off
                    ? "bg-accent text-bg"
                    : "bg-card-raised text-text-muted hover:text-text-primary",
                )}
              >
                {DAY_NAMES[day]}
              </button>
            );
          })}
        </div>

        <p className="text-sm">
          {noneLeft ? (
            <span className="text-danger">At least one day has to be a working day.</span>
          ) : picked.length === 0 ? (
            <>Every day is a working day.</>
          ) : (
            <>
              Day off: <span className="font-medium">{daysOffLabel(picked)}</span>. Accounts post and
              warm up {workingDaysPerWeek(picked)} days a week, so 1 post a day allows{" "}
              {workingDaysPerWeek(picked)} a week.
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <CtaButton onClick={save} disabled={!dirty || noneLeft || busy}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save days off
          </CtaButton>
          {message && (
            <span className={cn("text-xs", message.tone === "danger" ? "text-danger" : "text-text-muted")}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </DashCard>
  );
}
