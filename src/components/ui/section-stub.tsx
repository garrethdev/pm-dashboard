import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder detail page body until the section is built in Phase 1. */
export function SectionStub({ title, phase = "Phase 1" }: { title: string; phase?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Coming in {phase}.
        </p>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </Card>
    </div>
  );
}
