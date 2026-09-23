"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Smartphone, X } from "@/components/ui/icons";
import { HoldButton } from "@/components/ui/hold-button";
import {
  batchMoves,
  batchSummary,
  candidateLabel,
  canTake,
  planBatch,
  roomLabel,
  tallyPlan,
  type BatchRow,
  type MoveCandidate,
  type MoveTarget,
} from "@/lib/data/move-rules";
import { cn } from "@/lib/utils";

/**
 * Move several accounts onto phones at once — design ticket P10, for PF-15.
 *
 * WHY IT EXISTS: the day a box of phones arrives, a whole character's accounts
 * move together. Doing that one dialog at a time is a dozen presses in which
 * it is easy to lose count of which phone has room left, and the phone that
 * quietly filled up is the one that strands an account with no work showing.
 *
 * THE PLAN IS A SUGGESTION, NOT A DECISION. The app spreads the accounts
 * across the phones that have room, filling each phone before starting the
 * next so a character stays on one phone (see planBatch). Every row can then
 * be changed, because the person doing the move knows which phone is on which
 * desk and the app does not.
 *
 * ACCOUNTS WITH NOWHERE TO GO ARE SHOWN, NOT DROPPED. Arrival day is exactly
 * when there are more accounts than phones. They stay in the list marked "not
 * moving", the sentence at the top says how many, and the button says how many
 * are actually about to move — a silent partial move would be the worst answer
 * available.
 *
 * THE SAVE IS ALL OR NOTHING (PF-15). One request moves every account that is
 * not set to "Not moving", or none of them; a refusal names the account that
 * stopped it, and that row is marked so it can be changed or set aside.
 */
export function MoveBatchDialog({
  accounts,
  phones,
  demo,
  onClose,
  onDone,
}: {
  accounts: MoveCandidate[];
  phones: MoveTarget[];
  /** True while the phones are invented: the hold closes without saving. */
  demo: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const suggestion = useMemo(() => planBatch(accounts, phones), [accounts, phones]);
  const [rows, setRows] = useState<BatchRow[]>(suggestion.rows);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  /** The account the last refused save named, marked in the list. */
  const [stoppedBy, setStoppedBy] = useState<string | null>(null);
  const router = useRouter();

  const plan = useMemo(() => tallyPlan(rows, phones), [rows, phones]);
  const nothingToDo = plan.moving === 0;
  const unusable = plan.unusable;

  function choose(profile: string, targetId: number | null) {
    setRows((prev) =>
      prev.map((r) => (r.account.profile === profile ? { ...r, targetId } : r)),
    );
    setMessage("");
    setStoppedBy(null);
  }

  function save() {
    if (nothingToDo || unusable.length > 0) return;
    if (demo) {
      onClose();
      return;
    }
    setBusy(true);
    setMessage("");
    setStoppedBy(null);
    fetch("/api/accounts/delivery-mode/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moves: batchMoves(rows) }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          profile?: string | null;
        };
        if (!res.ok) {
          setStoppedBy(data.profile ?? null);
          throw new Error(data.error ?? "Request failed");
        }
        router.refresh();
        onDone();
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Network error");
      })
      .finally(() => setBusy(false));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Move ${accounts.length} accounts onto phones`}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-card border border-border glass-overlay p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-warn/15 text-warn">
              <Smartphone className="size-5" />
            </span>
            {/* No count in the heading: the sentence below carries the
                numbers, and a heading saying 32 above a line saying 4 reads
                as a contradiction rather than as a selection and its plan. */}
            <h2 className="text-base font-semibold">Move accounts onto phones</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* The sentence leads, because the interesting case is the one where
            the numbers disagree and two counts side by side do not say which
            of them is the problem. */}
        <p className={cn("mb-4 text-sm", nothingToDo ? "text-warn" : "text-text-muted")}>
          {batchSummary(plan)}
        </p>

        <ul className="-mx-1 mb-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1">
          {rows.map(({ account, targetId }) => (
            <li
              key={account.profile}
              className={cn(
                "flex items-center gap-3 rounded-nested border bg-card-raised/40 px-3 py-2",
                account.profile === stoppedBy ? "border-danger/60" : "border-border",
                targetId === null && "opacity-60",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {candidateLabel(account)}
                </span>
                {account.character && (
                  <span className="block truncate text-xs text-text-muted">
                    {account.character.replace("Character ", "Char ")}
                  </span>
                )}
              </span>
              {/* The browser draws its own arrow inside the box, which left
                  the longest option ("iPhone 2 · 2 accounts") running under it.
                  `appearance-none` drops it — the pattern the phone form and
                  the device page already use — and the chevron below is ours,
                  with the padding to sit clear of the text. */}
              <span className="relative shrink-0">
              <select
                value={targetId ?? ""}
                disabled={busy}
                onChange={(e) => choose(account.profile, e.target.value === "" ? null : Number(e.target.value))}
                aria-label={`Phone for ${candidateLabel(account)}`}
                className="w-full appearance-none rounded-nested border border-border bg-card py-1.5 pr-7 pl-2.5 text-xs text-text-primary disabled:opacity-50"
              >
                <option value="">Not moving</option>
                {phones.map((phone) => (
                  // A switched-off phone stays in the list: the warning below
                  // names it, which explains the refusal better than a missing
                  // option ever could.
                  <option
                    key={phone.id}
                    value={phone.id}
                    disabled={!canTake(phone) && phone.id !== targetId}
                  >
                    {phone.name} · {roomLabel(phone)}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-text-muted"
              />
              </span>
            </li>
          ))}
        </ul>

        {unusable.length > 0 && (
          <p className="mb-4 rounded-nested bg-warn/10 px-3 py-2 text-sm text-warn">
            {unusable.map((t) => t.name).join(" and ")}{" "}
            {unusable.length === 1 ? "is" : "are"} switched off. Switch{" "}
            {unusable.length === 1 ? "it" : "them"} on, or choose another phone.
          </p>
        )}

        <p className="mb-4 text-sm text-text-muted">Posting stays paused.</p>

        {message && (
          <p className="mb-4 rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>
        )}

        <div className="flex shrink-0 justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <HoldButton
            tone="warn"
            onConfirm={save}
            disabled={busy || nothingToDo || unusable.length > 0}
            className="px-4 py-2 font-semibold"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Moving…
              </>
            ) : (
              // The count is the one on the button, not the one selected: it
              // is what will actually happen when the hold completes.
              `Move ${plan.moving} account${plan.moving === 1 ? "" : "s"}`
            )}
          </HoldButton>
        </div>
      </div>
    </div>
  );
}
