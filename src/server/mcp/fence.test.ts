import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The import fence (Garreth, 2026-11-26): nothing in src/server/mcp may import
 * code that writes, signs links to private files, or reads a secret. The MCP
 * server is read-only because there is no path from it to any of those.
 *
 * This reads the files as text, so it needs no database and loads none of the
 * readers.
 */

const ROOT = join(__dirname);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}

interface Import {
  file: string;
  from: string;
  names: string[];
}

function imports(file: string): Import[] {
  const src = readFileSync(file, "utf8");
  const out: Import[] = [];
  const re = /import\s+(type\s+)?(\{[^}]*\}|[\w*\s,]+?)\s+from\s+["']([^"']+)["']/g;
  for (const m of src.matchAll(re)) {
    if (m[1]) continue; // `import type` brings in no code
    const names = m[2]
      .replace(/[{}]/g, "")
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n && !n.startsWith("type "))
      .map((n) => n.split(/\s+as\s+/)[0].trim());
    out.push({ file: relative(ROOT, file), from: m[3], names });
  }
  return out;
}

/** Modules that write, sign links, hold secrets or call vendors directly. */
const BLOCKED_MODULES: RegExp[] = [
  /\/writes$/,
  /-writes$/,
  /\/ban-cleanups$/,
  /\/move-to-cloud$/,
  /\/supabase\/(admin|server)$/,
  /\/carousel\/repo\/(db|connections|storage)$/,
  /\/carousel\/(services|batches|machine|http)/,
  /\/data\/(proxycheap|textverified|geelark|wallet|storage-sign|phone-session-storage|phone-session-review|warmup-report-review)$/,
  /\/server\/(r2|auto-holds|content-tags|screen-readings|follow-creators-refresh|music-trends|facebook-analytics|audience-readings)$/,
];

/** Names that read secrets or sign private links, wherever they live. */
const BLOCKED_NAMES = new Set([
  "createAdminClient",
  "createClient",
  "fetchProxyCredentials",
  "readConnection",
  "signStorageUrls",
  "sbRpc",
  "dbInsert",
  "dbPatch",
  "dbDelete",
  "dbUpsert",
  "actingUserEmail",
  "auditLog",
]);

/** A name that starts with a verb that changes something. */
const WRITE_VERB =
  /^(set|save|write|insert|update|upsert|delete|remove|create|mark|toggle|cast|queue|start|finish|record|announce|approve|clear|move|retire|pause|resume|assign|unassign|send|apply|replace|patch|put|post|claim|release|revalidate|notify|enqueue|refresh|sync|upload|retry|cancel|reset)[A-Z_]/;

describe("MCP import fence", () => {
  const all = files(ROOT).flatMap(imports);

  it("finds the MCP files", () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it("imports no module that writes, signs links or holds secrets", () => {
    const bad = all.filter((i) => BLOCKED_MODULES.some((re) => re.test(i.from)));
    expect(bad.map((i) => `${i.file} imports ${i.from}`)).toEqual([]);
  });

  it("imports no secret reader and no write function by name", () => {
    // The gate's own test hook is the one exception: it resets memory, not data.
    // Only the project's own code is judged: node:crypto's createHash is not a write.
    const bad = all.filter((i) => i.from.startsWith("@/")).flatMap((i) =>
      i.names
        .filter((n) => BLOCKED_NAMES.has(n) || (WRITE_VERB.test(n) && !(n === "resetGate" && i.from.endsWith("/gate"))))
        .map((n) => `${i.file} imports ${n} from ${i.from}`),
    );
    expect(bad).toEqual([]);
  });

  it("marks every tool read-only when it registers it", () => {
    const server = readFileSync(join(ROOT, "server.ts"), "utf8");
    expect(server).toMatch(/readOnlyHint:\s*true/);
    expect(server).toMatch(/destructiveHint:\s*false/);
    const registry = readFileSync(join(ROOT, "registry.ts"), "utf8");
    expect(registry).toMatch(/kind:\s*"read"/);
  });
});
