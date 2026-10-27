import { describe, expect, it, vi } from "vitest";

// Since 2026-10-27 the Smart Scheduler plans three days at a time and a post
// can be handed out days before it is due. The list files it under the day it
// is DUE (post_deliveries.due_at), not the day it was handed out.

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
    if (path.startsWith("post_deliveries?") && path.includes("status=eq.queued")) {
      return [
        {
          id: 1,
          content_type: "demo",
          source_id: "s1",
          account_id: "1",
          status: "queued",
          post_url: null,
          note: null,
          done_at: null,
          // Handed out Tuesday morning, due Thursday at 13:00 New York.
          created_at: "2026-10-27T14:00:00Z",
          due_at: "2026-10-29T17:00:00Z",
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

const { getTodoBoard } = await import("@/lib/data/todo");

const TUESDAY_NOON = new Date("2026-10-27T16:00:00Z");

function posts(board: Awaited<ReturnType<typeof getTodoBoard>>) {
  return board.devices.flatMap((d) => d.accounts.flatMap((a) => a.items.filter((i) => i.kind === "post")));
}

describe("a post handed out before its day", () => {
  it("is not on the list for the day it was handed out", async () => {
    expect(posts(await getTodoBoard(0, TUESDAY_NOON))).toHaveLength(0);
  });

  it("is on the list for the day it is due, at its planned time", async () => {
    const due = posts(await getTodoBoard(2, TUESDAY_NOON));
    expect(due).toHaveLength(1);
    expect(due[0]!.due).toBe("13:00");
  });

  it("is not overdue on its own day, though it was handed out two days before", async () => {
    // Thursday evening. Counted from the hand-out it would be 54 hours late.
    const due = posts(await getTodoBoard(0, new Date("2026-10-29T20:00:00Z")));
    expect(due).toHaveLength(1);
    expect(due[0]!.overdueFor).toBeUndefined();
  });
});
