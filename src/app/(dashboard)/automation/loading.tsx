import { DashCard } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/** Mirrors AutomationPage: heading, then the single "Daily workflows" table. */
export default function AutomationLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Automation</h1>
      <DashCard title="Daily workflows">
        <TableSkeleton rows={12} />
      </DashCard>
    </div>
  );
}
