import * as React from "react";

export interface PeptideMarkProps {
  /** @default 24 */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** The Peptide Miracles atom mark, icon-only, in currentColor. */
export function PeptideMark(props: PeptideMarkProps): React.JSX.Element;
