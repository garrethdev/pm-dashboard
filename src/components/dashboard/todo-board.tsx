"use client";

import { useCallback, useMemo, useState } from "react";
import { CtaButton } from "@/components/ui/cta-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { HoldButton } from "@/components/ui/hold-button";
import { Check, Film, ListChecks, X } from "@/components/ui/icons";
import { Stepper } from "@/components/ui/stepper";
import {
  isItemFinished,
  todoPlaceholder,
  type TodoDay,
  type TodoDevice,
  type TodoItem,
  type TodoItemStatus,
  type TodoState,
} from "@/lib/data/todo-placeholder";
import { cn } from "@/lib/utils";

/**
 * Ticking an item off, and the sheet that opens when you do.
 *
 * Garreth, 2026-09-22: the list should work the way a list works — tick the
 * thing you did, and the app then asks for the detail it needs. So the tick is
 * the action on both the dashboard card (P1) and the page (P2), and the sheet
 * behind it is P3's three forms brought forward, because the tick cannot be
 * judged without the thing it opens.
 *
 * Nothing is saved anywhere. The ticks live in this component's own state for
 * the length of the review, so the screens can actually be used; PF-05 and
 * PF-07 are what make them real.
 */

type Override = {
  status: TodoItemStatus;
  doneAt?: string;
  loggedMinutes?: number;
  reason?: string;
};

/** Where a sheet was opened from, so its title can name the account. */
export type SheetTarget = { item: TodoItem; handle: string };

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function applyOverrides(devices: TodoDevice[], overrides: Record<string, Override>): TodoDevice[] {
  if (Object.keys(overrides).length === 0) return devices;
  return devices.map((device) => ({
    ...device,
    accounts: device.accounts.map((account) => ({
      ...account,
      items: account.items.map((item) => {
        const o = overrides[item.id];
        if (!o) return item;
        return {
          ...item,
          status: o.status,
          doneAt: o.doneAt,
          reason: o.reason,
          loggedMinutes: o.loggedMinutes ?? item.loggedMinutes,
        };
      }),
    })),
  }));
}

export function useTodoBoard(state: TodoState, day: TodoDay) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [target, setTarget] = useState<SheetTarget | null>(null);

  const base = todoPlaceholder(state, day);
  const devices = useMemo(() => applyOverrides(base, overrides), [base, overrides]);

  const save = useCallback((id: string, o: Override) => {
    setOverrides((prev) => ({ ...prev, [id]: o }));
    setTarget(null);
  }, []);

  const undo = useCallback((id: string) => {
    setOverrides((prev) => ({ ...prev, [id]: { status: "todo" } }));
    setTarget(null);
  }, []);

  return {
    devices,
    target,
    open: setTarget,
    close: useCallback(() => setTarget(null), []),
    save,
    undo,
  };
}

/**
 * The tick itself. Big enough for a thumb, and it never completes anything on
 * its own — it opens the sheet that asks what happened.
 */
export function TodoCheck({
  item,
  onOpen,
  compact = false,
}: {
  item: TodoItem;
  onOpen: () => void;
  /** For the dashboard card, where the tick shares a 24px gutter with the
   *  phone icon and the platform mark so every line starts at the same x. */
  compact?: boolean;
}) {
  const done = isItemFinished(item);
  const partial = item.status === "postedNoLink";

  // The script's own work. It is shown, but nobody ticks it off by hand.
  if (item.automated) {
    return (
      <span
        aria-label={`${item.label}, ${item.due}, automated`}
        className={cn(
          "flex shrink-0 items-center justify-center",
          compact ? "size-6" : "h-9 w-11",
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-md border border-dashed transition-colors",
            compact ? "size-5" : "size-[22px]",
            done ? "border-accent/50 text-accent/70" : "border-border text-transparent",
          )}
        >
          <Check className={compact ? "size-3" : "size-3.5"} />
        </span>
      </span>
    );
  }

  return (
    <button
      onClick={onOpen}
      role="checkbox"
      aria-checked={done ? "true" : partial ? "mixed" : "false"}
      aria-label={`${item.label}, ${item.due}`}
      className={cn(
        // 44px hit area around a 22px box: a thumb target that does not look
        // like one. The card's version fits the gutter instead.
        "group flex shrink-0 items-center justify-center",
        compact ? "size-6" : "h-9 w-11",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-md border transition-colors",
          compact ? "size-5" : "size-[22px]",
          done
            // Cyan, not green (Garreth, 2026-09-22): a tick is the app's own
            // mark, and it should be the app's own colour.
            ? "border-accent bg-accent/15 text-accent"
            : partial
              ? "border-pill-yellow bg-pill-yellow/15 text-pill-yellow"
              : "border-border text-transparent group-hover:border-text-muted",
        )}
      >
        {partial ? (
          <span className={cn("block rounded-[3px] bg-pill-yellow", compact ? "size-2" : "size-2.5")} />
        ) : (
          <Check className={compact ? "size-3" : "size-3.5"} />
        )}
      </span>
    </button>
  );
}

