import { describe, expect, it } from "vitest";
import { OUTAGE_RUNS, detectOutage, plainReason, type N8nRun } from "@/lib/data/n8n-health";
import { n8nDownItem } from "@/lib/data/notifications";

// The 2026-09 outage: every scheduled run refused, only the error workflow
// still succeeding (Garreth, 2026-09-28: "add that as a notification").

const now = new Date("2026-09-28T06:20:00Z");
const run = (i: number, over: Partial<N8nRun> = {}): N8nRun => ({
  id: String(1000 - i),
  status: "error",
  mode: "trigger",
  startedAt: new Date(now.getTime() - i * 5 * 60_000).toISOString(),
  ...over,
});
const failing = (n: number) => Array.from({ length: n }, (_, i) => run(i));
const lastSuccess = (minutesAgo: number, mode = "trigger"): N8nRun[] => [
  run(0, { status: "success", mode, startedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString() }),
];

describe("detectOutage", () => {
  it("fires when the latest runs all failed and nothing succeeded for over an hour", () => {
    expect(detectOutage(failing(OUTAGE_RUNS), lastSuccess(3000), now)).toEqual({
      lastSuccessAt: new Date(now.getTime() - 3000 * 60_000).toISOString(),
      latestFailureId: "1000",
    });
  });

  it("stays quiet when any of the latest runs succeeded", () => {
    const recent = failing(OUTAGE_RUNS);
    recent[7] = run(7, { status: "success" });
    expect(detectOutage(recent, lastSuccess(35), now)).toBeNull();
  });

  it("stays quiet within the first hour, so a short blip clears itself", () => {
    expect(detectOutage(failing(OUTAGE_RUNS), lastSuccess(45), now)).toBeNull();
  });

  it("stays quiet on too little evidence", () => {
    expect(detectOutage(failing(OUTAGE_RUNS - 1), [], now)).toBeNull();
  });

  it("ignores the error workflow and test runs, which kept succeeding during the outage", () => {
    const recent = [run(0, { status: "success", mode: "error" }), run(1, { status: "success", mode: "manual" }), ...failing(OUTAGE_RUNS)];
    const outage = detectOutage(recent, [...lastSuccess(10, "error"), ...lastSuccess(3000)], now);
    expect(outage?.lastSuccessAt).toBe(new Date(now.getTime() - 3000 * 60_000).toISOString());
  });
});

describe("plainReason", () => {
  it("turns n8n's HTML limit message into a sentence", () => {
    expect(
      plainReason(
        '<p style="font-style: normal">Execution limit reached. Consider <a href="https://x">upgrading your plan</a></p>',
      ),
    ).toBe("Execution limit reached. Consider upgrading your plan");
  });
});

describe("n8nDownItem", () => {
  it("is one red item naming the reason and the last success, keyed on that success", () => {
    const item = n8nDownItem({
      outage: { lastSuccessAt: "2026-09-26T02:00:39Z", latestFailureId: "1", reason: "Execution limit reached. Consider upgrading your plan" },
    })!;
    expect(item).toMatchObject({
      title: "n8n is not running workflows",
      severity: "critical",
      body: "Execution limit reached. Consider upgrading your plan. Nothing has finished since Sep 25, 10:00 pm",
      href: "/automation",
      markKeys: ["n8n_down:2026-09-26T02:00:39Z"],
    });
    expect(item.fleet).toBeUndefined();
  });

  it("says nothing when n8n is fine", () => {
    expect(n8nDownItem({ outage: null })).toBeNull();
  });
});
