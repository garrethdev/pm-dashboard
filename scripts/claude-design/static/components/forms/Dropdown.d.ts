import * as React from "react";

export interface DropdownProps {
  /** Trigger label, e.g. "Filters" or "Sort". */
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Count shown in an accent badge when above zero. */
  badge?: number;
  /** Which edge of the trigger the panel hangs from, from 640px up. @default "left" */
  align?: "left" | "right";
  /** Start open (useful in mocks). @default false */
  defaultOpen?: boolean;
  className?: string;
  panelClassName?: string;
  /** Panel content, or a function receiving `close`. */
  children?: React.ReactNode | ((close: () => void) => React.ReactNode);
}

/** Pill trigger opening a floating glass panel. */
export function Dropdown(props: DropdownProps): React.JSX.Element;
