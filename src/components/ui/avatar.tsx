"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Account avatar with a silhouette fallback.
 *
 * A missing avatar is not the only failure mode, and not the common one: the
 * platforms hand out SIGNED CDN URLs that expire in a day or two, so a URL we
 * hold can be perfectly well-formed and still answer 403. A plain <img> renders
 * that as a broken-image glyph, which looks like a bug in the dashboard rather
 * than an expired link. So the fallback is driven by onError as well as by a
 * null src.
 *
 * Colours come from the theme tokens, so the placeholder follows light/dark
 * rather than being a fixed grey: the disc is the raised card surface and the
 * figure is muted text, which is the same pairing every other empty state uses.
 */
export function AvatarFallback({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="No profile photo"
      className={cn("shrink-0 rounded-full border border-border", className)}
    >
      <circle cx="50" cy="50" r="50" fill="var(--card-raised)" />
      {/* Head and shoulders, clipped by the disc so the body reads as filling
          the lower half rather than as a floating pill. */}
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

export function Avatar({
  src,
  alt = "",
  className,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <AvatarFallback className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed CDN hosts, too many to allowlist in next.config
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full border border-border object-cover", className)}
    />
  );
}
