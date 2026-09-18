"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Makes every element between this one and the page's <main> grow (and pass
 * its height down), so an empty list's card reaches the bottom of the screen
 * with the message centred in it.
 *
 * The page frame already does this in CSS, with `:has([data-empty-fill])` (see
 * app-shell.tsx), and that is what paints first. It is not enough on its own:
 * Safari does not re-check `:has()` when a page's content is streamed in after
 * the frame, which is how every page here arrives, so in Safari the card stayed
 * short (Garreth, 2026-09-19). This sets the same flex-grow by hand once the
 * page is live, which works everywhere.
 *
 * An inline style rather than a class: React rewrites `className` on its own
 * elements, but leaves alone a style property it never set.
 */
export function FillAncestors() {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const undo: (() => void)[] = [];
    let el = ref.current?.parentElement?.parentElement ?? null;
    while (el && el.tagName !== "MAIN") {
      const node = el;
      if (!node.style.flexGrow) {
        node.style.flexGrow = "1";
        undo.push(() => (node.style.flexGrow = ""));
      }
      // A plain wrapper (a table's scroll box, say) would take the height but
      // not pass it down, leaving the message at the top of a tall card. As a
      // column it hands the room on to what it holds.
      if (!getComputedStyle(node).display.includes("flex")) {
        node.style.display = "flex";
        node.style.flexDirection = "column";
        undo.push(() => {
          node.style.display = "";
          node.style.flexDirection = "";
        });
      }
      el = node.parentElement;
    }
    return () => undo.forEach((u) => u());
  }, []);

  return <span ref={ref} hidden />;
}
