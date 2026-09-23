"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CtaButton } from "@/components/ui/cta-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { HoldButton } from "@/components/ui/hold-button";
import { Check, Film, Globe, ListChecks, Robot, SignOut, Smartphone, X } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Stepper } from "@/components/ui/stepper";
import { Tooltip } from "@/components/ui/tooltip";
import {
  cleanupSteps,
  isCleanupDone,
  isItemFinished,
  todoPlaceholder,
  type BanCleanup,
  type BanStep,
  type TodoDay,
  type TodoDevice,
  type TodoItem,
  type TodoItemStatus,
  type TodoState,
} from "@/lib/data/todo-placeholder";
import { parseWarmupItemId, type TodoExtras } from "@/lib/data/todo";
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
 * SINCE PF-07 THE TICKS ARE REAL. A post writes back to its `post_deliveries`
 * row and a warmup writes a `warmup_sessions` row, and the board is re-read
 * from the server afterwards rather than patched here — so what the screen
 * shows is what the database says, and two people on the same list see the
 * same thing.
 *
 * The design states (`?todo=`) still run on `todo-placeholder.ts` and still
 * save nothing, so the screens can be judged in states live data will not
 * produce on demand — a phone switched off, a day already finished.
 */

type Override = {
  status: TodoItemStatus;
  doneAt?: string;
  loggedMinutes?: number;
  reason?: string;
};

/** Where a sheet was opened from, so its title can name the account — and,
 *  since PF-07, so a warmup logged from it knows which account and phone it
 *  belongs to. */
export type SheetTarget = {
  item: TodoItem;
  handle: string;
  /** The phone this item sits under, for the row a warmup writes. */
  deviceId?: number;
};

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

/**
 * The board, live or drawn.
 *
 * `live` is the real list: `initial` is the server's answer for the day the
 * page opened on, and stepping to another day or finishing an item re-reads
 * from `/api/todo`. Without it the board is one of the placeholder states, the
 * same as before PF-07, and every tick stays in this component.
 */
export function useTodoBoard(
  state: TodoState,
  day: TodoDay,
  live?: { initial: TodoDevice[]; extras: TodoExtras; initialDay: TodoDay },
) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [fetched, setFetched] = useState<{ day: TodoDay; devices: TodoDevice[]; extras: TodoExtras } | null>(
    null,
  );
  const [readError, setReadError] = useState<string | null>(null);

  const placeholder = todoPlaceholder(state, day);

  // The live board for the day being looked at: the server's first answer
  // while that is still the day, then whatever the last fetch returned.
  //
  // MEMOISED, and it must stay that way. A fresh object every render would
  // change the fetching effect's dependencies every render, so a read still in
  // flight would be aborted and started again on each one — the list would
  // never settle.
  const liveBoard = useMemo(
    () =>
      live
        ? fetched && fetched.day === day
          ? fetched
          : day === live.initialDay
            ? { day, devices: live.initial, extras: live.extras }
            : null
        : null,
    [live, fetched, day],
  );

  // Nothing to show for this day yet IS the loading state, so it is derived
  // rather than held: a second flag could disagree with the board it
  // describes, and there is no moment where it usefully would.
  const loading = Boolean(live) && liveBoard === null;

  const read = useCallback(
    async (which: TodoDay, signal?: AbortSignal) => {
      const res = await fetch(`/api/todo?day=${which}`, { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { devices: TodoDevice[]; extras: TodoExtras };
    },
    [],
  );

  // Stepping to a day we have not read yet. The state is set when the answer
  // ARRIVES, never while the effect is running: a synchronous setState here
  // would re-render before the fetch had even left.
  useEffect(() => {
    if (!live || liveBoard) return;
    const controller = new AbortController();
    read(day, controller.signal)
      .then((body) => setFetched({ day, devices: body.devices, extras: body.extras }))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setReadError("Couldn't read the list. It may be out of date.");
      });
    // Stepping again before the answer lands drops the one now in flight, so
    // a fast tap through three days cannot land on the wrong one.
    return () => controller.abort();
  }, [live, liveBoard, day, read]);

  /** Re-read the day being looked at. Called after a write, never from an
   *  effect, so setting state here is exactly what is wanted. */
  const reload = useCallback(
    async (which: TodoDay) => {
      if (!live) return;
      setReadError(null);
      try {
        const body = await read(which);
        setFetched({ day: which, devices: body.devices, extras: body.extras });
      } catch {
        setReadError("Couldn't read the list. It may be out of date.");
      }
    },
    [live, read],
  );

  const devices = useMemo(
    () => applyOverrides(live ? (liveBoard?.devices ?? []) : placeholder, overrides),
    [live, liveBoard, placeholder, overrides],
  );

  /**
   * Record what happened to an item.
   *
   * On the live board the write goes to the server and the board is re-read,
   * so nothing on screen claims something the database did not agree to. It
   * resolves with a sentence when the save failed and `null` when it landed;
   * the sheet stays open on a sentence (PF-07's state 3).
   */
  const save = useCallback(
    async (id: string, o: Override, request?: () => Promise<string | null>): Promise<string | null> => {
      if (live && request) {
        const why = await request();
        if (why) return why;
        await reload(day);
        setTarget(null);
        return null;
      }
      setOverrides((prev) => ({ ...prev, [id]: o }));
      setTarget(null);
      return null;
    },
    [live, reload, day],
  );

  const undo = useCallback(
    async (id: string, request?: () => Promise<string | null>): Promise<string | null> => {
      if (live && request) {
        const why = await request();
        if (why) return why;
        await reload(day);
        setTarget(null);
        return null;
      }
      setOverrides((prev) => ({ ...prev, [id]: { status: "todo" } }));
      setTarget(null);
      return null;
    },
    [live, reload, day],
  );

  return {
    devices,
    extras: liveBoard?.extras ?? {},
    live: Boolean(live),
    loading,
    readError,
    target,
    open: setTarget,
    close: useCallback(() => setTarget(null), []),
    save,
    undo,
    reload: useCallback(() => reload(day), [reload, day]),
  };
}

