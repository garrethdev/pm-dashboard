import * as React from "react";

export interface AvatarProps {
  /** Photo URL. Missing or failing URLs show the silhouette. */
  src?: string | null;
  alt?: string;
  /** @default 32 */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Account photo with a silhouette fallback. */
export function Avatar(props: AvatarProps): React.JSX.Element;

export interface AvatarFallbackProps {
  /** @default 32 */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** The themed silhouette used when there is no photo. */
export function AvatarFallback(props: AvatarFallbackProps): React.JSX.Element;
