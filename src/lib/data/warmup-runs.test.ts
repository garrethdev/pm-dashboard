import { describe, expect, it } from "vitest";
import { RUN_QUIET_AFTER_MS, runStateFor, warmupOverdueDays, type RunRow } from "@/lib/data/warmup-run-state";
import { warmupItemsFor } from "@/lib/data/todo";
import type { TodoItem } from "@/lib/data/todo-placeholder";
import type { WarmupSession } from "@/lib/data/warmup-sessions";
import { automatedWord } from "@/components/dashboard/automated-warmups";
import { RunnerError, rangeOfETDate, type OverdueAccount } from "@/lib/data/warmup-runs";
import { warmupOverdueItem } from "@/lib/data/notifications";
import { parseDeviceId, parseNote, parseRunKey, requireRunnerToken } from "@/lib/warmup-runner-api";

// PF-13: the Running status and the script's door.

const now = new Date("2026-09-28T14:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const run = (over: Partial<RunRow> = {}): RunRow => ({
  account_id: "7",
  session_no: 1,
  started_at: ago(10 * 60_000),
  last_seen_at: ago(30_000),
  ended_at: null,
  ...over,
});

describe("runStateFor", () => {
  it("is Running while check-ins are fresh", () => {
    expect(runStateFor([run()], "7", 1, false, now)).toEqual({ state: "running", startedAt: ago(10 * 60_000) });
  });

  it("is still Running at exactly the quiet limit, and Stopped just past it", () => {
    expect(runStateFor([run({ last_seen_at: ago(RUN_QUIET_AFTER_MS) })], "7", 1, false, now)?.state).toBe("running");
    expect(runStateFor([run({ last_seen_at: ago(RUN_QUIET_AFTER_MS + 1000) })], "7", 1, false, now)).toEqual({
      state: "stopped",
      lastSeenAt: ago(RUN_QUIET_AFTER_MS + 1000),
    });
  });

  it("says nothing once the script closed the run, however it ended", () => {
    expect(runStateFor([run({ ended_at: ago(0), last_seen_at: ago(3_600_000) })], "7", 1, false, now)).toBeNull();
  });

  it("says nothing for a session that is already done", () => {
    expect(runStateFor([run({ last_seen_at: ago(3_600_000) })], "7", 1, true, now)).toBeNull();
  });

  it("reads only the latest run: a dead run followed by a new one is Running", () => {
    const dead = run({ started_at: ago(60 * 60_000), last_seen_at: ago(50 * 60_000) });
    expect(runStateFor([run(), dead], "7", 1, false, now)?.state).toBe("running");
  });

  it("keeps accounts and sessions apart", () => {
    expect(runStateFor([run()], "7", 2, false, now)).toBeNull();
    expect(runStateFor([run()], "8", 1, false, now)).toBeNull();
  });
});

describe("rangeOfETDate", () => {
  it("covers New York's day, in daylight time and out of it", () => {
    expect(rangeOfETDate("2026-09-28")).toEqual({
      from: new Date("2026-09-28T04:00:00Z"),
      to: new Date("2026-09-29T04:00:00Z"),
    });
    expect(rangeOfETDate("2026-12-01")?.from).toEqual(new Date("2026-12-01T05:00:00Z"));
  });

  it("is 25 hours on the day the clocks go back", () => {
    const r = rangeOfETDate("2026-11-01")!;
    expect(r.to.getTime() - r.from.getTime()).toBe(25 * 3_600_000);
  });

  it("refuses anything that is not a real date", () => {
    expect(rangeOfETDate("2026-02-30")).toBeNull();
    expect(rangeOfETDate("28/09/2026")).toBeNull();
  });
});

