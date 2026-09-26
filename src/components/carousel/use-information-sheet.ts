"use client";
import { useEffect, type RefObject } from "react";
import { sheetScrollAction } from "@/lib/carousel/trends/viewer";

/** Native non-passive listeners consume only sheet transitions. All other input
 * retains browser scrolling/zoom behavior. No animation means reduced-motion
 * users receive the same immediate, stable state change. */
export function useInformationSheet(panel: RefObject<HTMLDivElement | null>, enabled: boolean, expanded: boolean, setExpanded: (expanded: boolean) => void) {
  useEffect(() => {
    const node = panel.current;
    if (!enabled || !node) return;
    const phone = window.matchMedia("(max-width: 767px)");
    let touch: { x: number; y: number } | null = null;
    function apply(event: Event, x: number, y: number) {
      if (!phone.matches || !event.cancelable) return;
      const action = sheetScrollAction(expanded, node!.scrollTop, x, y);
      if (!action) return;
      event.preventDefault();
      setExpanded(action === "expand");
    }
    function wheel(event: WheelEvent) {
      if (event.ctrlKey) return; // Trackpad pinch zoom must remain native.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node!.clientHeight : 1;
      apply(event, event.deltaX * unit, event.deltaY * unit);
    }
    function start(event: TouchEvent) {
      touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }
    function move(event: TouchEvent) {
      if (event.touches.length !== 1) { touch = null; return; }
      if (!touch) return;
      const current = event.touches[0];
      const x = touch.x - current.clientX, y = touch.y - current.clientY;
      apply(event, x, y);
      if (event.defaultPrevented || Math.abs(x) >= 24 || Math.abs(y) >= 24) touch = { x: current.clientX, y: current.clientY };
    }
    function end() { touch = null; }
    node.addEventListener("wheel", wheel, { passive: false });
    node.addEventListener("touchstart", start, { passive: true });
    node.addEventListener("touchmove", move, { passive: false });
    node.addEventListener("touchend", end);
    node.addEventListener("touchcancel", end);
    return () => {
      node.removeEventListener("wheel", wheel); node.removeEventListener("touchstart", start);
      node.removeEventListener("touchmove", move); node.removeEventListener("touchend", end); node.removeEventListener("touchcancel", end);
    };
  }, [panel, enabled, expanded, setExpanded]);
}
