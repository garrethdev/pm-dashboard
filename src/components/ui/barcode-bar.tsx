import { cn } from "@/lib/utils";

/**
 * Barcode-style progress bar (Transcope's fleet-distribution treatment):
 * a dim full-width track of ticks with the filled portion in color.
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
    <div className={cn("relative h-3.5", className)}>
      <div className="barcode absolute inset-0 bg-text-muted/25" />
      <div
        className={cn("barcode absolute inset-y-0 left-0", colorClass)}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}
