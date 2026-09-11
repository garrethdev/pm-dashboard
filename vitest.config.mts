import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Test setup for the dashboard.
 *
 * These are unit tests over pure logic — no browser, no database, no network.
 * That is a deliberate limit, not a stage on the way to something bigger: the
 * value here is catching the class of bug the 2026-09-09 external review found,
 * and every one of those was a rule that could be checked without leaving the
 * process.
 *
 * `@/` has to be declared here as well as in tsconfig.json. Vitest does not
 * read TypeScript path aliases, so without this every `@/lib/...` import in a
 * test fails to resolve.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
