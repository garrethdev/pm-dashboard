"use client";

import { useLayoutEffect } from "react";

/**
 * Puts the saved light theme back on a page answered with a real 404.
 *
 * The root layout's head script sets `data-theme` before first paint. When
 * Next answers a not-found with a 404 status, React draws `<html>` itself
 * rather than adopting the server's, and in doing so drops every attribute it
 * was not given, `data-theme` included: a light-mode viewer got the dark
 * theme (P13 review, 2026-09-23). A layout effect runs before any passive
 * effect, so the sidebar's theme switch reads the corrected value.
 */
export function ReapplyTheme() {
  useLayoutEffect(() => {
    try {
      if (localStorage.getItem("pm-theme") === "light") {
        document.documentElement.dataset.theme = "light";
      }
    } catch {}
  }, []);
  return null;
}
