import { CardSkeleton } from "@/components/ui/card-skeleton";

/**
 * Route-level loading state, shown the instant Inventory is clicked.
 *
 * The page already wraps its live cards in Suspense, but that fallback cannot
 * appear until the server has answered, and from Manila that is roughly half a
 * second of nothing happening on a link the user has already clicked. Next
 * prefetches this file with the route's static shell, so it is on the client
 * before the click and renders immediately.
 *
 * It mirrors the page's own frame — same heading, same gap, same card titles —
 * so the swap to real content moves nothing on screen. A skeleton that is the
 * wrong shape trades a frozen page for a jumping one.
 */
export default function InventoryLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <CardSkeleton title="Demand vs supply" lines={8} />
      <CardSkeleton title="What to make next" lines={6} />
    </div>
  );
}
