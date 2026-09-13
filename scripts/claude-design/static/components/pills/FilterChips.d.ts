import * as React from "react";

export interface FilterChip {
  /** Stable key: the filter's field, not its value. */
  key: string;
  /** What the reader sees, e.g. "Char 3" or "Paused". */
  label: string;
  onClear?: () => void;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/** The filters currently applied. Renders nothing when there are none. */
export function FilterChips(props: FilterChipsProps): React.JSX.Element | null;
