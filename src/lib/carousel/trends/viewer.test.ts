import { describe, expect, it } from "vitest";
import { outsideDialog, visibleSlideIndices, sheetScrollAction } from "./viewer";
describe("carousel viewer navigation", () => {
  it("expands for forward reading and collapses only at the top", () => {
    expect(sheetScrollAction(false, 0, 0, 30)).toBe("expand");
    expect(sheetScrollAction(true, 0, 0, -30)).toBe("collapse");
    expect(sheetScrollAction(true, 100, 0, -30)).toBeNull();
    expect(sheetScrollAction(true, 100, 0, 30)).toBeNull();
  });
  it.each([[30, 10], [0, 5], [30, 30], [0, NaN]])("ignores horizontal, tiny or invalid gestures", (x, y) => {
    expect(sheetScrollAction(false, 0, x, y)).toBeNull();
  });
  it("shows all dots for a short deck", () => expect(visibleSlideIndices(4, 2)).toEqual([0, 1, 2, 3]));
  it.each([0, 4, 25, 49])("keeps selected index %s in a bounded long-deck window", selected => {
    const result = visibleSlideIndices(50, selected);
    expect(result).toHaveLength(7);
    expect(result).toContain(selected);
    expect(result.every(index => index >= 0 && index < 50)).toBe(true);
  });
  it.each([[0, 0], [4, -1], [4, 4], [NaN, 0]])("rejects invalid navigation state", (count, selected) => expect(visibleSlideIndices(count, selected)).toEqual([]));
  it("distinguishes the backdrop from blank dialog space", () => {
    const rect = { left: 10, top: 20, right: 100, bottom: 200 };
    expect(outsideDialog(50, 50, rect)).toBe(false);
    expect(outsideDialog(10, 20, rect)).toBe(false);
    expect(outsideDialog(0, 50, rect)).toBe(true);
    expect(outsideDialog(50, 210, rect)).toBe(true);
  });
});
