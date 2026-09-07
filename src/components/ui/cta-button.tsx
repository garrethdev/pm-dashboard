"use client";

import { SpecularButton, type SpecularButtonProps } from "@/components/ui/specular-button";

/**
 * The app's primary call to action, wrapping SpecularButton with our palette.
 *
 * The fill is opaque, not glass. SpecularButton's default is a transparent
 * button whose only edge is the specular streak, and that streak is driven by
 * pointer proximity — so at rest, with the cursor elsewhere, the button was
 * literally nothing but its label floating on the card. A primary action has to
 * read as a control before you go looking for it. The shine now rides the edge
 * of the solid pill instead of standing in for it.
 *
 * Colours are literals rather than CSS variables because the shine is drawn in
 * WebGL — ogl's Color parser takes hex, not `var(--accent)`. They are the dark
 * theme's values; in light mode the shine keeps the dark-theme cyan, which is
 * a known gap and the reason to keep this in one file.
 *
 * Use it for the one action a screen is asking for. Each instance owns a WebGL
 * context and an animation frame loop, so it does not belong on filter pills,
 * table row actions or anything that repeats.
 */
const TONE = {
  accent: { tint: "#22d3ee", textColor: "#0b0b0c", baseColor: "#0e9bb5" },
  danger: { tint: "#ff4949", textColor: "#ffffff", baseColor: "#a01d1d" },
} as const;

export function CtaButton({
  tone = "accent",
  ...rest
}: Omit<SpecularButtonProps, "lineColor" | "baseColor" | "textColor" | "tint" | "tintOpacity"> & {
  tone?: keyof typeof TONE;
}) {
  return (
    <SpecularButton
      size="sm"
      // Clamps to a pill, matching every other control here.
      radius={999}
      tintOpacity={1}
      blur={0}
      // White reads as a specular streak on a saturated fill; the accent-tinted
      // shine the glass version used was invisible against its own colour.
      lineColor="#ffffff"
      intensity={1}
      shineSize={10}
      shineFade={40}
      thickness={1}
      proximity={250}
      followMouse
      {...TONE[tone]}
      {...rest}
    />
  );
}
