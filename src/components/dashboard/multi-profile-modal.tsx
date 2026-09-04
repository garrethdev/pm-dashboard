"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

/**
 * "Select multiple profiles" picker. Two fields by default, "Add another
 * profile" for more. Entries match the profile number EXACTLY, so 1 returns
 * Profile 1 only — never Profile 18/21 the way a substring search would.
 */
export function MultiProfileModal({
  initial,
  known,
  onApply,
  onClose,
}: {
  /** Profile numbers already applied, to prefill the fields. */
  initial: string[];
  /** Every profile number in the table, for validation hints. */
  known: string[];
  onApply: (profiles: string[]) => void;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<string[]>(() =>
    initial.length >= 2 ? [...initial] : [...initial, ...Array(2 - initial.length).fill("")],
  );

  const setField = (i: number, v: string) =>
    setFields((f) => f.map((x, idx) => (idx === i ? v : x)));
  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));

  const cleaned = fields.map((f) => f.replace(/\D+/g, "")).filter(Boolean);
  const unknown = [...new Set(cleaned.filter((n) => !known.includes(n)))];

  function apply() {
    onApply([...new Set(cleaned)]);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card border border-border bg-card p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Select multiple profiles</h2>
          <button
            onClick={onClose}
            title="Close"
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {fields.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-text-muted">Profile</span>
              <input
                autoFocus={i === 0}
                value={value}
                inputMode="numeric"
                onChange={(e) => setField(i, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                placeholder="e.g. 29"
                className="w-full rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-sm outline-none placeholder:text-text-muted focus:border-accent"
              />
              <button
                onClick={() => removeField(i)}
                disabled={fields.length <= 1}
                title="Remove"
                className="shrink-0 text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => setFields((f) => [...f, ""])}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:opacity-80"
        >
          <Plus className="size-3.5" /> Add another profile
        </button>

        {unknown.length > 0 && (
          <p className="mt-3 text-xs text-warn">
            Not in this table: {unknown.map((n) => `Profile ${n}`).join(", ")}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              onApply([]);
              onClose();
            }}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            Clear
          </button>
          <button
            onClick={apply}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
