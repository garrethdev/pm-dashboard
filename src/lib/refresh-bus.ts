"use client";

import { useEffect } from "react";

/**
 * Lets the Refresh button reach data a page is holding in its own state.
 *
 * The second half of the 2026-09-09 review's #5, and the half that actually
 * showed. Expiring the server caches and calling `router.refresh()` re-renders
 * the server components — but Calendar, Analytics, Content Types,
 * Demand/Supply, Incident History and the per-account analytics all seed React
 * state from their first server render and then fetch every later slice
 * themselves. `router.refresh()` hands those components a new `initial` prop
 * and they ignore it, because they are past their first render and are showing
 * whatever range, month or filter the user has since picked.
 *
 * So on those pages the button expired the caches correctly, re-rendered
 * correctly, and left the screen exactly as it was. Pressing it appeared to do
 * nothing — which is worse than doing nothing, because it is an invitation to
 * trust a number that was never re-read.
 *
 * Each view registers what "reload what I am currently showing" means for it.
 * The Topbar calls them all after the caches are expired.
 *
 * Deliberately a module-level set rather than a React context: the Topbar lives
 * in the dashboard layout and the views are scattered down the tree under it,
 * so a provider would have to wrap everything to reach them, and the thing
 * being shared is one function call with no rendering behaviour attached.
 */

type Reloader = () => void | Promise<void>;

const listeners = new Set<Reloader>();

/**
 * Register a reload for as long as the component is mounted.
 *
 * Pass the view's existing loader, bound to the slice it is showing — e.g.
 * `useDataRefresh(() => load(range))`. Give it a `useCallback` or an inline
 * arrow with the right deps; it re-subscribes whenever the function identity
 * changes, so a stale closure would otherwise reload the range the user was
 * looking at two clicks ago.
 */
export function useDataRefresh(reload: Reloader): void {
  useEffect(() => {
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);
}

/**
 * Ask every mounted view to re-read its current slice.
 *
 * Settled, not raced: one view failing to reload must not stop the others, and
 * the Refresh button's spinner should stay up until they have all finished or
 * given up. Each view already handles its own errors on screen.
 */
export async function reloadClientViews(): Promise<void> {
  await Promise.allSettled([...listeners].map((fn) => fn()));
}
