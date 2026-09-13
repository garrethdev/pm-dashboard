import * as React from "react";

export interface BarcodeBarProps {
  /** 0 to 100. */
  pct: number;
  /** @default "accent" */
  tone?: "accent" | "ok" | "warn" | "orange" | "danger" | "info";
  className?: string;
  style?: React.CSSProperties;
}

/** Inventory bar with a coloured leading edge. */
export function BarcodeBar(props: BarcodeBarProps): React.JSX.Element;
