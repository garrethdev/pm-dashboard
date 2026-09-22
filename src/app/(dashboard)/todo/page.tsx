import { redirect } from "next/navigation";
import { TodoView } from "@/components/dashboard/todo-view";
import { parseTodoDay, parseTodoState } from "@/lib/data/todo-placeholder";
import { getTodoBoard } from "@/lib/data/todo";
import { getFleet } from "@/lib/fleet-server";

/**
 * To-do today — design ticket P2. Physical only: Cloud posts through the robot
 * and has no hand-made work, so there is no list to show there.
 *
 * `?todo=` draws one of the placeholder states, which is how the page is
 * judged in states live data will not produce on demand. Without it the page
 * is the real list (PF-07); `?day=` still steps the day either way.
 */
export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const fleet = await getFleet();
  if (fleet !== "physical") redirect("/");

  const params = await searchParams;
  const day = parseTodoDay(params.day);
  const drawn = params.todo !== undefined;
  // A failed read leaves the page to say so rather than crashing it; the view
  // shows its own empty state and the day can still be stepped.
  const live = drawn
    ? undefined
    : await getTodoBoard(day)
        .then((b) => ({ initial: b.devices, extras: b.extras, initialDay: day }))
        .catch(() => undefined);

  return <TodoView state={parseTodoState(params.todo)} initialDay={day} live={live} />;
}
