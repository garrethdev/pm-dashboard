import { describe, expect, it, vi } from "vitest";

// The Linked pill on the To-do list (asked for 2026-11-04): a posted item
// carries its link, whether pasted or attached by the robots, so the pill can
// open the live post. Only a web address counts: a caption has been pasted
// into the link box before, and that must not become something to click.

const row = (id: number, post_url: string | null, status = "posted") => ({
  id,
  content_type: "demo",
  source_id: `s${id}`,
  account_id: "1",
  status,
  post_url,
  note: null,
  done_at: status === "posted" ? "2026-11-03T18:00:00Z" : null,
  created_at: "2026-11-03T14:00:00Z",
  due_at: "2026-11-03T17:00:00Z",
});

const ROWS = [
  row(1, "https://www.tiktok.com/@someone/video/123"),
  row(2, "  https://www.instagram.com/reel/abc/  "),
  row(3, "this caption was pasted by mistake"),
  row(4, null),
];

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
          platform: "tiktok",
          device_id: 7,
          warmup_mode: "manual",
          posting_paused: false,
        },
      ];
    }
    if (path.startsWith("post_deliveries?") && path.includes("post_url=is.null")) {
      return ROWS.filter((r) => r.post_url === null);
    }
    if (path.startsWith("post_deliveries?") && path.includes("done_at=gte")) return ROWS;
    return [];
  },
}));

vi.mock("@/lib/data/warmup-sessions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/warmup-sessions")>()),
  getSessionsOnDay: async () => [],
}));

vi.mock("@/lib/data/ban-cleanups", () => ({ getCleanupsByDevice: async () => new Map() }));

const { getTodoBoard } = await import("@/lib/data/todo");

describe("the Linked pill's link", () => {
  it("is carried by a posted item with a web address, and only then", async () => {
    const board = await getTodoBoard(0, new Date("2026-11-03T22:00:00Z"));
    const posts = board.devices.flatMap((d) => d.accounts.flatMap((a) => a.items.filter((i) => i.kind === "post")));
    const byId = Object.fromEntries(posts.map((p) => [p.id, p.postUrl]));
    expect(byId).toEqual({
      d1: "https://www.tiktok.com/@someone/video/123",
      d2: "https://www.instagram.com/reel/abc/",
      d3: undefined,
      d4: undefined,
    });
  });
});
