import * as React from "react";

export interface BrandIconProps {
  /** @default 16 */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** TikTok glyph in currentColor. */
export function TikTokIcon(props: BrandIconProps): React.JSX.Element;

/** Instagram glyph in currentColor. */
export function InstagramIcon(props: BrandIconProps): React.JSX.Element;
