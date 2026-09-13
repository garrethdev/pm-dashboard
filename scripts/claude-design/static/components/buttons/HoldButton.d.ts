import * as React from "react";

export interface HoldButtonProps {
  /** Fires once the hold completes. */
  onConfirm?: () => void;
  /** How long the hold takes. @default 1100 */
  holdMs?: number;
  disabled?: boolean;
  /** @default "danger" */
  tone?: "danger" | "warn";
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Press-and-hold confirmation for destructive actions. */
export function HoldButton(props: HoldButtonProps): React.JSX.Element;
