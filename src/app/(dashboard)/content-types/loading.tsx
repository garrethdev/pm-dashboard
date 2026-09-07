import { DashCard } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/** Mirrors ContentTypesView, whose heading is text-lg rather than text-xl. */
export default function ContentTypesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Content types</h1>
      <DashCard title="Content types">
        <TableSkeleton rows={12} />
      </DashCard>
    </div>
  );
}
