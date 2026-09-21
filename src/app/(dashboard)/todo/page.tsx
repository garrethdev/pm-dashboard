import { redirect } from "next/navigation";
import { TodoView } from "@/components/dashboard/todo-view";
import { parseTodoDay, parseTodoState } from "@/lib/data/todo-placeholder";
import { getFleet } from "@/lib/fleet-server";

/**
 * To-do today — design ticket P2. Physical only: Cloud posts through the robot
 * and has no hand-made work, so there is no list to show there.
 *
 * `?todo=` and `?day=` only pick which placeholder state draws, for the design
 * review. Both go when PF-07 makes the list real.
 */
export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const fleet = await getFleet();
  if (fleet !== "physical") redirect("/");

  const params = await searchParams;
  return (
    <TodoView state={parseTodoState(params.todo)} initialDay={parseTodoDay(params.day)} />
  );
}
