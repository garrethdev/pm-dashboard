import React from "react";

/* Ported from src/components/ui/hold-button.tsx. Press-and-hold confirmation in
   place of typing a name to confirm. No "hold to confirm" label: a plain click
   visibly starts the fill and lets it fall back, which is the whole instruction.
   Releasing early always aborts. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Destructive action that fires only after a full hold. */
export function HoldButton({ onConfirm, holdMs = 1100, disabled = false, tone = "danger", className, style, children }) {
  const [progress, setProgress] = React.useState(0);
  const holding = React.useRef(false);
  const frame = React.useRef(null);
  const startedAt = React.useRef(0);
  const confirm = React.useRef(onConfirm);
  React.useEffect(() => {
    confirm.current = onConfirm;
  }, [onConfirm]);

  const stop = React.useCallback(() => {
    holding.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(0);
  }, []);

  // A pointer released outside the button still has to abort the hold.
  React.useEffect(() => {
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

  React.useEffect(() => stop, [stop]);

  const start = React.useCallback(() => {
    if (disabled || holding.current) return;
    holding.current = true;
    startedAt.current = performance.now();
    const tick = (now) => {
      if (!holding.current) return;
      const p = Math.min(1, (now - startedAt.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        stop();
        if (confirm.current) confirm.current();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [disabled, holdMs, stop]);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button === 0) start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={stop}
      onBlur={stop}
      aria-label={typeof children === "string" ? `${children}, press and hold` : undefined}
      className={cx("pm-hold", `pm-hold--${tone}`, className)}
      style={style}
    >
      <span
        aria-hidden="true"
        className={cx("pm-hold__fill", progress === 0 && "pm-hold__fill--idle")}
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className={cx("pm-hold__label", progress > 0.5 && "pm-hold__label--lit")}>{children}</span>
    </button>
  );
}
