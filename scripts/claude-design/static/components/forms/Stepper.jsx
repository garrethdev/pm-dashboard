import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/stepper.tsx. The caps are the point: wherever a
   number is one share of a fixed budget, `max` is what is actually left, so the
   + button stops rather than letting someone save a total the scheduler can
   never honour. Works uncontrolled when no `value` is passed. */

const cx = (...c) => c.filter(Boolean).join(" ");

function StepButton({ onClick, disabled, label, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="pm-stepper__btn">
      {children}
    </button>
  );
}

/** Numeric stepper with hard caps. */
export function Stepper({ label, hint, hintTone = "muted", value, defaultValue, onChange, min = 0, max = 10, step = 1, suffix, className, style }) {
  const [own, setOwn] = React.useState(defaultValue !== undefined ? defaultValue : min);
  const current = value !== undefined ? value : own;
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const set = (v) => {
    if (value === undefined) setOwn(v);
    if (onChange) onChange(v);
  };
  return (
    <div className={className} style={style}>
      <div className="pm-stepper__head">
        <span className="pm-stepper__label">{label}</span>
        {hint && <span className={cx("pm-stepper__hint", hintTone === "danger" && "pm-stepper__hint--danger")}>{hint}</span>}
      </div>
      <div className="pm-stepper__box">
        <StepButton onClick={() => set(clamp(current - step))} disabled={current <= min} label={`decrease ${label}`}>
          <Icon name="Minus" size={12} />
        </StepButton>
        <div className="pm-stepper__mid">
          <input
            type="text"
            inputMode="numeric"
            value={String(current)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              set(raw === "" ? min : clamp(Number(raw)));
            }}
            className="pm-stepper__input"
          />
          {suffix && <span className="pm-stepper__suffix">{suffix}</span>}
        </div>
        <StepButton onClick={() => set(clamp(current + step))} disabled={current >= max} label={`increase ${label}`}>
          <Icon name="Plus" size={12} />
        </StepButton>
      </div>
    </div>
  );
}
