"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, NotePencil, Upload, X } from "@/components/ui/icons";
import { CtaButton } from "@/components/ui/cta-button";
import { DEVICE_INPUT } from "@/components/dashboard/device-fields";
import {
  DESCRIPTION_MAX,
  ISSUE_CATEGORIES,
  PAGE_PATH_MAX,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_TYPES,
  reportRefusal,
} from "@/lib/data/issue-rules";
import { cn } from "@/lib/utils";

/**
 * Report an issue, opened from the floating button (Garreth, 2026-10-09).
 *
 * Category, what happened, and an optional screenshot — chosen, dropped onto
 * the box, or pasted anywhere in the dialog with Cmd/Ctrl+V, which is how most
 * screenshots arrive. There is no date field: the report is dated the moment
 * it is sent, and the server records who sent it and the page they were on.
 */
export function ReportIssueDialog({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  /** The chosen picture and a local link to show it before it is sent. */
  const [shot, setShot] = useState<{ file: File; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const ready = reportRefusal({ category, description, pagePath: null }) === null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  // The preview link holds the picture in memory until it is let go.
  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.preview);
  }, [shot]);

  function take(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("The screenshot must be a picture.");
      return;
    }
    setMessage("");
    setShot({ file, preview: URL.createObjectURL(file) });
  }

  async function send() {
    const refusal = reportRefusal({ category, description, pagePath: null });
    if (refusal) {
      setMessage(refusal);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("category", category);
      form.set("description", description.trim());
      const page = window.location.pathname + window.location.search;
      if (page.length <= PAGE_PATH_MAX) form.set("page", page);
      if (shot) form.set("screenshot", await shrinkScreenshot(shot.file));

      const res = await fetch("/api/issues", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "The issue did not save.");
      setSent(true);
      // So an open Issues page shows the new report without a reload.
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report an issue"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-card border border-border glass-overlay"
        onClick={(e) => e.stopPropagation()}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
          if (file) {
            e.preventDefault();
            take(file);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-pill-bg text-text-muted">
              <NotePencil className="size-5" />
            </span>
            <h2 className="text-base font-semibold">Report an issue</h2>
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

        {sent ? (
          <>
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-pill-bg text-ok">
                <CheckCircle2 className="size-6" />
              </span>
              <p className="text-sm font-medium">Issue reported</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
              <Link
                href="/issues"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary"
              >
                See issues
              </Link>
              <CtaButton onClick={onClose}>Done</CtaButton>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 p-6">
              <Field label="Category">
                <select
                  autoFocus
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={busy}
                  className={cn(DEVICE_INPUT, "appearance-none", category === "" && "text-text-placeholder")}
                >
                  <option value="" disabled>
                    Choose
                  </option>
                  {ISSUE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="text-text-primary">
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="What happened">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={busy}
                  rows={4}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Which account or phone, what you saw, what you expected"
                  className={cn(DEVICE_INPUT, "resize-y")}
                />
              </Field>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-text-muted">
                  Screenshot <span className="text-text-placeholder">· optional</span>
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    take(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {shot ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded */}
                    <img
                      src={shot.preview}
                      alt="Screenshot to send"
                      className="max-h-48 rounded-nested border border-border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setShot(null)}
                      disabled={busy}
                      aria-label="Remove screenshot"
                      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border border-border glass-overlay text-text-muted hover:text-text-primary"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      take(e.dataTransfer.files[0]);
                    }}
                    disabled={busy}
                    className="flex flex-col items-center justify-center gap-2 rounded-nested border border-dashed border-border bg-card-raised/40 px-4 py-6 text-sm text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary"
                  >
                    <Upload className="size-5" />
                    Choose, drop or paste
                  </button>
                )}
              </div>

              {message && <p className="text-sm text-danger">{message}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <CtaButton onClick={send} disabled={busy || !ready}>
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                Send
              </CtaButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Longest side, in pixels, a screenshot is sent at. Text stays readable. */
const SCREENSHOT_SIDE = 2400;

/**
 * Send a screenshot as it is when it already fits; otherwise redraw it as a
 * JPEG no larger than SCREENSHOT_SIDE on its longest side.
 *
 * Most screenshots are PNGs a few hundred KB in size and go up untouched, so
 * text stays sharp. A phone photo of a screen, or an iPhone HEIC, is redrawn
 * through an <img>, so the browser's own decoder handles the format and the
 * rotation, and arrives as a JPEG of a few hundred KB.
 */
async function shrinkScreenshot(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file is not a picture this browser can open."));
      el.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const fits =
      file.type in SCREENSHOT_TYPES && file.size <= 1.5 * 1024 * 1024 && longest <= SCREENSHOT_SIDE;
    if (fits) return file;

    const scale = Math.min(1, SCREENSHOT_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare the screenshot.");
    // A transparent PNG would turn black as a JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("This browser cannot prepare the screenshot.");
    if (blob.size > SCREENSHOT_MAX_BYTES) throw new Error("The screenshot is too large to send.");
    return new File([blob], "screenshot.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
