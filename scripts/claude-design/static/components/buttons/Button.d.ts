import * as React from "react";

export interface ButtonProps {
  /** secondary: bordered pill on the control ground, 12px. ghost: no border or fill, 14px. @default "secondary" */
  variant?: "secondary" | "ghost";
  /** Render as a link. */
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  onClick?: React.MouseEventHandler;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Secondary and ghost pill buttons. */
export function Button(props: ButtonProps): React.JSX.Element;