describe("parseRunKey", () => {
  const body = { accountId: "26716659041349202", sessionNo: 2, startedAt: "2026-09-28T13:50:00.5Z" };

  it("keeps a 17-digit account id exactly, and normalises the start", () => {
    expect(parseRunKey(body, now)).toEqual({
      accountId: "26716659041349202",
      sessionNo: 2,
      startedAt: "2026-09-28T13:50:00.500Z",
    });
  });

  it("refuses an account id already rounded by being sent as a number", () => {
    expect(() => parseRunKey({ ...body, accountId: 26716659041349202 }, now)).toThrow(RunnerError);
  });

  it("refuses a third session and a start far from now", () => {
    expect(() => parseRunKey({ ...body, sessionNo: 3 }, now)).toThrow(/sessionNo/);
    expect(() => parseRunKey({ ...body, startedAt: "2026-09-26T10:00:00Z" }, now)).toThrow(/clock/);
    expect(() => parseRunKey({ ...body, startedAt: "2026-09-28T15:00:00Z" }, now)).toThrow(/clock/);
  });
});

describe("the small parsers", () => {
  it("takes a phone id as text or a small number", () => {
    expect(parseDeviceId("12")).toBe("12");
    expect(parseDeviceId(12)).toBe("12");
    expect(() => parseDeviceId("twelve")).toThrow(RunnerError);
  });

  it("keeps a note short, and blank as nothing", () => {
    expect(parseNote("  wrong_account ")).toBe("wrong_account");
    expect(parseNote("   ")).toBeNull();
    expect(() => parseNote("x".repeat(501))).toThrow(RunnerError);
  });
});

describe("requireRunnerToken", () => {
  const call = (auth?: string) =>
    new Request("http://x/api/warmup-runner/accounts", auth ? { headers: { authorization: auth } } : {});

  it("stays shut when no token is configured", () => {
    delete process.env.WARMUP_RUNNER_TOKEN;
    expect(requireRunnerToken(call("Bearer anything"))?.status).toBe(503);
  });

  it("lets the right token in and nothing else", () => {
    process.env.WARMUP_RUNNER_TOKEN = "s3cret-token";
    expect(requireRunnerToken(call("Bearer s3cret-token"))).toBeNull();
    expect(requireRunnerToken(call("Bearer s3cret-toke"))?.status).toBe(401);
    expect(requireRunnerToken(call("s3cret-token"))?.status).toBe(401);
    expect(requireRunnerToken(call())?.status).toBe(401);
    delete process.env.WARMUP_RUNNER_TOKEN;
  });
});

describe("warmupOverdueDays (Garreth 2026-09-28: 3 days no warmup = problem)", () => {
  // 10am in New York on the 28th.
  const at = new Date("2026-09-28T14:00:00Z");

  it("is quiet for up to two days, and a problem from the third", () => {
    expect(warmupOverdueDays("2026-09-26T23:00:00Z", null, at)).toBeNull(); // the 26th, 7pm ET
    expect(warmupOverdueDays("2026-09-25T23:00:00Z", null, at)).toBe(3);
    expect(warmupOverdueDays("2026-09-20T12:00:00Z", null, at)).toBe(8);
  });

  it("counts in New York days, not hours", () => {
    // 11:30pm ET on the 25th is still the 25th, though it is the 26th in UTC.
    expect(warmupOverdueDays("2026-09-26T03:30:00Z", null, at)).toBe(3);
  });

  it("counts a never-warmed account from its move, and says nothing with neither date", () => {
    expect(warmupOverdueDays(null, "2026-09-24T15:00:00Z", at)).toBe(4);
    expect(warmupOverdueDays(null, "2026-09-27T15:00:00Z", at)).toBeNull();
    expect(warmupOverdueDays(null, null, at)).toBeNull();
  });
});

