import * as React from "react";

export interface SearchInputProps {
  /** Controlled value. Omit to let the field hold its own state. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Says what is searched, never how. @default "Search" */
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Pill search field for detail-page tables. */
export function SearchInput(props: SearchInputProps): React.JSX.Element;
