import * as React from "react";

export interface CtaButtonProps {
  /** accent for the screen's primary action; danger for a destructive one. @default "accent" */
  tone?: "accent" | "danger";
  /** Render as a link. */
  href?: string;
  target?: string;
  rel?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  onClick?: React.MouseEventHandler;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Primary call to action: a solid pill. One per screen. */
export function CtaButton(props: CtaButtonProps): React.JSX.Element;
