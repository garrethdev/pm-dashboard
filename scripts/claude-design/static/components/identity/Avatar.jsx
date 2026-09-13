import React from "react";

/* Ported from src/components/ui/avatar.tsx. The platforms hand out signed CDN
   URLs that expire within a day or two, so a well-formed URL can still answer
   403. The fallback therefore triggers on a load error as well as on a missing src. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** The silhouette drawn when there is no usable photo. Follows the theme. */
export function AvatarFallback({ size = 32, className, style }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="No profile photo"
      className={cx("pm-avatar", className)}
      style={style}
    >
      <circle cx="50" cy="50" r="50" fill="var(--card-raised)" />
      <clipPath id="avatar-disc">
        <circle cx="50" cy="50" r="50" />
      </clipPath>
      <g clipPath="url(#avatar-disc)" fill="var(--text-muted)">
        <circle cx="50" cy="38" r="17" />
        <ellipse cx="50" cy="88" rx="28" ry="24" />
      </g>
    </svg>
  );
}

/** Account photo with a silhouette fallback. */
export function Avatar({ src, alt = "", size = 32, className, style }) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return <AvatarFallback size={size} className={className} style={style} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain JSX for Claude Design, not a Next page
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cx("pm-avatar", className)}
      style={style}
    />
  );
}
