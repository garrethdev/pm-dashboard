import { describe, expect, it, vi, beforeEach } from "vitest";

// Operation 7, the warmup's report (Garreth, 2026-10-09): parsing, refusals,
// sending it twice, the 30-day clear-out, and how the diary reads.

const db = vi.hoisted(() => ({
  calls: [] as { path: string; method: string; body: unknown }[],
  /** What the next insert answers. */
  insert: { status: 201, body: [{ id: "41" }] as unknown },
}));

vi.mock("@/lib/data/warmup-sessions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/warmup-sessions")>()),
  sbFetch: async (path: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    db.calls.push({ path, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "POST") {
      return new Response(JSON.stringify(db.insert.body), { status: db.insert.status });
    }
    if (method === "PATCH") return new Response(null, { status: 204 });
    // The lookup after a duplicate: the first report's id.
    return new Response(JSON.stringify([{ id: "40" }]), { status: 200 });
  },
}));

const { RunnerError } = await import("@/lib/data/warmup-runs");
const { parseReport, runnerFailure } = await import("@/lib/warmup-runner-api");
const { writeReport, parseReportId, REPORT_LOG_MAX_CHARS, REPORT_SCREENSHOT_MAX_CHARS } = await import(
  "@/lib/data/warmup-reports"
);
const { claudeText, countsLine, diaryFileName, diaryLines, levelWord } = await import(
  "@/lib/data/warmup-report-format"
);

const now = new Date("2026-10-09T17:00:00Z");
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const body = {
  accountId: "26716659041349202",
  deviceId: "25",
  sessionNo: 2,
  startedAt: "2026-10-09T16:41:10.960Z",
  endedAt: "2026-10-09T16:42:22.516Z",
  outcome: "stopped",
  note: "device_lost",
  minutes: 1,
  counts: { videos: 3, posts: 0, claudeChecks: 1, onTopic: 0, likes: 0, saves: 0, follows: 0 },
  log: '{"level":30,"time":1791564070960,"msg":"session started","account":"maya_journey8"}\n',
  screenshot: PNG,
};

function refusal(over: Record<string, unknown>): { status: number; code: string } {
  try {
    parseReport({ ...body, ...over }, now);
  } catch (err) {
    if (err instanceof RunnerError) return { status: err.status, code: err.code };
    throw err;
  }
  throw new Error("accepted");
}

