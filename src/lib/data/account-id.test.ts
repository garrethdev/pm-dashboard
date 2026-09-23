import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseAccountId } from "@/lib/data/account-id";

// PF-22: Profile 20's real id. As a JavaScript number it becomes
// 26716659041349200, an account that does not exist.
const BIG = "26716659041349202";

const rest = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/lib/data/supabase", () => ({
  sbRest: async (path: string) => {
    rest.calls.push(path);
    if (path.startsWith("devices?")) return [{ id: 7, name: "iPhone 7", model: null, is_active: true }];
    if (path.startsWith("accounts?")) {
      return [
        {
          id: BIG,
          geelark_profile: "Profile 20",
          username: null,
          character: null,
          platform: "tiktok",
          device_id: 7,
          warmup_mode: "manual",
          posting_paused: false,
        },
      ];
    }
    if (path.startsWith("post_deliveries?") && path.includes("status=eq.queued")) {
      return [
        {
          id: 1,
          content_type: "demo",
          source_id: "s1",
          account_id: BIG,
          status: "queued",
          post_url: null,
          note: null,
          done_at: null,
          created_at: "2026-09-23T14:00:00Z",
        },
      ];
    }
    return [];
  },
}));

vi.mock("@/lib/data/warmup-sessions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/warmup-sessions")>()),
  getSessionsOnDay: async () => [],
}));

vi.mock("@/lib/data/ban-cleanups", () => ({ getCleanupsByDevice: async () => new Map() }));

const { getTodoBoard, parseWarmupItemId, warmupItemId } = await import("@/lib/data/todo");

describe("parseAccountId", () => {
  it("keeps a 17-digit id exactly", () => {
    expect(parseAccountId(BIG)).toBe(BIG);
  });

  it("takes a number only while it is still exact", () => {
    expect(parseAccountId(42)).toBe("42");
    expect(parseAccountId(Number.MAX_SAFE_INTEGER)).toBe("9007199254740991");
    // Already rounded by whoever sent it.
    expect(parseAccountId(26716659041349202)).toBeNull();
  });

  it("refuses anything that is not a positive bigint", () => {
    for (const bad of ["", "0", "-5", "12a", "01", "1.5", "9223372036854775808", null, undefined, {}]) {
      expect(parseAccountId(bad)).toBeNull();
    }
    expect(parseAccountId("9223372036854775807")).toBe("9223372036854775807");
  });
});

describe("warmup item ids", () => {
  it("round-trip a 17-digit account id without rounding it", () => {
    const id = warmupItemId(BIG, "2026-09-23", 2);
    expect(id).toBe(`w${BIG}-2026-09-23-2`);
    expect(parseWarmupItemId(id)).toEqual({ accountId: BIG, day: "2026-09-23", sessionNo: 2 });
  });
});

describe("getTodoBoard with a 17-digit account id", () => {
  beforeEach(() => {
    rest.calls = [];
  });

  it("reads the ids as text and carries them through exactly", async () => {
    const board = await getTodoBoard(0, new Date("2026-09-23T16:00:00Z"));
    const account = board.devices[0]!.accounts[0]!;

    expect(account.id).toBe(BIG);
    expect(account.items.filter((i) => i.kind === "post")).toHaveLength(1);
    const warmups = account.items.filter((i) => i.kind === "warmup");
    expect(warmups.map((i) => parseWarmupItemId(i.id)?.accountId)).toEqual([BIG, BIG]);

    // The reads ask Postgres for text, and the post read names the exact id.
    expect(rest.calls.find((p) => p.startsWith("accounts?"))).toContain("select=id:id::text,");
    const posts = rest.calls.filter((p) => p.startsWith("post_deliveries?"));
    expect(posts.every((p) => p.includes("account_id:account_id::text"))).toBe(true);
    expect(posts.every((p) => p.includes(`account_id=in.(${BIG})`))).toBe(true);
  });
});
