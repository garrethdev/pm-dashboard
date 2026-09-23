"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Smartphone, X } from "@/components/ui/icons";
import { CtaButton } from "@/components/ui/cta-button";
import {
  DeviceFields,
  EMPTY_DEVICE_FORM,
  errorFrom,
  type DeviceFormValues,
} from "@/components/dashboard/device-fields";
import { proofRefusal } from "@/lib/data/device-rules";

/**
 * Register a physical phone.
 *
 * Two requests, in order: the phone, then its whoer.net screenshot. The
 * screenshot is optional here because a phone is often written down before its
 * proxy is working; the list shows "No proof yet" until one is added. If the
 * phone saves and the picture does not, the phone is kept and the caller is
 * sent to its page with the reason, rather than asking for the form again and
 * then refusing the name as a duplicate.
 */
export function AddDeviceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  /** `proofError` is set when the phone was saved but its screenshot was not. */
  onCreated: (id: number, proofError: string | null) => void;
}) {
  const [values, setValues] = useState<DeviceFormValues>(EMPTY_DEVICE_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const fileProblem = file ? proofRefusal(file) : null;
  const ready = values.name.trim() !== "" && !fileProblem;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await errorFrom(res, "Saving the phone failed"));
      const { id } = (await res.json()) as { id: number };

      let proofError: string | null = null;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        try {
          const up = await fetch(`/api/devices/${id}/proof`, { method: "POST", body: form });
          if (!up.ok) proofError = await errorFrom(up, "The screenshot did not upload");
        } catch {
          proofError = "The screenshot did not upload";
        }
      }
      if (alive.current) onCreated(id, proofError);
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      {/* A bottom sheet on a phone: the fields sit above the keyboard's reach
          and the Save row stays pinned, instead of a centred box whose lower
          half is under the keyboard. */}
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-card border border-border glass-overlay sm:max-h-[85vh] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Smartphone className="size-5" />
            </span>
            <h2 className="text-base font-semibold">Add phone</h2>
          </div>
          {/* 44px for a thumb (P13 B3-2); the margin keeps the header's height. */}
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-m-1 flex size-11 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <DeviceFields values={values} onChange={setValues} disabled={busy} />

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-muted">whoer.net screenshot</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-nested border border-border bg-card-raised px-3 py-2.5 text-sm text-text-muted file:mr-3 file:rounded-full file:border-0 file:bg-pill-bg file:px-3 file:py-1 file:text-xs file:font-medium file:text-text-primary disabled:opacity-40"
            />
            {fileProblem && <span className="text-xs text-warn">{fileProblem}</span>}
          </label>

          {error && (
            <p className="rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          {/* 44px on a phone (P13 B3-2). Cancel stretches to match. */}
          <CtaButton onClick={submit} disabled={busy || !ready} className="max-sm:min-h-11">
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save phone
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
