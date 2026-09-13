import * as React from "react";

export interface SortButtonProps {
  label: string;
  /** This column is the current sort. @default false */
  active?: boolean;
  /** @default "desc" */
  dir?: "desc" | "asc";
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/** Column sort toggle: highest first, then lowest, then off. */
export function SortButton(props: SortButtonProps): React.JSX.Element;
