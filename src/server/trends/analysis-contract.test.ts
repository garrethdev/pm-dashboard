import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAnalysis, getReference } from "./repo";
import { legacy, perez, v2 } from "./__fixtures__/analysis-rows";

// The n8n reader writes reference_analysis; the dashboard reads it. Nothing
// held the two to the same shape, and on 2026-10-31 the reader was found
// writing fields the dashboard never looked at. These pin the real rows the
// reader has produced against what the Analysis tab and the cards show.

type Row = Record<string, unknown>;

/** A PostgREST stand-in: answers by table name, returns [] for tables not given. */
function stubRest(tables: Record<string, Row[]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const table = new URL(String(input)).pathname.split("/rest/v1/")[1]!;
      return new Response(JSON.stringify(tables[table] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getAnalysis reads each shape the reader has written", () => {
  it("phase0-multiformat-v2: leads with why it's working and ends with the peptide remake", async () => {
    stubRest({ reference_analysis: [v2.row] });
    const a = await getAnalysis(7567);
    expect(a.status).toBe("complete");
    expect(Object.keys(a.howItWorks)[0]).toBe("Why it's working");
    expect(a.howItWorks["Remake for peptides"]).toContain("Thanksgiving");
    expect(a.howItWorks["Why it hooks"]).toBeTruthy();
    expect(a.howItWorks["Payoff"]).toMatch(/^Slide 9\. /);
    expect(a.howItWorks["Call to action"]).toContain("(slide 9)");
    expect(a.summary["Story structure"]).toContain("Problem-Agitation-Solution");
    expect(a.summary["First shown"]).toBe("Slide 5");
    expect(a.keep).toHaveLength(2);
    expect(a.limits).toHaveLength(1);
    expect(a.slidesRead).toEqual({ read: 1, of: 1 });
  });

  it("perez-slides-v1: reads the audience response as plain text", async () => {
    stubRest({ reference_analysis: [perez.row] });
    const a = await getAnalysis(3542);
    expect(a.themes).toEqual(["Releasing control"]);
    // The reader wrote questions as { question, evidence_comment_ids }.
    expect(a.questions).toEqual(["what makes these actions “feminine”?"]);
    expect(a.slidesRead).toEqual({ read: 10, of: 10 });
    expect(a.howItWorks["Why it's working"]).toBeUndefined();
  });

  it("phase0-multiformat-v1: the old read with no coverage still shows what it has", async () => {
    stubRest({ reference_analysis: [legacy.row] });
    const a = await getAnalysis(4722);
    expect(a.status).toBe("complete");
    expect(a.summary["Hook family"]).toBe("Product Comparison");
    expect(a.slidesRead).toBeNull();
    expect(a.keep).toEqual([]);
  });

  it("says so plainly when there is no analysis", async () => {
    stubRest({ reference_analysis: [] });
    expect((await getAnalysis(1)).status).toBe("none");
  });

  it("prefers the fuller perez read over a v2 read of the same carousel", async () => {
    stubRest({ reference_analysis: [v2.row, { ...perez.row, source_reference_id: 7567 }] });
    const a = await getAnalysis(7567);
    expect(a.howItWorks["Why it's working"]).toBeUndefined();
    expect(a.slidesRead).toEqual({ read: 10, of: 10 });
  });
});

describe("a card is built from a reference row and its analysis", () => {
  it("shows the radar's find as trending with its reach ratio", async () => {
    stubRest({ references_unified: [v2.ref], reference_analysis: [v2.row] });
    const r = (await getReference("me@test", 7567))!;
    expect(r.trendingAt).toBe("2026-10-31T16:25:42.151994+00:00");
    expect(r.reach).toBeCloseTo(5.97);
    expect(r.otherNiche).toBe(false);
    expect(r.hookFamily).toBe("Listicle / Warning");
    expect(r.topics).toContain("mounjaro_tips");
    expect(r.topics.length).toBeLessThanOrEqual(4);
  });

  it("sends an other_niches find to the Other niches tab", async () => {
    stubRest({ references_unified: [{ ...v2.ref, niche_tags: ["other_niches"] }], reference_analysis: [v2.row] });
    expect((await getReference("me@test", 7567))!.otherNiche).toBe(true);
  });

  it("takes slide pictures from the analysis media inventory, in order", async () => {
    stubRest({ references_unified: [perez.ref], reference_analysis: [perez.row] });
    const r = (await getReference("me@test", 3542))!;
    expect(r.slides.map((s) => s.position)).toEqual([1, 2, 3]);
    expect(r.slides.every((s) => s.media)).toBe(true);
    expect(r.trendingAt).toBeNull();
    expect(r.reach).toBeNull();
    expect(r.views).toBe(300460);
  });

  it("falls back to the latest snapshot when the row's own counts are zero", async () => {
    stubRest({
      references_unified: [legacy.ref],
      reference_analysis: [legacy.row],
      source_performance_snapshots: [{ source_reference_id: 4722, views: 900, likes: 40, bookmarks: 7 }],
    });
    const r = (await getReference("me@test", 4722))!;
    expect([r.views, r.likes, r.saves]).toEqual([900, 40, 7]);
  });

  it("returns null for a reference that does not exist", async () => {
    stubRest({ references_unified: [] });
    expect(await getReference("me@test", 99)).toBeNull();
  });
});
