"use client";

import { useEffect, useState } from "react";
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
 * Colours are hex literals rather than CSS variables because the shine is drawn
 * in WebGL — ogl's Color parser takes hex, not `var(--accent)`. That is also
 * why the theme has to be read in JS here instead of falling out of the
 * cascade like every other themed colour in the app. The light values are the
 * deeper ones the rest of light mode uses, so the one saturated control on a
 * near-white page is not the single element still shouting in dark-mode cyan.
 *
 * Use it for the one action a screen is asking for. Each instance owns a WebGL
 * context and an animation frame loop, so it does not belong on filter pills,
 * table row actions or anything that repeats.
 */
const TONE = {
  dark: {
    accent: { tint: "#22d3ee", textColor: "#0b0b0c", baseColor: "#0e9bb5" },
    danger: { tint: "#ff4949", textColor: "#ffffff", baseColor: "#a01d1d" },
  },
  light: {
    accent: { tint: "#0e7490", textColor: "#ffffff", baseColor: "#155e75" },
    danger: { tint: "#b91c1c", textColor: "#ffffff", baseColor: "#7f1d1d" },
  },
} as const;

/**
 * The active theme, as a value React can render with.
 *
 * The sidebar switch writes `data-theme` straight onto <html> and a head script
 * restores it before first paint, so there is no context to subscribe to — an
 * observer on the attribute is the subscription. Starts at "dark" to match what
 * the server rendered; the effect corrects it before the first paint the user
 * sees, and the only visible property is a WebGL fill colour.
 */
function useThemeName(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function CtaButton({
  tone = "accent",
  ...rest
}: Omit<SpecularButtonProps, "lineColor" | "baseColor" | "textColor" | "tint" | "tintOpacity"> & {
  tone?: keyof (typeof TONE)["dark"];
}) {
  const theme = useThemeName();

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
      {...TONE[theme][tone]}
      {...rest}
    />
  );
}
