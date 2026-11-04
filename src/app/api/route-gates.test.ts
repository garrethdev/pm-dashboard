import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Every route under src/app/api must refuse a caller with no right to it, and
// must do so BEFORE it reads the request body or touches the database.
//
// proxy.ts is only the outer door, and it deliberately lets six groups of
// routes past with no sign-in at all (the warmup robot, the schedules, the
// production sheet, the Facebook robot, content tagging, the screen reader).
// For those the route's own token check is the only lock, so a handler added
// there without one is open to the internet. `accounts` holds live passwords
// and tokens one table away from every one of these routes.

const API = join(__dirname);
const GATES = /\b(requireSession|requireReviewer|requireSchedulerToken|requireRunnerToken|requireBearerToken|guard)\(/;
const WORK = /\b(req|request)\.(json|formData|text)\(|\b(sbRest|sbRpc|dbGet|dbGetAll|dbInsert|dbPatch|dbDelete|fetch)\(/;

/** Routes proxy.ts lets in with no session, and the token check each must make. */
const OPEN: { prefix: string; token: RegExp }[] = [
  { prefix: "warmup-runner/", token: /requireRunnerToken\(/ },
  { prefix: "carousel-generator/maintenance/", token: /requireSchedulerToken\(/ },
  { prefix: "sheet-inventory", token: /requireBearerToken\(/ },
  { prefix: "facebook-analytics/ingest", token: /requireSchedulerToken\(|requireBearerToken\(/ },
  { prefix: "content-tags/run", token: /requireSchedulerToken\(|requireBearerToken\(/ },
  { prefix: "screen-readings/run", token: /requireSchedulerToken\(|requireBearerToken\(/ },
];

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routes(p);
    return name === "route.ts" ? [p] : [];
  });
}

function handlers(src: string): { method: string; body: string }[] {
  const parts = src.split(/^export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/m);
  const out: { method: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ method: parts[i]!, body: parts[i + 1]! });
  return out;
}

const files = routes(API).map((f) => ({ name: relative(API, f).replace(/\/route\.ts$/, ""), src: readFileSync(f, "utf8") }));

describe("every API route is gated", () => {
  it("finds the routes", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const { name, src } of files) {
    // The JSON 404 for unknown /api addresses: open on purpose, so it must do
    // nothing but say "not found".
    if (name === "[...missing]") {
      it(`${name} is open and touches nothing`, () => {
        expect(WORK.test(src)).toBe(false);
      });
      continue;
    }
    it(`${name}`, () => {
      const hs = handlers(src);
      expect(hs.length, "no GET/POST/PUT/PATCH/DELETE function found; export handlers as functions so this check can see them").toBeGreaterThan(0);
      const open = OPEN.find((o) => name === o.prefix || name.startsWith(o.prefix));
      for (const h of hs) {
        const gate = h.body.search(GATES);
        expect(gate, `${h.method} ${name} has no auth check`).toBeGreaterThanOrEqual(0);
        const before = h.body.slice(0, gate);
        expect(WORK.test(before), `${h.method} ${name} reads the request or the database before its auth check`).toBe(false);
        if (open) expect(open.token.test(h.body), `${h.method} ${name} is let past the sign-in gate in proxy.ts and must check its own token`).toBe(true);
      }
    });
  }
});
