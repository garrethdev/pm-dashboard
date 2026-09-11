import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ACCOUNTS_TAG,
  ACCOUNT_ANALYTICS_TAG,
  ANALYTICS_TAG,
  CALENDAR_TAG,
  CONTENT_TYPES_TAG,
  DATA_TAGS,
  INCIDENTS_TAG,
  INVENTORY_TAG,
  accountDetailTag,
  forensicsTag,
} from "@/lib/data/cache";

/**
 * The Refresh button's reach, which is the first half of the 2026-09-09
 * external review's #5.
 *
 * `DATA_TAGS` is the entire list of what Refresh expires. A cache whose key
 * carries a range or a date is reachable ONLY through a family tag, so a family
 * tag that is not in this list means Refresh silently does nothing for that
 * panel — no error, no clue, just numbers that never move. Four families were
 * in exactly that state until 2026-09-11.
 *
 * The last test reads the source of `src/lib/data/` and checks that every
 * family tag a fetcher actually asks for is in the list. That is unusual and
 * worth the oddity: the failure it catches is invisible at runtime, has no type
 * that can express it, and is one forgotten line away at any time.
 */

describe("DATA_TAGS", () => {
  it("contains every exported family tag", () => {
    for (const tag of [
      ACCOUNTS_TAG,
      ACCOUNT_ANALYTICS_TAG,
      ANALYTICS_TAG,
      CALENDAR_TAG,
      CONTENT_TYPES_TAG,
      INCIDENTS_TAG,
      INVENTORY_TAG,
    ]) {
      expect(DATA_TAGS, `${tag} is not in DATA_TAGS, so Refresh cannot reach it`).toContain(tag);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(DATA_TAGS).size).toBe(DATA_TAGS.length);
  });

  it("leaves out the per-profile tags, which Refresh resolves from the path", () => {
    // These are per-account and cannot be enumerated; /api/revalidate adds the
    // one for the page being looked at.
    expect(DATA_TAGS).not.toContain(accountDetailTag("Profile 20"));
    expect(DATA_TAGS).not.toContain(forensicsTag("Profile 20"));
  });
});

describe("every family tag a fetcher uses is expired by Refresh", () => {
  it("finds no tag in src/lib/data that DATA_TAGS misses", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = [
      "account-analytics.ts",
      "accounts.ts",
      "analytics.ts",
      "calendar.ts",
      "content-types.ts",
      "incidents.ts",
      "inventory.ts",
      "scheduler-overrides.ts",
    ];

    // The constants as they are named in source, mapped to their values.
    const byName: Record<string, string> = {
      ACCOUNTS_TAG,
      ACCOUNT_ANALYTICS_TAG,
      ANALYTICS_TAG,
      CALENDAR_TAG,
      CONTENT_TYPES_TAG,
      INCIDENTS_TAG,
      INVENTORY_TAG,
    };

    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(`${dir}${file}`, "utf8");
      // `tags: [FOO_TAG]`, `tags: [FOO_TAG, somethingElse(x)]`
      for (const match of source.matchAll(/tags:\s*\[([^\]]*)\]/g)) {
        for (const raw of match[1]!.split(",")) {
          const name = raw.trim();
          if (!/^[A-Z][A-Z_]+$/.test(name)) continue; // a call or a literal, not a constant
          const value = byName[name];
          if (value === undefined) {
            missing.push(`${file}: ${name} is not a known family tag`);
          } else if (!(DATA_TAGS as readonly string[]).includes(value)) {
            missing.push(`${file}: ${name} ("${value}") is not in DATA_TAGS`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

describe("per-profile tags", () => {
  it("names one profile at a time", () => {
    expect(accountDetailTag("Profile 20")).not.toBe(accountDetailTag("Profile 21"));
    expect(forensicsTag("Profile 20")).not.toBe(accountDetailTag("Profile 20"));
  });
});