describe("parseReport", () => {
  it("keeps a 17-digit account id exactly and reads every field", () => {
    const r = parseReport(body, now);
    expect(r.accountId).toBe("26716659041349202");
    expect(r.deviceId).toBe("25");
    expect(r.startedAt).toBe("2026-10-09T16:41:10.960Z");
    expect(r.outcome).toBe("stopped");
    expect(r.note).toBe("device_lost");
    expect(r.counts.claudeChecks).toBe(1);
    expect(r.screenshot).toBe(PNG);
  });

  it("refuses an account id already rounded by being sent as a number", () => {
    expect(refusal({ accountId: 26716659041349202 })).toEqual({ status: 400, code: "invalid_body" });
  });

  it("takes 0 minutes, a finished warmup with no note, and no diary or screenshot", () => {
    const r = parseReport(
      { ...body, minutes: 0, outcome: "finished", note: null, log: null, screenshot: undefined },
      now,
    );
    expect(r.minutes).toBe(0);
    expect(r.note).toBeNull();
    expect(r.log).toBeNull();
    expect(r.screenshot).toBeNull();
  });

  it("refuses a bad outcome, an end before the start, and a start far from now", () => {
    expect(refusal({ outcome: "crashed" }).code).toBe("invalid_body");
    expect(refusal({ endedAt: "2026-10-09T16:40:00Z" }).code).toBe("invalid_body");
    expect(refusal({ startedAt: "2026-10-07T10:00:00Z" }).code).toBe("invalid_body");
  });

  it("refuses minutes that are negative, fractional, or more than passed", () => {
    expect(refusal({ minutes: -1 }).code).toBe("invalid_minutes");
    expect(refusal({ minutes: 1.5 }).code).toBe("invalid_minutes");
    expect(refusal({ minutes: 5 }).code).toBe("invalid_minutes");
  });

  it("refuses a missing or bad count", () => {
    expect(refusal({ counts: undefined }).code).toBe("invalid_body");
    expect(refusal({ counts: { ...body.counts, likes: -1 } }).code).toBe("invalid_body");
    const noFollows: Record<string, number> = { ...body.counts };
    delete noFollows.follows;
    expect(refusal({ counts: noFollows }).code).toBe("invalid_body");
  });

  it("refuses a diary or a screenshot over its limit as invalid_field", () => {
    expect(refusal({ log: "x".repeat(REPORT_LOG_MAX_CHARS + 1) })).toEqual({ status: 400, code: "invalid_field" });
    expect(parseReport({ ...body, log: "x".repeat(REPORT_LOG_MAX_CHARS) }, now).log).toHaveLength(
      REPORT_LOG_MAX_CHARS,
    );
    const big = PNG.slice(0, 12) + "A".repeat(REPORT_SCREENSHOT_MAX_CHARS);
    expect(refusal({ screenshot: big })).toEqual({ status: 400, code: "invalid_field" });
  });

  it("takes only a plain base64 PNG as the screenshot", () => {
    expect(refusal({ screenshot: `data:image/png;base64,${PNG}` }).code).toBe("invalid_field");
    expect(refusal({ screenshot: "/9j/4AAQSkZJRgABAQ==" }).code).toBe("invalid_field"); // a JPEG
    expect(refusal({ screenshot: "iVBORw0KGgo!" }).code).toBe("invalid_field");
    expect(refusal({ screenshot: 12 }).code).toBe("invalid_field");
    expect(refusal({ log: { lines: [] } }).code).toBe("invalid_field");
  });

  it("answers a refusal in the same shape as operations 1 to 6", async () => {
    let res: Response | null = null;
    try {
      parseReport({ ...body, log: "x".repeat(REPORT_LOG_MAX_CHARS + 1) }, now);
    } catch (err) {
      res = runnerFailure(err);
    }
    expect(res?.status).toBe(400);
    expect(await res?.json()).toMatchObject({ code: "invalid_field" });
  });
});

describe("writeReport", () => {
  beforeEach(() => {
    db.calls = [];
    db.insert = { status: 201, body: [{ id: "41" }] };
  });

  it("stores a new report, sends the account id as text, then clears diaries older than 30 days", async () => {
    const out = await writeReport(parseReport(body, now), now);
    expect(out).toEqual({ id: "41", alreadyReported: false });

    const insert = db.calls.find((c) => c.method === "POST")!;
    expect(insert.path).toBe("warmup_reports?select=id:id::text");
    expect(insert.body).toMatchObject({
      account_id: "26716659041349202",
      device_id: "25",
      session_no: 2,
      outcome: "stopped",
      claude_checks: 1,
      on_topic: 0,
      screenshot: PNG,
    });

    const clear = db.calls.find((c) => c.method === "PATCH")!;
    expect(clear.path).toContain(`started_at=lt.${encodeURIComponent("2026-09-09T17:00:00.000Z")}`);
    expect(clear.path).toContain("or=(has_log.is.true,has_screenshot.is.true)");
    expect(clear.body).toEqual({ log: null, screenshot: null, cleared_at: now.toISOString() });
  });

  it("answers a second send of the same report as already reported, with the first id, and clears nothing", async () => {
    db.insert = { status: 409, body: { code: "23505", message: "duplicate key" } };
    const out = await writeReport(parseReport(body, now), now);
    expect(out).toEqual({ id: "40", alreadyReported: true });
    expect(db.calls.some((c) => c.method === "PATCH")).toBe(false);
    const lookup = db.calls.find((c) => c.method === "GET")!;
    expect(lookup.path).toContain("account_id=eq.26716659041349202&session_no=eq.2");
  });

  it("refuses an account or phone that does not exist as 409 not_found", async () => {
    db.insert = { status: 409, body: { code: "23503", message: "fk" } };
    await expect(writeReport(parseReport(body, now), now)).rejects.toMatchObject({
      status: 409,
      code: "not_found",
    });
  });

  it("lets any other database failure through as upstream", async () => {
    db.insert = { status: 500, body: { code: "XX000" } };
    let res: Response | null = null;
    try {
      await writeReport(parseReport(body, now), now);
    } catch (err) {
      res = runnerFailure(err);
    }
    expect(res?.status).toBe(502);
    expect(await res?.json()).toMatchObject({ code: "upstream" });
  });
});

