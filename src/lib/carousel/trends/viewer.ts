/** Keep the selected slide reachable without making long decks overflow phones. */
export function visibleSlideIndices(count: number, selected: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(selected) || selected < 0 || selected >= count) return [];
  const length = Math.min(count, 7);
  const start = Math.min(Math.max(0, selected - 3), count - length);
  return Array.from({ length }, (_, index) => start + index);
}

/** Native dialog backdrop events target the dialog itself. Bounding coordinates
 * distinguish the outside scrim from blank space inside the dialog. */
export function outsideDialog(x: number, y: number, rect: { left: number; top: number; right: number; bottom: number }) {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}

/** Positive delta means reading farther down. Collapse only at the panel's top,
 * so ordinary scrolling back through a long analysis never hides its content. */
export function sheetScrollAction(expanded: boolean, scrollTop: number, deltaX: number, deltaY: number): "expand" | "collapse" | null {
  if (![scrollTop, deltaX, deltaY].every(Number.isFinite) || Math.abs(deltaY) < 24 || Math.abs(deltaX) >= Math.abs(deltaY)) return null;
  if (!expanded && deltaY > 0) return "expand";
  if (expanded && scrollTop <= 1 && deltaY < 0) return "collapse";
  return null;
}
