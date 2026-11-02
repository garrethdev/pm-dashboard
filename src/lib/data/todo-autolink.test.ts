import { describe, expect, it, vi } from "vitest";

// A post ticked Posted with no link (autolink, Garreth 2026-10-30): the robots
// attach the link within about a day, so it reads done; only after two days
// with nothing found does it read Link needed, on today's list until added.

const POSTED_NO_LINK = {
  id: 1,
  content_type: "demo",
  source_id: "s1",
  account_id: "1",
  status: "posted",
  post_url: null,
  note: null,
  // Ticked on Tuesday afternoon, the day it was due.
  done_at: "2026-10-27T18:00:00Z",
  created_at: "2026-10-27T14:00:00Z",
  due_at: "2026-10-27T17:00:00Z",
};

vi.mock("@/lib/data/supabase", () => ({
  sbRest: async (path: string) => {
    if (path.startsWith("devices?")) return [{ id: 7, name: "iPhone 7", model: null, is_active: true }];
    if (path.startsWith("accounts?")) {
      return [
        {
          id: "1",
          geelark_profile: "Profile 1",
          username: null,
          character: null,
          platform: "instagram",
          device_id: 7,
          warmup_mode: "manual",
          posting_paused: false,
        },
      ];
    }
    // Both the still-owing read and the finished-today read return it, the
    // way the database does on the day it was ticked.
    if (path.startsWith("post_deliveries?") && path.includes("post_url=is.null")) return [POSTED_NO_LINK];
    if (path.startsWith("post_deliveries?") && path.includes("done_at=gte")) return [POSTED_NO_LINK];
    return [];
  },
}));

vi.mock("@/lib/data/warmup-sessions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/warmup-sessions")>()),
  getSessionsOnDay: async () => [],
}));

vi.mock("@/lib/data/ban-cleanups", () => ({ getCleanupsByDevice: async () => new Map() }));

const { getTodoBoard } = await import("@/lib/data/todo");

function posts(board: Awaited<ReturnType<typeof getTodoBoard>>) {
  return board.devices.flatMap((d) => d.accounts.flatMap((a) => a.items.filter((i) => i.kind === "post")));
}

describe("a post ticked without its link", () => {
  it("reads done, once, on the day it was ticked", async () => {
    const tuesday = posts(await getTodoBoard(0, new Date("2026-10-27T22:00:00Z")));
    expect(tuesday).toHaveLength(1);
    expect(tuesday[0]!.status).toBe("posted");
  });

  it("is not asked for the next day, while the robots are still looking", async () => {
    expect(posts(await getTodoBoard(0, new Date("2026-10-28T16:00:00Z")))).toHaveLength(0);
  });

  it("reads Link needed on today's list two days after it was ticked", async () => {
    // Thursday 15:00 New York: 49 hours after Tuesday's tick.
    const thursday = posts(await getTodoBoard(0, new Date("2026-10-29T19:00:00Z")));
    expect(thursday).toHaveLength(1);
    expect(thursday[0]!.status).toBe("postedNoLink");
  });
});
