import { cookies } from "next/headers";
import { FLEET_COOKIE, parseFleet, type Fleet } from "@/lib/fleet";

/** The fleet this person is looking at, from their own cookie. Server only. */
export async function getFleet(): Promise<Fleet> {
  const store = await cookies();
  return parseFleet(store.get(FLEET_COOKIE)?.value);
}
