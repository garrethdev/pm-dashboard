import { describe, expect, it } from "vitest";
import { buildOverview, etDay, lastDays, stopKind, type OverviewReport } from "@/lib/data/warmup-overview-rules";
import { diaryForReview } from "@/lib/data/warmup-report-review";
import { parseWarmupReview } from "@/lib/data/warmup-review-shape";

describe("stopKind", () => {
  it("sorts the robot's notes into the groups the page shows", () => {
    expect(stopKind("device_lost")).toBe("phone");
    expect(stopKind("wrong_account")).toBe("wrong_account");
    expect(stopKind("warning_on_screen")).toBe("warning");
    expect(stopKind("feed_not_loading")).toBe("feed");
    expect(stopKind("shut_down")).toBe("shut_down");
    expect(stopKind("error: unexpected dialog")).toBe("popup");
    expect(stopKind("error: after the Profile tab: saw unknown")).toBe("lost");
    expect(stopKind("error: Home tab not found")).toBe("lost");
    expect(stopKind('error: refused to swipe: it would start on "Create anytime"')).toBe("lost");
    expect(stopKind("something new")).toBe("other");
    expect(stopKind(null)).toBe("other");
  });
});

describe("days", () => {
  it("files a warmup under its New York day", () => {
    // 01:30 UTC on the 28th is 21:30 on the 27th in New York.
    expect(etDay("2026-10-28T01:30:00Z")).toBe("2026-10-27");
  });

  it("lists the days ending today, across a month end", () => {
    expect(lastDays("2026-11-02", 4)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});

function report(over: Partial<OverviewReport>): OverviewReport {
  return {
    id: "1",
    accountId: "10",
    deviceId: "1",
    sessionNo: 1,
    startedAt: "2026-10-28T14:00:00Z",
    endedAt: "2026-10-28T14:15:00Z",
    outcome: "finished",
    note: null,
    minutes: 15,
    counts: { videos: 0, posts: 0, claudeChecks: 0, onTopic: 0, likes: 0, saves: 0, follows: 0 },
    hasLog: true,
    hasScreenshot: false,
    clearedAt: null,
    reviewSummary: null,
    ...over,
  };
}

const account = (id: string, username: string) => ({ id, username, displayName: null, profile: null, platform: "tiktok", deviceName: "Iphone 1" });

describe("buildOverview", () => {
  const now = new Date("2026-10-28T18:00:00Z");

  it("counts today, the week's finish rate and the running warmups", () => {
    const o = buildOverview({
      now,
      accounts: [account("10", "a")],
      runs: [{ accountId: "10", sessionNo: 2, startedAt: "2026-10-28T17:55:00Z" }],
      reports: [
        report({ id: "1" }),
        report({ id: "2", outcome: "stopped", note: "device_lost", startedAt: "2026-10-27T14:00:00Z" }),
        report({ id: "3", startedAt: "2026-10-26T14:00:00Z" }),
        report({ id: "4", startedAt: "2026-10-26T18:00:00Z", sessionNo: 2 }),
      ],
    });
    expect(o.today).toEqual({ finished: 1, stopped: 0, running: 1, finishRate: 0.75 });
    expect(o.days.at(-1)).toEqual({ day: "2026-10-28", finished: 1, stopped: 0 });
    expect(o.reasons).toEqual([{ kind: "phone", count: 1 }]);
    const cell = o.strips[0].cells.find((c) => c.day === "2026-10-28" && c.sessionNo === 2);
    expect(cell?.running).toBe(true);
  });

  it("asks for a look only when an account's newest warmup stopped", () => {
    const o = buildOverview({
      now,
      accounts: [account("10", "recovered"), account("11", "stuck")],
      runs: [],
      reports: [
        report({ id: "1", accountId: "10" }),
        report({ id: "2", accountId: "10", outcome: "stopped", note: "device_lost", startedAt: "2026-10-27T14:00:00Z" }),
        report({ id: "3", accountId: "11", outcome: "stopped", note: "wrong_account" }),
        report({ id: "4", accountId: "11", outcome: "stopped", note: "wrong_account", startedAt: "2026-10-27T14:00:00Z" }),
      ],
    });
    expect(o.needsLook.map((n) => [n.account.username, n.kind, n.stopsThisWeek])).toEqual([["stuck", "wrong_account", 2]]);
    // The account with stops sits at the top of the strips.
    expect(o.strips.map((s) => s.account.username)).toEqual(["stuck", "recovered"]);
  });

  it("keeps an account the robot has not reached yet as an empty strip", () => {
    const o = buildOverview({ now, accounts: [account("12", "new")], runs: [], reports: [] });
    expect(o.strips).toHaveLength(1);
    expect(o.strips[0].cells).toHaveLength(28);
    expect(o.strips[0].cells.every((c) => c.report === null)).toBe(true);
    expect(o.today.finishRate).toBeNull();
  });
});

describe("the analysis", () => {
  it("reads a reply defensively", () => {
    expect(parseWarmupReview(null)).toBeNull();
    expect(parseWarmupReview({ cause: "phone" })).toBeNull();
    expect(
      parseWarmupReview({
        summary: "The phone disconnected.",
        cause: "gremlins",
        accountRisk: "yes",
        moments: [{ time: "14:05:09", note: "lost" }, { time: "later", note: "x" }, { note: "" }],
      }),
    ).toEqual({
      summary: "The phone disconnected.",
      cause: "unknown",
      causeNote: "",
      nextStep: "",
      accountRisk: false,
      moments: [
        { time: "14:05:09", note: "lost" },
        { time: null, note: "x" },
      ],
    });
  });

  it("keeps a long diary's start and end", () => {
    const line = (i: number) => JSON.stringify({ level: 30, time: "2026-10-28T14:00:00Z", msg: `step ${i}` });
    const log = Array.from({ length: 10000 }, (_, i) => line(i)).join("\n");
    const text = diaryForReview(log);
    expect(text.length).toBeLessThan(151_000);
    expect(text).toContain("step 0");
    expect(text).toContain("step 9999");
    expect(text).toContain("characters left out");
  });
});
