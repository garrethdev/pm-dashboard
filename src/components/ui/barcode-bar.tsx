import { cn } from "@/lib/utils";

/** Solid colour for the last 12px of the fill, gone by 44px in. */
const TIP_MASK = "linear-gradient(to left, #000 0 12px, transparent 44px)";

/**
 * The inventory bars: a dark rounded track with a fill that only takes on its
 * status colour at the leading edge.
 *
 * The fill is a solid block of `colorClass` masked by an alpha ramp, rather
 * than a CSS gradient. A gradient would need the colour as a value — two stops
 * to interpolate between — and every caller has it as a Tailwind `bg-*` class
 * instead. Masking keeps that API: the block stays one flat colour and the mask
 * decides how much of it shows, revealing the track underneath as it fades.
 *
 * The ramp is measured in pixels from the right edge, not as a percentage of
 * the fill. A percentage scales the coloured cap with the value, so a lane at
 * one day of cover — the one that most needs to be seen — would shrink its own
 * highlight to nothing. Fixed from the tip, every bar caps at the same size and
 * a short bar simply reads as solid colour.
 */
export function BarcodeBar({
  pct,
  colorClass = "bg-accent",
  className,
}: {
  pct: number;
  colorClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative h-3.5 overflow-hidden rounded-[4px] bg-text-muted/20", className)}>
      <div
        className={cn("absolute inset-y-0 left-0 rounded-[4px]", colorClass)}
        style={{
          width: `${Math.min(Math.max(pct, 0), 100)}%`,
          WebkitMaskImage: TIP_MASK,
          maskImage: TIP_MASK,
        }}
      />
    </div>
  );
}
