import * as React from "react";

export interface StaleNoticeProps {
  /** ISO time of the copy being shown. @default now */
  fetchedAt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Announces that a panel is showing a remembered copy, and what is missing. */
export function StaleNotice(props: StaleNoticeProps): React.JSX.Element;
