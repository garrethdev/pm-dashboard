import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The design system has three copies of the same numbers, and this test is the
 * only thing stopping them drifting apart.
 *
 * `src/app/globals.css` is the source of truth. `docs/design-system.html` is the
 * rendered reference a designer or a new screen is built against, and
 * `docs/DESIGN-TOKENS.md` is the written one. Both restate every token value,
 * because neither can run Tailwind — the HTML has to open by double-click with
 * no build step, and the markdown is prose.
 *
 * Restating values is normally how a reference goes stale within a week. So the
 * claim that globals.css is authoritative is enforced here instead of merely
 * written down: change a colour in globals.css without mirroring it and this
 * test names the token that drifted.
 *
 * It is a pure file-parsing check — no browser, no database, no network — which
 * is the limit this suite deliberately keeps.
 */

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const globalsCss = read("../app/globals.css");
const referenceHtml = read("../../docs/design-system.html");
const tokensMd = read("../../docs/DESIGN-TOKENS.md");

/**
 * Comments have to go before anything else is parsed. globals.css documents its
 * own reasoning heavily, and that prose mentions token names and hex values
 * ("swap --accent/--accent-deep", "fill #16161a @ 60%") that would otherwise be
 * read as declarations.
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Take the body of one CSS block by brace counting rather than by regex to the
 * next `}`. Values here contain parentheses and commas but the counting also
 * survives a nested rule being added later, where a lazy regex would silently
 * truncate.
 *
 * `selector` is matched literally and must be followed only by whitespace and
 * the opening brace, so `:root` does not also match
 * `:root[data-theme="light"] .dark-only`.
 */
function blockBody(css: string, selector: string): string {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "g");
  const match = pattern.exec(css);
  if (!match) throw new Error(`No \`${selector}\` block found`);

  let depth = 1;
  const start = match.index + match[0].length;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i);
    }
  }
  throw new Error(`Unterminated \`${selector}\` block`);
}

/**
 * Values are compared whitespace-insensitively. The same shadow stack is
 * line-wrapped differently in the two files — that is formatting, not drift,
 * and a test that failed on it would just train people to stop running it.
 */
const normalise = (value: string) => value.trim().replace(/\s+/g, " ");

function customProperties(body: string): Map<string, string> {
  const out = new Map<string, string>();
  // Split on semicolons: no token value in either file contains one.
  for (const decl of body.split(";")) {
    const at = decl.indexOf(":");
    if (at === -1) continue;
    const name = decl.slice(0, at).trim();
    if (!name.startsWith("--")) continue;
    out.set(name, normalise(decl.slice(at + 1)));
  }
  return out;
}

const cssRoot = customProperties(blockBody(stripComments(globalsCss), ":root"));
const cssLight = customProperties(
  blockBody(stripComments(globalsCss), ':root[data-theme="light"]'),
);
/** Radii and the Tailwind colour aliases live in `@theme inline`, not `:root`. */
const cssTheme = customProperties(blockBody(stripComments(globalsCss), "@theme inline"));

const htmlRoot = customProperties(blockBody(stripComments(referenceHtml), ":root"));
const htmlLight = customProperties(
  blockBody(stripComments(referenceHtml), ':root[data-theme="light"]'),
);

/**
 * The reference page adds the two radius tokens to `:root` because it has no
 * Tailwind to read `@theme inline` from. They are checked against `@theme`
 * instead of against `:root`, and excluded from the "nothing invented" sweep.
 */
const FROM_THEME_BLOCK = ["--radius-card", "--radius-nested"];

describe("globals.css parses as expected", () => {
  it("finds a non-trivial token set in every block", () => {
    // Guards the parser itself: a regex that silently matched nothing would
    // otherwise make every assertion below pass against two empty maps.
    expect(cssRoot.size).toBeGreaterThan(30);
    expect(cssLight.size).toBeGreaterThan(25);
    expect(cssTheme.size).toBeGreaterThan(20);
    expect(htmlRoot.size).toBeGreaterThan(30);
    expect(htmlLight.size).toBeGreaterThan(25);
  });
});

describe("docs/design-system.html mirrors globals.css", () => {
  it("carries every dark-mode token, with the same value", () => {
    const missing: string[] = [];
    const drifted: string[] = [];

    for (const [name, value] of cssRoot) {
      const mirrored = htmlRoot.get(name);
      if (mirrored === undefined) missing.push(name);
      else if (mirrored !== value) drifted.push(`${name}: css=${value} html=${mirrored}`);
    }

    expect({ missing, drifted }).toEqual({ missing: [], drifted: [] });
  });

  it("carries every light-mode token, with the same value", () => {
    const missing: string[] = [];
    const drifted: string[] = [];

    for (const [name, value] of cssLight) {
      const mirrored = htmlLight.get(name);
      if (mirrored === undefined) missing.push(name);
      else if (mirrored !== value) drifted.push(`${name}: css=${value} html=${mirrored}`);
    }

    expect({ missing, drifted }).toEqual({ missing: [], drifted: [] });
  });

  it("matches the radii declared in @theme inline", () => {
    for (const name of FROM_THEME_BLOCK) {
      expect(htmlRoot.get(name), `${name} in the reference page`).toBe(cssTheme.get(name));
    }
  });

  it("invents no token of its own", () => {
    // A token that exists only in the reference is worse than a missing one: it
    // looks authoritative and nothing in the app honours it.
    const invented = [...htmlRoot.keys()].filter(
      (name) => !cssRoot.has(name) && !FROM_THEME_BLOCK.includes(name),
    );
    const inventedLight = [...htmlLight.keys()].filter((name) => !cssLight.has(name));

    expect({ invented, inventedLight }).toEqual({ invented: [], inventedLight: [] });
  });
});

describe("docs/DESIGN-TOKENS.md mirrors globals.css", () => {
  /**
   * The markdown is prose with tables, not CSS, so it is checked the only way
   * that is honest for prose: every dark-mode token name must appear, and its
   * value must appear somewhere on the same line. That catches the realistic
   * failure — a hex edited in globals.css and forgotten here — without
   * pretending to parse a document that has no grammar.
   */
  it("lists every dark-mode token with its current value", () => {
    const lines = tokensMd.split("\n");
    const problems: string[] = [];

    for (const [name, value] of cssRoot) {
      const onLines = lines.filter((line) => line.includes(`${name}`));
      if (onLines.length === 0) {
        problems.push(`${name} is not documented`);
        continue;
      }
      const compact = (s: string) => s.replace(/\s+/g, "");
      if (!onLines.some((line) => compact(line).includes(compact(value)))) {
        problems.push(`${name} is documented without its value (${value})`);
      }
    }

    expect(problems).toEqual([]);
  });
});