describe("parseReportId", () => {
  it("takes a positive whole number as text and nothing else", () => {
    expect(parseReportId("41")).toBe("41");
    expect(parseReportId("0")).toBeNull();
    expect(parseReportId("41;drop")).toBeNull();
    expect(parseReportId(41)).toBeNull();
  });
});

describe("how a report reads", () => {
  const diary = {
    ...parseReport(body, now),
    id: "41",
    sessionNo: 2,
    hasLog: true,
    hasScreenshot: true,
    clearedAt: null,
    username: "maya_journey8",
    profile: "Profile 8",
    deviceName: "iPhone 25",
  };

  it("writes the counts the way the Geelark log reads", () => {
    expect(countsLine({ videos: 128, posts: 0, claudeChecks: 12, onTopic: 5, likes: 1, saves: 1, follows: 0 })).toBe(
      "videos 128 · Claude 12 (5 on topic) · likes 1 · saves 1 · follows 0",
    );
    expect(countsLine({ videos: 1, posts: 4, claudeChecks: 0, onTopic: 0, likes: 0, saves: 0, follows: 0 })).toContain(
      "posts 4",
    );
  });

  it("names pino's levels", () => {
    expect([levelWord(20), levelWord(30), levelWord(40), levelWord(50), levelWord(60)]).toEqual([
      "debug",
      "info",
      "WARNING",
      "PROBLEM",
      "PROBLEM",
    ]);
  });

  it("reads each line in New York time, keeps the extra fields, and shows a non-JSON line as it is", () => {
    const lines = diaryLines(
      '{"level":30,"time":1791564070960,"msg":"session started","pid":1,"account":"maya_journey8"}\n' +
        '{"level":50,"time":"2026-10-09T16:42:22.516Z","msg":"stopping","reason":"device_lost"}\n' +
        "not json\n\n",
    );
    expect(lines).toEqual([
      { time: "12:41:10", level: "info", msg: "session started", extra: "account=maya_journey8" },
      { time: "12:42:22", level: "PROBLEM", msg: "stopping", extra: "reason=device_lost" },
      { time: null, level: "info", msg: "not json", extra: "" },
    ]);
  });

  it("copies a header naming the warmup, then the raw JSON lines untouched", () => {
    const text = claudeText(diary);
    expect(text).toContain("Account: @maya_journey8, Profile 8, account id 26716659041349202");
    expect(text).toContain("Phone: iPhone 25 (id 25)");
    expect(text).toContain("Started: Oct 9, 2026 12:41:10 ET");
    expect(text).toContain("Outcome: stopped (device_lost)");
    expect(text.endsWith(`${body.log}`)).toBe(true);
    expect(claudeText({ ...diary, log: null, clearedAt: "2026-11-09T00:00:00Z" })).toContain("cleared after 30 days");
  });

  it("names the download by account, New York date and warmup", () => {
    expect(diaryFileName(diary)).toBe("warmup-maya_journey8-2026-10-09-w2.log");
  });
});
