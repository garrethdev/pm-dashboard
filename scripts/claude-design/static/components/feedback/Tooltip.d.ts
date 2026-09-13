import * as React from "react";

export interface TooltipProps {
  label: string;
  /** Use "left" inside horizontally scrolling tables. @default "top" */
  side?: "top" | "left";
  /** Pin visible (for mocks). @default false */
  open?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** CSS-only hover tooltip. */
export function Tooltip(props: TooltipProps): React.JSX.Element;