/**
 * The tick itself. Big enough for a thumb, and it never completes anything on
 * its own — it opens the sheet that asks what happened.
 */
/**
 * The script's own work, on both screens. A robot in place of the word
 * "Automated" (Garreth, 2026-09-22): the label was as wide as some of the
 * tasks it sat beside, and it is read at a glance rather than actually read.
 *
 * Hovering says "Automated task" in the app's own tooltip rather than the
 * browser's (Garreth, 2026-09-22). Nothing DEPENDS on the hover — the rule
 * for these screens is that a phone must work without one — it only spells
 * out a badge that is already understood from its shape. The same words are
 * what a screen reader is given.
 *
 * `side` is "left" on the dashboard card: its phone blocks clip what leaves
 * them (they have rounded corners to keep), and there the badge sits close
 * enough to the right edge that a centred tooltip loses its last word.
 */
export function AutomatedMark({ side = "top" }: { side?: "top" | "left" }) {
  return (
    <Tooltip label="Automated task" side={side} className="shrink-0">
      <span
        role="img"
        aria-label="Automated task"
        className="flex size-5 items-center justify-center rounded-full bg-pill-bg text-text-muted"
      >
        <Robot className="size-3.5" />
      </span>
    </Tooltip>
  );
}

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
  extras,
  live = false,
  onClose,
  onSave,
  onUndo,
}: {
  target: SheetTarget;
  /** The delivery behind each post item, so a tick knows what to write to. */
  extras?: TodoExtras;
  /** True when the board is the real list; false for a `?todo=` design state,
   *  where nothing is written and nothing can fail. */
  live?: boolean;
  onClose: () => void;
  onSave: (id: string, o: Override, request?: () => Promise<string | null>) => Promise<string | null>;
  onUndo: (id: string, request?: () => Promise<string | null>) => Promise<string | null>;
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

  // PF-07's states around a save that can fail. `busy` holds the sheet open
  // with a spinner rather than closing it optimistically (state 1): a post
  // believed logged and not logged comes back tomorrow as carried over, which
  // is the failure worth designing against. `error` keeps what was typed and
  // offers Try again (state 3); `pasteNote` says why Paste did nothing
  // (state 6); `linkWarning` is a link that is clearly not one (state 4).
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const targetMinutes = item.targetMinutes ?? 15;

  /**
   * STATE 4: a link that is clearly not a link.
   *
   * It WARNS rather than refusing. The link is optional (decision 7), so
   * refusing a field that may be left blank is far too strong — and the one
   * thing that must never happen is somebody unable to record a post they
   * actually made because the app dislikes the text they pasted. A pasted
   * caption is the case this catches, and saying so is enough.
   */
  const trimmedLink = link.trim();
  const linkWarning =
    trimmedLink.length > 0 && !/^https?:\/\/\S+$/i.test(trimmedLink)
      ? "That does not look like a link. It will be saved as it is."
      : null;

  /** POST some JSON and turn whatever comes back into a sentence, or null. */
  async function send(url: string, body: unknown): Promise<string | null> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return null;
      const parsed = (await res.json().catch(() => null)) as { error?: string } | null;
      return parsed?.error ?? `Couldn't save that (HTTP ${res.status}). Nothing was changed.`;
    } catch {
      return "Couldn't reach the server. Nothing was changed.";
    }
  }

  /** What this sheet's Save writes, when the board is the real one. */
  function request(): (() => Promise<string | null>) | undefined {
    if (!live) return undefined;

    if (!isPost) {
      const parsed = parseWarmupItemId(item.id);
      if (!parsed) return () => Promise.resolve("This warmup cannot be saved from here.");
      return () =>
        send("/api/warmups", {
          accountId: parsed.accountId,
          deviceId: target.deviceId ?? null,
          minutes,
          sessionNo: parsed.sessionNo,
          note: note.trim() || null,
        });
    }

    const deliveryId = extras?.[item.id]?.deliveryId;
    if (deliveryId === undefined) {
      return () => Promise.resolve("This post is no longer on the list.");
    }
    if (outcome === "failed") {
      return () =>
        send(`/api/deliveries/${deliveryId}`, {
          action: "failed",
          note: note.trim() || reason,
          // What the screen believed when the sheet opened, so the server can
          // refuse rather than overwrite somebody else's answer (state 5).
          expect: item.status,
        });
    }
    // Pasting the link onto a post already marked done is its own action, so
    // it cannot reset who finished it or when.
    if (item.status === "postedNoLink") {
      return () =>
        send(`/api/deliveries/${deliveryId}`, {
          action: "link",
          postUrl: trimmedLink,
          expect: item.status,
        });
    }
    return () =>
      send(`/api/deliveries/${deliveryId}`, {
        action: "posted",
        postUrl: trimmedLink || null,
        expect: item.status,
      });
  }

  function override(): Override {
    if (!isPost) {
      const reached = minutes >= targetMinutes;
      return {
        // Short of the target it stays open, and says how far it got.
        status: reached ? "logged" : "todo",
        doneAt: reached ? nowHHMM() : undefined,
        loggedMinutes: minutes,
      };
    }
    if (outcome === "failed") {
      return { status: "failed", doneAt: nowHHMM(), reason: note.trim() || reason };
    }
    // The link is optional: saving without it leaves the item owing one.
    return { status: trimmedLink ? "posted" : "postedNoLink", doneAt: nowHHMM() };
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const why = await onSave(item.id, override(), request());
    setBusy(false);
    // STATE 3: the sheet stays open, holding what was typed, and says so.
    if (why) setError(why);
    // STATE 2 is the sheet closing over a list that has re-read itself: the
    // item is struck through with the time it was finished. That IS the
    // confirmation, and a second one would be noise on a screen used standing
    // up.
  }

  async function undo() {
    setBusy(true);
    setError(null);
    const deliveryId = extras?.[item.id]?.deliveryId;
    const why = await onUndo(
      item.id,
      live && isPost && deliveryId !== undefined
        ? () => send(`/api/deliveries/${deliveryId}`, { action: "undo", expect: item.status })
        : undefined,
    );
    setBusy(false);
    if (why) setError(why);
  }

  /**
   * STATE 6: Paste did nothing.
   *
   * Safari can refuse the clipboard outright, and it fails silently today.
   * The fallback is typing a long URL by hand on a phone, so the reason has
   * to be on screen — and an empty clipboard is a different answer from a
   * refused one.
   */
  async function pasteLink() {
    setPasteNote(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteNote("Nothing to paste — the clipboard is empty.");
        return;
      }
      setLink(text.trim());
    } catch {
      setPasteNote("Your browser would not hand over the clipboard. Paste or type it here.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={busy ? undefined : onClose}
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
                      onClick={() => void pasteLink()}
                      className="shrink-0 rounded-nested border border-border px-3 text-sm font-medium text-text-muted hover:text-text-primary"
                    >
                      Paste
                    </button>
                  </div>
                  {/* Why Paste did nothing (state 6), and a link that does not
                      look like one (state 4). Neither stops the save. */}
                  {pasteNote && (
                    <span role="alert" className="text-xs text-warn">
                      {pasteNote}
                    </span>
                  )}
                  {linkWarning && <span className="text-xs text-warn">{linkWarning}</span>}
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
              <HoldButton tone="warn" onConfirm={() => void undo()}>
                Undo
              </HoldButton>
            </div>
          )}
        </div>

        {/* STATE 3: could not save, and NOTHING was changed. The sheet stays
            open holding what was typed, says what happened, and Save becomes
            Try again — which the server answers as "already done" if the
            first attempt actually landed, so it cannot save twice. */}
        {error && (
          <p
            role="alert"
            className="mx-5 rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger sm:mx-6"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <CtaButton onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : error ? "Try again" : "Save"}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Ticks on a ban's clean-up steps (P8, PF-11), for the To-do page and the
 * dashboard card alike, so a step ticked on either is saved the same way.
 *
 * A tick shows the instant it is pressed. On the live list each is saved and
 * dropped once the list has been re-read with it; on a design state, where
 * `onStepSaved` is absent, it is only held here and saved nowhere.
 */
export function useCleanupTicks(device: TodoDevice, onStepSaved?: () => Promise<void>) {
  const [ticked, setTicked] = useState<Record<string, string | null>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const cleanups = (device.cleanups ?? []).map((c) => ({
    ...c,
    steps: c.steps.map((st) =>
      st.id in ticked ? { ...st, done: ticked[st.id] !== null, doneAt: ticked[st.id] ?? undefined } : st,
    ),
  }));
  const toggleStep = async (st: BanStep) => {
    const done = !st.done;
    const drop = () =>
      setTicked((t) => {
        const next = { ...t };
        delete next[st.id];
        return next;
      });
    setStepError(null);
    setTicked((t) => ({
      ...t,
      [st.id]: done
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/New_York",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date())
        : null,
    }));
    if (!onStepSaved) return;
    try {
      const res = await fetch(`/api/ban-steps/${st.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      await onStepSaved();
      drop();
    } catch (err) {
      // Never left looking saved: the tick goes back to what the list says.
      drop();
      setStepError(err instanceof Error ? err.message : "Couldn't save the tick");
    }
  };

  return { cleanups, toggleStep, stepError };
}

/**
 * The clean-up after a ban on a real phone — design ticket P8.
 *
 * Drawn like an account's own panel, because it IS about one account, with a
 * red Banned pill so it is not mistaken for a working one. The steps are only
 * what a person has to do on the phone; what the app did at the retire is not
 * repeated here (Garreth, 2026-09-23). Finished, it stays for the rest of the day struck through, like
 * any finished item.
 */
export function BanCleanupGroup({
  cleanup,
  onToggle,
  compact = false,
}: {
  cleanup: BanCleanup;
  onToggle: (st: BanStep) => void;
  /** For the dashboard card: drawn like the card's own account groups, with
   *  the 24px gutter its other ticks use, rather than as the page's panel. */
  compact?: boolean;
}) {
  const steps = cleanupSteps(cleanup);
  const done = steps.filter((st) => st.done).length;
  const finished = isCleanupDone(cleanup);

  if (compact) {
    return (
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex size-6 shrink-0 items-center justify-center">
            <PlatformIcon platform={cleanup.platform} />
          </span>
          <span
            className={cn(
              "min-w-0 truncate text-xs font-medium",
              finished ? "text-text-muted" : "text-text-primary",
            )}
          >
            {cleanup.handle}
          </span>
          <StatusPill tone="danger">Banned</StatusPill>
          <StatusPill tone={finished ? "ok" : "gray"}>
            {finished ? "Cleaned up" : `Clean-up ${done} of ${steps.length}`}
          </StatusPill>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5">
          {cleanup.steps.map((st) => (
            <BanStepRow key={st.id} compact step={st} onToggle={() => onToggle(st)} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-nested bg-card-raised/50 px-3 pt-4 pb-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border pb-3.5">
        <PlatformIcon platform={cleanup.platform} />
        <span className={cn("min-w-0 truncate text-sm font-medium", finished && "text-text-muted")}>
          {cleanup.handle}
        </span>
        <StatusPill tone="danger">Banned</StatusPill>
        <span className="flex shrink-0 items-center gap-1.5 @lg:ml-auto">
          <StatusPill tone={finished ? "ok" : "gray"}>
            {finished ? "Cleaned up" : `Clean-up ${done} of ${steps.length}`}
          </StatusPill>
        </span>
      </div>

      <ul className="flex flex-col pt-1.5">
        {cleanup.steps.map((st) => (
          <BanStepRow key={st.id} step={st} onToggle={() => onToggle(st)} />
        ))}
      </ul>
    </div>
  );
}

function BanStepRow({
  step,
  onToggle,
  compact = false,
}: {
  step: BanStep;
  onToggle: () => void;
  compact?: boolean;
}) {
  const Icon = step.kind === "signOut" ? SignOut : step.kind === "number" ? Smartphone : Globe;

  if (compact) {
    // The card's row: tick, then the step's icon where a task's time sits,
    // then the step. The detail stays — it is the number or proxy to retire.
    return (
      <li className="flex items-start gap-2">
        <button
          onClick={onToggle}
          role="checkbox"
          aria-checked={step.done}
          aria-label={step.label}
          className="group flex size-6 shrink-0 items-center justify-center"
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-md border transition-colors",
              step.done
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-transparent group-hover:border-text-muted",
            )}
          >
            <Check className="size-3" />
          </span>
        </button>
        <span className="flex h-6 w-11 shrink-0 items-center text-text-muted">
          <Icon className="size-3.5" />
        </span>
        <span className="flex min-h-6 min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-xs">
          <span className={step.done ? "text-text-muted line-through" : "text-text-primary"}>
            {step.label}
          </span>
          <span className="tnum text-text-muted">
            {[step.detail, step.done ? step.doneAt : null].filter(Boolean).join(" · ")}
          </span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 border-b border-border/60 py-2 last:border-0 last:pb-0 @lg:gap-3">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={step.done}
        aria-label={step.label}
        className="group flex h-9 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "flex size-[22px] items-center justify-center rounded-md border transition-colors",
            step.done
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-transparent group-hover:border-text-muted",
          )}
        >
          <Check className="size-3.5" />
        </span>
      </button>

      <span className={cn("flex h-9 shrink-0 items-center", step.done && "opacity-55")}>
        <span className="flex size-8 items-center justify-center rounded-full bg-card-raised text-text-muted">
          <Icon className="size-4" />
        </span>
      </span>

      {/* The time column of a task row, left empty, so the step's name lines
          up with every task name on the page. */}
      <span className="w-11 shrink-0" aria-hidden />

      <div className={cn("flex min-w-0 flex-1 flex-col", step.done && "opacity-55")}>
        <span className="flex min-h-9 items-center">
          <span className={cn("min-w-0 text-sm font-medium break-words", step.done && "line-through")}>
            {step.label}
          </span>
        </span>
        <p className="tnum text-xs text-text-muted">
          {[step.detail, step.done ? step.doneAt : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </li>
  );
}
