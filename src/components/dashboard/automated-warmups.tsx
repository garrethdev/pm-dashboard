import { AutomatedMark } from "@/components/dashboard/todo-board";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import type { TodoItem } from "@/lib/data/todo-placeholder";

/**
 * What an Automated account shows where a Manual one shows its Log warmup
 * card — PF-13 part 3 (Garreth, 2026-09-28).
 *
 * The day's two warmups are still listed, the tasks the script should do, but
 * as rows nobody can press, each marked with the same robot the To-do list
 * uses. Each says where it stands in one word: Done, Running, Stopped or Not
 * yet — the To-do list's own words. Past three days with no finished warmup,
 * a red line says so.
 */

type Word = { tone: PillTone; label: string; detail: string | null };

/** The one word for a scripted warmup, and the line under it. */
export function automatedWord(item: TodoItem): Word {
  if (item.status === "logged") {
    return {
      tone: "accent",
      label: "Done",
      detail: [item.doneAt, item.loggedMinutes ? `${item.loggedMinutes} min` : null].filter(Boolean).join(" · ") || null,
    };
  }
  if (item.run?.state === "running") return { tone: "info", label: "Running", detail: `started ${item.run.at}` };
  if (item.run?.state === "stopped") return { tone: "danger", label: "Stopped", detail: `last heard ${item.run.at}` };
  return {
    tone: "gray",
    label: "Not yet",
    // A run that ended short leaves its minutes behind; say how far it got.
    detail: item.loggedMinutes ? `${item.loggedMinutes} of ${item.targetMinutes} min` : null,
  };
}

/** "No warmup in 4 days", in red. */
export function OverdueWarmup({ days }: { days: number }) {
  return <StatusPill tone="danger">No warmup in {days} days</StatusPill>;
}

/** The account page's card: the two warmups, to read. */
export function AutomatedWarmupToday({
  items,
  overdueDays,
}: {
  items: TodoItem[];
  overdueDays: number | null;
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-card border border-border bg-card px-4 py-3 shadow-card">
      {overdueDays !== null && (
        <span>
          <OverdueWarmup days={overdueDays} />
        </span>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const word = automatedWord(item);
          return (
            <li key={item.id} className="flex min-w-0 items-center gap-2">
              <AutomatedMark />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{item.label}</span>
                {word.detail && <span className="tnum truncate text-xs text-text-muted">{word.detail}</span>}
              </span>
              <StatusPill tone={word.tone}>{word.label}</StatusPill>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The phone page's one line keeps its one pill (Garreth, 2026-09-22: "remove
 * the detailed list"). For an Automated account it cannot be pressed — there
 * is nothing on the To-do list to go and do — and carries the robot. Stopped
 * wins over Running wins over the count, because it is the one to see.
 */
export function AutomatedWarmupPill({ items }: { items: TodoItem[] }) {
  const warmups = items.filter((i) => i.kind === "warmup");
  if (warmups.length === 0) return null;
  const done = warmups.filter((i) => i.status === "logged").length;
  const word: Word = warmups.some((i) => i.run?.state === "stopped")
    ? { tone: "danger", label: "Stopped", detail: null }
    : warmups.some((i) => i.run?.state === "running")
      ? { tone: "info", label: "Running", detail: null }
      : done === warmups.length
        ? { tone: "accent", label: "Warmup done", detail: null }
        : { tone: "gray", label: `Warmup ${done} of ${warmups.length}`, detail: null };
  return (
    <span className="flex items-center gap-1.5">
      <AutomatedMark />
      <StatusPill tone={word.tone}>{word.label}</StatusPill>
    </span>
  );
}
