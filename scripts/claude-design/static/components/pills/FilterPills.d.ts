import * as React from "react";

export interface FilterPillOption {
  value: string;
  label: string;
  /** A small dot marking "not on the default" (e.g. a character with its own cadence). */
  marked?: boolean;
}

export interface FilterPillsProps {
  options: FilterPillOption[];
  /** Controlled value. Omit to let the control hold its own state. */
  value?: string;
  /** Starting value when uncontrolled. @default the first option */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Sit beside a heading instead of claiming a full-width row on phones. @default false */
  inline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Segmented pill switch ("All / Healthy / Needs attention"). */
export function FilterPills(props: FilterPillsProps): React.JSX.Element;
