import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder rows at the real table's pitch.
 *
 * Rows in these tables are `py-2.5` on `text-sm`: 10 + 20 + 10 = 40px each. A
 * 36px bar plus a 4px gap comes to the same 40, so N placeholder rows occupy
 * exactly the height N real rows will, and the swap does not move anything
 * below the table.
 *
 * `header` adds the head row, which is `pb-6` on `text-xs` — 16 + 24 = 40px too.
 */
export function TableSkeleton({
  rows = 8,
  header = true,
  className,
}: {
  rows?: number;
  header?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {header && <Skeleton className="mb-0 h-9 w-2/3 shrink-0" />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full shrink-0" />
      ))}
    </div>
  );
}
