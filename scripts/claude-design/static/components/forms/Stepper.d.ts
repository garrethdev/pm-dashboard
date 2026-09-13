import * as React from "react";

export interface StepperProps {
  label: string;
  /** Short right-aligned note, e.g. "3 left". */
  hint?: string;
  /** @default "muted" */
  hintTone?: "muted" | "danger";
  /** Controlled value. Omit to let the stepper hold its own state. */
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** @default 0 */
  min?: number;
  /** Set to what the budget actually has left. @default 10 */
  max?: number;
  /** @default 1 */
  step?: number;
  /** Unit after the number, e.g. "/day". */
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Numeric stepper whose caps are the real limit. */
export function Stepper(props: StepperProps): React.JSX.Element;
