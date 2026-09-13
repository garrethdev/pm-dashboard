import * as React from "react";

export type PillTone = "ok" | "warn" | "orange" | "danger" | "critical" | "gray" | "info" | "accent" | "neutral";

export interface StatusPillProps {
  /** ok Active · accent Ramping · info Scheduled · gray/neutral Paused · warn Throttled · orange Collapsing · danger Banned · critical Shadowbanned. @default "neutral" */
  tone?: PillTone;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Status pill on one neutral ground; only the label is coloured. */
export function StatusPill(props: StatusPillProps): React.JSX.Element;
