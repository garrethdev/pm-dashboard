import { beforeEach, describe, expect, it, vi } from "vitest";

// Decision 6 as narrowed by Garreth on 2026-09-23: a paused account is given
// no posts, but one warmed by hand keeps its two warmups on the list.

const rest = vi.hoisted(() => ({ calls: [] as string[], accounts: [] as unknown[] }));

vi.mock("@/lib/data/supabase", () => ({
  sbRest: async (path: string) => {
    rest.calls.push(path);
    if (path.startsWith("devices?")) return [{ id: 7, name: "iPhone 7", model: null, is_active: true }];
    if (path.startsWith("accounts?")) return rest.accounts;
    if (path.startsWith("post_deliveries?")) {
      // A queued post for every account asked about, so a paused account's
      // post would show if the filter let it through.
      const ids = /account_id=in\.\(([^)]*)\)/.exec(path)?.[1]?.split(",") ?? [];
      return path.includes("status=eq.queued")
        ? ids.map((id) => ({
            id: Number(id) * 100,
            content_type: "demo",
            source_id: `s${id}`,
            // Text, as the database now sends it (PF-22).
            account_id: id,
            status: "queued",
            post_url: null,
            note: null,
            done_at: null,
            created_at: "2026-09-23T14:00:00Z",
          }))
        : [];
    }
    return [];
  },
}));

vi.mock("@/lib/data/warmup-sessions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/warmup-sessions")>()),
  getSessionsOnDay: async () => [],
}));

vi.mock("@/lib/data/ban-cleanups", () => ({ getCleanupsByDevice: async () => new Map() }));

const { getTodoBoard, workFor } = await import("@/lib/data/todo");

function account(id: number, posting_paused: boolean, warmup_mode: string | null) {
  return {
    id: String(id),
    geelark_profile: `Profile ${id}`,
    username: null,
    character: null,
    platform: "tiktok",
    device_id: 7,
    warmup_mode,
    posting_paused,
  };
}

describe("workFor", () => {
  it("gives a working account both halves, whatever its warmup", () => {
    expect(workFor({ posting_paused: false, warmup_mode: "manual" })).toEqual({ posts: true, warmups: true });
    expect(workFor({ posting_paused: null, warmup_mode: "script" })).toEqual({ posts: true, warmups: true });
  });

  it("gives a paused account warmed by hand its warmups and no posts", () => {
    expect(workFor({ posting_paused: true, warmup_mode: "manual" })).toEqual({ posts: false, warmups: true });
    // No mode on record is Manual, the column's default.
    expect(workFor({ posting_paused: true, warmup_mode: null })).toEqual({ posts: false, warmups: true });
  });

  it("gives a paused Automated account nothing", () => {
    expect(workFor({ posting_paused: true, warmup_mode: "script" })).toEqual({ posts: false, warmups: false });
  });
});

describe("getTodoBoard with paused accounts", () => {
  beforeEach(() => {
    rest.calls = [];
  });

  it("lists a paused Manual account's two warmups and none of its posts", async () => {
    rest.accounts = [account(1, false, "manual"), account(2, true, "manual"), account(3, true, "script")];
    const board = await getTodoBoard(0, new Date("2026-09-23T16:00:00Z"));
    const accounts = board.devices[0]!.accounts;

    // The paused Automated account is not on the list at all.
    expect(accounts.map((a) => a.id)).toEqual(["1", "2"]);

    const working = accounts.find((a) => a.id === "1")!;
    expect(working.items.filter((i) => i.kind === "post")).toHaveLength(1);
    expect(working.items.filter((i) => i.kind === "warmup")).toHaveLength(2);

    const paused = accounts.find((a) => a.id === "2")!;
    expect(paused.items.map((i) => i.kind)).toEqual(["warmup", "warmup"]);
    expect(paused.items.every((i) => i.status === "todo" && !i.automated)).toBe(true);

    // Its posts are not even read.
    const deliveryReads = rest.calls.filter((p) => p.startsWith("post_deliveries?"));
    expect(deliveryReads.every((p) => p.includes("account_id=in.(1)"))).toBe(true);
  });
});
