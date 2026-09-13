import * as React from "react";

export interface ExtendButtonProps {
  /** The provider's extend page. Opens in a new tab. */
  href?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Per-row link out to extend a proxy or phone rental. */
export function ExtendButton(props: ExtendButtonProps): React.JSX.Element;
