import { beforeEach, describe, expect, it, vi } from "vitest";

// Garreth, 2026-11-18: the warmup robot does not start when the phone's
// internet connection is not American, and reports `connection_not_us: <CC>`.
// The To-do list warns on the account's warmups until a later report today
// says anything else.

const db = vi.hoisted(() => ({
  accounts: [] as unknown[],
  reports: [] as unknown[],
  reportReads: [] as string[],
}));

vi.mock("@/lib/data/supabase", () => ({
  sbRest: async (path: string) => {
    if (path.startsWith("devices?")) return [{ id: 7, name: "iPhone 7", model: null, is_active: true }];
    if (path.startsWith("accounts?")) return db.accounts;
    return [];
  },
}));

vi.mock("@/lib/data/warmup-sessions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/warmup-sessions")>()),
  getSessionsOnDay: async () => [],
  sbFetch: async (path: string) => {
    // Only the connection read asks for every report of the day; the warning
    // rest's read (warmup-rest.ts) asks for its own notes and gets none.
    if (path.startsWith("warmup_reports?") && !path.includes("note=in.")) {
      db.reportReads.push(path);
      return new Response(JSON.stringify(db.reports), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  },
}));

vi.mock("@/lib/data/ban-cleanups", () => ({ getCleanupsByDevice: async () => new Map() }));

const { connectionCountry, connectionWarnings, connectionWarningLabel } = await import(
  "@/lib/data/warmup-connection"
);
const { getTodoBoard } = await import("@/lib/data/todo");

describe("connectionCountry", () => {
  it("reads the country from the robot's note, and nothing from any other note", () => {
    expect(connectionCountry("connection_not_us: PH")).toBe("PH");
    expect(connectionCountry("connection_not_us:ph")).toBe("PH");
    expect(connectionCountry("connection_not_us: unknown")).toBe("unknown");
    expect(connectionCountry("connection_not_us")).toBe("unknown");
    expect(connectionCountry("device_lost")).toBeNull();
    expect(connectionCountry("connection_not_usable")).toBeNull();
    expect(connectionCountry("error: connection_not_us: PH")).toBeNull();
    expect(connectionCountry(null)).toBeNull();
  });
});

describe("connectionWarningLabel", () => {
  it("names the country and the New York time", () => {
    // 07:14 UTC on 18 November is 2:14 AM in New York.
    expect(connectionWarningLabel("PH", "2026-11-18T07:14:00Z")).toBe(
      "Phone's connection is not American (PH) at 2:14 AM: check the phone's proxy",
    );
    expect(connectionWarningLabel("unknown", "2026-11-18T19:05:00Z")).toBe(
      "Phone's connection is not American (country unknown) at 2:05 PM: check the phone's proxy",
    );
  });
});

function report(account_id: string, started_at: string, outcome: string, note: string | null) {
  return { account_id, outcome, note, started_at, ended_at: started_at };
}

describe("connectionWarnings", () => {
  it("warns on an account whose newest report is the connection stop", () => {
    const warnings = connectionWarnings([
      report("9007199254740993", "2026-11-18T07:14:00Z", "stopped", "connection_not_us: PH"),
    ]);
    expect([...warnings.keys()]).toEqual(["9007199254740993"]);
    expect(warnings.get("9007199254740993")).toContain("(PH) at 2:14 AM");
  });

  it("clears once a later report that day is anything else, finished or another stop", () => {
    const warnings = connectionWarnings([
      report("1", "2026-11-18T07:14:00Z", "stopped", "connection_not_us: PH"),
      report("1", "2026-11-18T13:30:00Z", "finished", null),
      report("2", "2026-11-18T07:14:00Z", "stopped", "connection_not_us: PH"),
      report("2", "2026-11-18T13:30:00Z", "stopped", "feed_not_loading"),
    ]);
    expect(warnings.size).toBe(0);
  });

  it("follows the newest report whatever order they arrive in", () => {
    const warnings = connectionWarnings([
      report("1", "2026-11-18T13:30:00Z", "stopped", "connection_not_us: MX"),
      report("1", "2026-11-18T07:14:00Z", "finished", null),
    ]);
    expect(warnings.get("1")).toContain("(MX) at 8:30 AM");
  });
});

function account(id: string, warmup_mode: string) {
  return {
    id,
    geelark_profile: `Profile ${id}`,
    username: null,
    display_name: null,
    character: null,
    platform: "tiktok",
    device_id: 7,
    warmup_mode,
    posting_paused: false,
  };
}

describe("getTodoBoard with a connection stop", () => {
  // Wednesday 18 November 2026, 11:00 in New York.
  const now = new Date("2026-11-18T16:00:00Z");

  beforeEach(() => {
    db.reportReads = [];
    db.accounts = [account("1", "script"), account("2", "script")];
    db.reports = [report("1", "2026-11-18T07:14:00Z", "stopped", "connection_not_us: PH")];
  });

  it("puts the warning on that account's warmups today, and on no other account's", async () => {
    const board = await getTodoBoard(0, now);
    const [one, two] = board.devices[0]!.accounts;
    const warmups = one!.items.filter((i) => i.kind === "warmup");
    expect(warmups).toHaveLength(2);
    for (const item of warmups) {
      expect(item.automated).toBe(true);
      expect(item.connectionWarning).toBe(
        "Phone's connection is not American (PH) at 2:14 AM: check the phone's proxy",
      );
    }
    expect(two!.items.every((i) => i.connectionWarning === undefined)).toBe(true);
    // The read is the account's reports for today's New York day, by text id.
    expect(db.reportReads).toHaveLength(1);
    expect(db.reportReads[0]).toContain("account_id=in.(1,2)");
    expect(db.reportReads[0]).toContain(`started_at=gte.${encodeURIComponent("2026-11-18T05:00:00.000Z")}`);
  });

  it("drops the warning once a later report today is not a connection stop", async () => {
    db.reports.push(report("1", "2026-11-18T13:30:00Z", "stopped", "wrong_account"));
    const board = await getTodoBoard(0, now);
    const items = board.devices[0]!.accounts.flatMap((a) => a.items);
    expect(items.every((i) => i.connectionWarning === undefined)).toBe(true);
  });

  it("is today's only: a day stepped back to does not read or show it", async () => {
    const board = await getTodoBoard(-1, now);
    const items = board.devices[0]!.accounts.flatMap((a) => a.items);
    expect(items.every((i) => i.connectionWarning === undefined)).toBe(true);
    expect(db.reportReads).toHaveLength(0);
  });

  it("is not read for accounts warmed by hand", async () => {
    db.accounts = [account("1", "manual")];
    const board = await getTodoBoard(0, now);
    const items = board.devices[0]!.accounts.flatMap((a) => a.items);
    expect(items.every((i) => i.connectionWarning === undefined)).toBe(true);
    expect(db.reportReads).toHaveLength(0);
  });
});
