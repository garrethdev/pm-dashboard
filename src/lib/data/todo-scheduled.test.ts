import { describe, expect, it, vi } from "vitest";

// A post Yurie scheduled inside the platform (Garreth, 2026-10-28): done on
// time, so never Overdue; kept on its due day, then on today's list until its
// link is added; Link needed two days after it was due.

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
    if (path.startsWith("post_deliveries?") && path.includes("status=in.(queued,scheduled)")) {
      return [
        {
          id: 1,
          content_type: "demo",
          source_id: "s1",
          account_id: "1",
          status: "scheduled",
          post_url: null,
          note: null,
          // Scheduled on Tuesday afternoon, for Thursday at 13:00 New York.
          done_at: "2026-10-27T18:00:00Z",
          created_at: "2026-10-27T14:00:00Z",
          due_at: "2026-10-29T17:00:00Z",
        },
      ];
    }
    // The finished-today read must leave scheduled rows out, or one is read
    // twice. Answering it with the same row would show up as a duplicate.
    if (path.startsWith("post_deliveries?") && path.includes("done_at=gte") && !path.includes("status=neq.scheduled")) {
      throw new Error("the finished read did not leave scheduled rows out");
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

function posts(board: Awaited<ReturnType<typeof getTodoBoard>>) {
  return board.devices.flatMap((d) => d.accounts.flatMap((a) => a.items.filter((i) => i.kind === "post")));
}

const TUESDAY_EVENING = new Date("2026-10-27T22:00:00Z");

describe("a scheduled post", () => {
  it("stays on its due day, not the day it was scheduled", async () => {
    expect(posts(await getTodoBoard(0, TUESDAY_EVENING))).toHaveLength(0);
    const thursday = posts(await getTodoBoard(2, TUESDAY_EVENING));
    expect(thursday).toHaveLength(1);
    expect(thursday[0]!.status).toBe("scheduled");
  });

  it("is never overdue", async () => {
    // Friday afternoon, a day past due: an open post would be red by now.
    const friday = posts(await getTodoBoard(0, new Date("2026-10-30T19:00:00Z")));
    expect(friday).toHaveLength(1);
    expect(friday[0]!.overdueFor).toBeUndefined();
    expect(friday[0]!.status).toBe("scheduled");
  });

  it("reads Link needed two days after it was due", async () => {
    // Saturday 14:00 New York: 49 hours past Thursday 13:00.
    const saturday = posts(await getTodoBoard(0, new Date("2026-10-31T18:00:00Z")));
    expect(saturday).toHaveLength(1);
    expect(saturday[0]!.status).toBe("postedNoLink");
  });

  it("stays on today's list past the three-day carry-over until its link is added", async () => {
    // The Thursday after: five working days past due.
    const later = posts(await getTodoBoard(0, new Date("2026-11-05T16:00:00Z")));
    expect(later).toHaveLength(1);
    expect(later[0]!.status).toBe("postedNoLink");
  });

  it("is not copied onto past days it was not due on", async () => {
    // Looking back at Friday from the next week: only today carries it.
    const fridayRecord = posts(await getTodoBoard(-6, new Date("2026-11-05T16:00:00Z")));
    expect(fridayRecord).toHaveLength(0);
  });
});
