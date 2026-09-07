"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Press-and-hold confirmation, in place of typing a name to confirm.
 *
 * The affordance has to teach itself, so there is no "hold to confirm" label:
 * a plain click visibly starts the fill and lets it fall back, which reads as
 * "that did something, but not enough" and is the whole instruction. Releasing
 * early always aborts, so a mis-click cannot retire anything.
 *
 * The fill is driven by rAF rather than a CSS transition because the same
 * element has to be able to snap back from wherever it got to, and a
 * transition that is interrupted mid-flight leaves the width wherever the
 * compositor happened to be.
 */
export function HoldButton({
  onConfirm,
  holdMs = 1100,
  disabled = false,
  tone = "danger",
  className,
  children,
}: {
  onConfirm: () => void;
  holdMs?: number;
  disabled?: boolean;
  tone?: "danger" | "warn";
  className?: string;
  children: React.ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);
  // Held in a ref so the rAF loop never closes over a stale callback. Written
  // in an effect rather than during render, which React forbids.
  const confirm = useRef(onConfirm);
  useEffect(() => {
    confirm.current = onConfirm;
  }, [onConfirm]);

  const stop = useCallback(() => {
    holding.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(0);
  }, []);

  // A pointer released outside the button still has to abort the hold, and
  // that release never reaches the element's own handlers.
  useEffect(() => {
    const release = () => {
      if (holding.current) stop();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [stop]);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (disabled || holding.current) return;
    holding.current = true;
    startedAt.current = performance.now();

    const tick = (now: number) => {
      if (!holding.current) return;
      const p = Math.min(1, (now - startedAt.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        stop();
        confirm.current();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [disabled, holdMs, stop]);

  const armed = progress > 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        // Ignore secondary buttons: a right-click should never arm a retire.
        if (e.button === 0) start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      // Space and Enter are the keyboard equivalent of holding the pointer.
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={stop}
      onBlur={stop}
      aria-label={typeof children === "string" ? `${children}, press and hold` : undefined}
      className={cn(
        "relative isolate inline-flex select-none items-center gap-2 overflow-hidden rounded-full px-4 py-1.5",
        "text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
        "touch-none", // stop the browser turning a long press into a scroll or text selection
        tone === "danger" ? "bg-danger/25 text-danger" : "bg-warn/25 text-warn",
        !disabled && "hover:opacity-90",
        className,
      )}
    >
      {/* The fill. Solid, so the button reads as "charging" toward the real
          destructive colour rather than merely highlighting. */}
      <span
        aria-hidden
        style={{ transform: `scaleX(${progress})` }}
        className={cn(
          "absolute inset-0 -z-10 origin-left",
          tone === "danger" ? "bg-danger" : "bg-warn",
          // Snapping back is instant on release; only the last frames of a
          // completed hold get any easing.
          armed ? "" : "transition-transform duration-150",
        )}
      />
      <span className={cn("relative", progress > 0.5 && (tone === "danger" ? "text-white" : "text-bg"))}>
        {children}
      </span>
    </button>
  );
}