const FAIL_REASONS = [
  "Account restricted",
  "Upload failed",
  "Video missing",
  "Phone offline",
  "Other",
];

/**
 * The sheet a tick opens: P3's Posted, Failed and Log warmup in one place,
 * because one tick should not make you choose which form you wanted first.
 */
export function TodoLogSheet({
  target,
  onClose,
  onSave,
  onUndo,
}: {
  target: SheetTarget;
  onClose: () => void;
  onSave: (id: string, o: Override) => void;
  onUndo: (id: string) => void;
}) {
  const { item, handle } = target;
  const isPost = item.kind === "post";
  const alreadyDone = isItemFinished(item) || item.status === "failed";

  const [outcome, setOutcome] = useState<"done" | "failed">(
    item.status === "failed" ? "failed" : "done",
  );
  const [link, setLink] = useState("");
  const [reason, setReason] = useState(item.reason ?? FAIL_REASONS[0]);
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState(item.loggedMinutes || item.targetMinutes || 15);

  const targetMinutes = item.targetMinutes ?? 15;

  function submit() {
    if (!isPost) {
      const reached = minutes >= targetMinutes;
      onSave(item.id, {
        // Short of the target it stays open, and says how far it got.
        status: reached ? "logged" : "todo",
        doneAt: reached ? nowHHMM() : undefined,
        loggedMinutes: minutes,
      });
      return;
    }
    if (outcome === "failed") {
      onSave(item.id, { status: "failed", doneAt: nowHHMM(), reason: note.trim() || reason });
      return;
    }
    // The link is optional: saving without it leaves the item owing one.
    onSave(item.id, { status: link.trim() ? "posted" : "postedNoLink", doneAt: nowHHMM() });
  }

  async function pasteLink() {
    try {
      setLink(await navigator.clipboard.readText());
    } catch {
      // No clipboard permission: the field is still typed into by hand.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-card border border-border glass-overlay sm:max-h-[85vh] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              {isPost ? <Film className="size-5" /> : <ListChecks className="size-5" />}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{item.label}</h2>
              <p className="tnum truncate text-xs text-text-muted">
                {handle} · {item.due}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center text-text-muted hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          {isPost ? (
            <>
              <FilterPills
                options={[
                  { value: "done", label: "Posted" },
                  { value: "failed", label: "It failed" },
                ]}
                value={outcome}
                onChange={(v) => setOutcome(v as "done" | "failed")}
              />

              {outcome === "done" ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-text-muted">Link</span>
                  <div className="flex gap-2">
                    <input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      inputMode="url"
                      placeholder="https://www.tiktok.com/@handle/video/…"
                      className="min-w-0 flex-1 rounded-nested border border-border bg-card-raised px-3 py-2.5 text-sm placeholder:text-text-muted/60"
                    />
                    {/* The link was just copied on the other phone. */}
                    <button
                      onClick={pasteLink}
                      className="shrink-0 rounded-nested border border-border px-3 text-sm font-medium text-text-muted hover:text-text-primary"
                    >
                      Paste
                    </button>
                  </div>
                </label>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-text-muted">What happened</span>
                  <div className="flex flex-wrap gap-2">
                    {FAIL_REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={cn(
                          "h-10 rounded-full px-3.5 text-xs font-medium transition-colors",
                          reason === r
                            ? "bg-accent-soft text-accent"
                            : "border border-border text-text-muted hover:text-text-primary",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason === "Other" && (
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="A few words"
                      className="rounded-nested border border-border bg-card-raised px-3 py-2.5 text-sm placeholder:text-text-muted/60"
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <Stepper
                label="Minutes"
                hint={`Done from ${targetMinutes}`}
                value={minutes}
                onChange={setMinutes}
                min={0}
                max={60}
                suffix="min"
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-text-muted">Note</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything worth remembering"
                  className="rounded-nested border border-border bg-card-raised px-3 py-2.5 text-sm placeholder:text-text-muted/60"
                />
              </label>
            </>
          )}

          {alreadyDone && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-xs text-text-muted">
                {item.status === "failed" ? "Failed" : "Done"} {item.doneAt}
              </p>
              <HoldButton tone="warn" onConfirm={() => onUndo(item.id)}>
                Undo
              </HoldButton>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
          >
            Cancel
          </button>
          <CtaButton onClick={submit}>Save</CtaButton>
        </div>
      </div>
    </div>
  );
}
