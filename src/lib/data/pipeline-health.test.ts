import { describe, expect, it } from "vitest";
import { pipelineItems, type PipelineFacts } from "@/lib/data/pipeline-health";

// The 2026-10-09 stall: the reader's model was retired and nothing was
// analysed for three weeks with no sign in the dashboard.

const now = new Date("2026-10-31T20:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const healthy: PipelineFacts = {
  newestAnalysisAt: ago(0.2),
  waiting: 4000,
  oldestRunningSince: ago(0.1),
  finished24h: 300,
  failed24h: 12,
};
const types = (f: Partial<PipelineFacts>) => pipelineItems({ ...healthy, ...f }, now).map((i) => i.type);

describe("pipelineItems", () => {
  it("is quiet when analyses are arriving", () => {
    expect(types({})).toEqual([]);
  });
  it("fires when work is waiting and nothing was analysed for 6 hours", () => {
    expect(types({ newestAnalysisAt: ago(6) })).toEqual(["pipeline_stalled"]);
  });
  it("stays quiet at 5 hours", () => {
    expect(types({ newestAnalysisAt: ago(5) })).toEqual([]);
  });
  it("stays quiet when idle with an empty queue", () => {
    expect(types({ newestAnalysisAt: ago(48), waiting: 0 })).toEqual([]);
  });
  it("fires when nothing has ever been analysed and work is waiting", () => {
    const [item] = pipelineItems({ ...healthy, newestAnalysisAt: null }, now);
    expect(item?.type).toBe("pipeline_stalled");
    expect(item?.id).toBe("pipeline_stalled:never");
  });
  it("keys the stall on the last analysis so a dismissal holds for the outage", () => {
    const a = pipelineItems({ ...healthy, newestAnalysisAt: ago(8) }, now)[0]!;
    const later = new Date(now.getTime() + 3_600_000);
    const b = pipelineItems({ ...healthy, newestAnalysisAt: ago(8) }, later)[0]!;
    expect(a.id).toBe(b.id);
  });
  it("warns about a job running over an hour", () => {
    const [item] = pipelineItems({ ...healthy, oldestRunningSince: ago(3) }, now);
    expect(item?.type).toBe("pipeline_stuck");
    expect(item?.severity).toBe("warning");
  });
  it("fires when half of a day's finished jobs failed", () => {
    expect(types({ finished24h: 20, failed24h: 10 })).toEqual(["pipeline_failing"]);
  });
  it("ignores a high failure rate on a handful of jobs", () => {
    expect(types({ finished24h: 5, failed24h: 5 })).toEqual([]);
  });
  it("can raise all three at once", () => {
    expect(types({ newestAnalysisAt: ago(9), oldestRunningSince: ago(4), finished24h: 40, failed24h: 40 })).toEqual([
      "pipeline_stalled",
      "pipeline_stuck",
      "pipeline_failing",
    ]);
  });
});
