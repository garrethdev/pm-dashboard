import { DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Suspense fallback for a live card — header renders, body pulses. */
export function CardSkeleton({
  title,
  className,
  lines = 5,
}: {
  title: string;
  className?: string;
  lines?: number;
}) {
  return (
    <DashCard title={title} className={className}>
      <div className="flex flex-col gap-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    </DashCard>
  );
}
