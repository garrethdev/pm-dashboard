import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every dashboard page has an MCP tool, or a written reason it has none
 * (Garreth, 2026-11-26: "anything can be exported from the PM dashboard").
 * A new page without a tool fails here until someone decides which.
 *
 * Reads files as text: no database, no readers loaded.
 */

const APP = join(__dirname, "..", "..", "app");
const TOOLS = join(__dirname, "tools");

/** Pages with nothing to read, and why. */
const NO_TOOL: Record<string, string> = {
  "/login": "The sign-in page.",
  "/[...missing]": "The not-found page.",
  "/generate": "A row of links into the generators; nothing of its own to read.",
  "/carousel-generator/generate": "The form that starts a batch (a write). Its types, templates and libraries are in pm_carousels.",
};

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "api" ? [] : pages(p);
    return name === "page.tsx" ? [p] : [];
  });
}

/** src/app/(dashboard)/accounts/[profile]/page.tsx → /accounts/[profile] */
function routeOf(file: string): string {
  const parts = relative(APP, file)
    .split(sep)
    .slice(0, -1)
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return "/" + parts.join("/");
}

function toolPages(): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of readdirSync(TOOLS)) {
    if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
    const src = readFileSync(join(TOOLS, name), "utf8");
    const tool = src.match(/name:\s*"(pm_[a-z_]+)"/)?.[1];
    // A list of quoted strings, so the "]" inside "[id]" does not end it.
    const block = src.match(/pages:\s*\[((?:\s*"[^"]*"\s*,?)*)\s*\]/)?.[1];
    if (!tool || block === undefined) continue;
    for (const m of block.matchAll(/"([^"]+)"/g)) out.set(m[1], tool);
  }
  return out;
}

describe("MCP page coverage", () => {
  const routes = pages(APP).map(routeOf).sort();
  const covered = toolPages();

  it("finds the dashboard's pages", () => {
    expect(routes.length).toBeGreaterThan(25);
  });

  it("gives every page a tool or a reason", () => {
    const missing = routes.filter((r) => !covered.has(r) && !NO_TOOL[r]);
    expect(missing).toEqual([]);
  });

  it("names only pages that exist", () => {
    const stale = [...covered.keys()].filter((r) => !routes.includes(r));
    expect(stale).toEqual([]);
  });

  it("lists every tool file in the registry", () => {
    const index = readFileSync(join(TOOLS, "index.ts"), "utf8");
    const files = readdirSync(TOOLS).filter((n) => n.endsWith(".ts") && !["index.ts", "common.ts"].includes(n) && !n.endsWith(".test.ts"));
    const unlisted = files.filter((f) => !index.includes(`/tools/${f.replace(/\.ts$/, "")}"`));
    expect(unlisted).toEqual([]);
  });
});