describe("warmupItemsFor", () => {
  const at = new Date("2026-09-28T14:00:00Z");
  const scriptRow: WarmupSession = {
    id: 1,
    accountId: "7",
    deviceId: 3,
    startedAt: "2026-09-28T12:30:00Z",
    finishedAt: "2026-09-28T12:39:00Z",
    minutes: 9,
    sessionNo: 1,
    mode: "script",
    note: "error: proxy",
    loggedBy: "warmup-runner",
  };

  it("marks an Automated account's warmups with the robot and the script's state", () => {
    const openRun: RunRow = {
      account_id: "7",
      session_no: 2,
      started_at: "2026-09-28T13:50:00Z",
      last_seen_at: "2026-09-28T13:59:30Z",
      ended_at: null,
    };
    const [morning, evening] = warmupItemsFor({ id: "7", warmup_mode: "script" }, [scriptRow], [openRun], "2026-09-28", at);
    expect(morning).toMatchObject({ automated: true, status: "todo", loggedMinutes: 9 });
    expect(evening).toMatchObject({ automated: true, run: { state: "running", at: "09:50" } });
  });

  it("back to manual: no robot, and the script's minutes still count toward the session", () => {
    const byHand: WarmupSession = { ...scriptRow, id: 2, minutes: 6, mode: "manual", finishedAt: null, loggedBy: "x" };
    const [morning] = warmupItemsFor({ id: "7", warmup_mode: "manual" }, [scriptRow, byHand], [], "2026-09-28", at);
    expect(morning!.automated).toBeUndefined();
    expect(morning).toMatchObject({ status: "logged", loggedMinutes: 15 });
  });
});

describe("automatedWord", () => {
  const base: TodoItem = { id: "w", kind: "warmup", label: "Warmup, morning", due: "08:30", status: "todo", targetMinutes: 15, loggedMinutes: 0, automated: true };

  it("uses the four words", () => {
    expect(automatedWord({ ...base, status: "logged", doneAt: "09:14", loggedMinutes: 17 })).toEqual({ tone: "accent", label: "Done", detail: "09:14 · 17 min" });
    expect(automatedWord({ ...base, run: { state: "running", at: "09:14" } }).label).toBe("Running");
    expect(automatedWord({ ...base, run: { state: "stopped", at: "09:31" } })).toMatchObject({ tone: "danger", label: "Stopped" });
    expect(automatedWord(base)).toEqual({ tone: "gray", label: "Not yet", detail: null });
    expect(automatedWord({ ...base, loggedMinutes: 6 }).detail).toBe("6 of 15 min");
  });
});

describe("warmupOverdueItem (the bell, Garreth 2026-09-28)", () => {
  const acct = (id: string, days: number, over: Partial<OverdueAccount> = {}): OverdueAccount => ({
    id,
    username: `user${id}`,
    profile: `Profile ${id}`,
    days,
    since: `2026-09-2${9 - days}T12:00:00Z`,
    ...over,
  });

  it("says nothing when no Automated account is behind", () => {
    expect(warmupOverdueItem([])).toBeNull();
  });

  it("names one account and links to its page", () => {
    const item = warmupOverdueItem([acct("21", 4)])!;
    expect(item).toMatchObject({
      title: "@user21 not warmed in 4 days",
      severity: "warning",
      href: "/accounts/21",
      fleet: "physical",
      markKeys: ["warmup_overdue:21:2026-09-25T12:00:00Z"],
    });
  });

  it("groups several, worst first, and turns red at three", () => {
    const item = warmupOverdueItem([acct("21", 3), acct("22", 5), acct("23", 4)])!;
    expect(item.title).toBe("3 automated accounts not warmed in 3+ days");
    expect(item.body).toBe("@user22 (5 days), @user23 (4 days) and @user21 (3 days). The warmup script may have stopped");
    expect(item.severity).toBe("critical");
    expect(item.href).toBe("/accounts");
  });

  it("comes back as new when an account falls behind on a new streak", () => {
    const first = warmupOverdueItem([acct("21", 4)])!;
    const later = warmupOverdueItem([acct("21", 3, { since: "2026-10-02T12:00:00Z" })])!;
    expect(later.markKeys).not.toEqual(first.markKeys);
  });
});
