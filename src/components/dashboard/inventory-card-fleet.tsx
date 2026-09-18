import { InventoryCardLive } from "@/components/dashboard/inventory-card-live";
import { getFleet } from "@/lib/fleet-server";

/**
 * The homepage Inventory card for the fleet being looked at (Cloud or
 * Physical, top right). The cookie is read here, not in inventory-card-live:
 * that file also exports colour helpers to browser-side cards, and a
 * server-only import there breaks the browser build.
 */
export async function InventoryCardForFleet({ className }: { className?: string }) {
  return <InventoryCardLive className={className} fleet={await getFleet()} />;
}
