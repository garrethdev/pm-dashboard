import { describe, expect, it } from "vitest";
import { ageGroup, ageSplit, countryName, countrySplit, genderSplit, parseAudienceHandoff, readInstagramAudience, robotAudienceRow, toPercents } from "./audience-readings";

const r = (v: string, value: number) => ({ dimension_values: [v], value });

describe("splits", () => {
  it("gender is Women and Men only, as the app shows it", () => {
    // kathy_spd's engaged audience, 2026-11-26: F 84, U 32, M 12.
    expect(genderSplit([r("F", 84), r("U", 32), r("M", 12)])).toEqual({ Women: 87.5, Men: 12.5 });
  });
  it("names countries as the robot's readings do", () => {
    expect(countryName("US")).toBe("United States");
    expect(countrySplit([r("US", 49), r("GB", 20), r("IN", 31)])).toEqual({ "United States": 49, "United Kingdom": 20, India: 31 });
  });
  it("keeps Instagram's age bands", () => {
    expect(ageSplit([r("35-44", 3), r("45-54", 1)])).toEqual({ "35-44": 75, "45-54": 25 });
  });
  it("nothing to divide is null, not zeros", () => {
    expect(toPercents({})).toBeNull();
    expect(genderSplit([r("U", 5)])).toBeNull();
  });
});

/** A pretend Graph API: answers by the path, records nothing about the token. */
function fakeGraph(answers: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const u = new URL(url);
    const key = u.pathname.endsWith("/me") ? "me" : (u.searchParams.get("breakdown") ?? "?");
    const body = answers[key] ?? { error: { message: "unexpected call" } };
    return new Response(JSON.stringify(body), { status: (body as { error?: unknown }).error ? 400 : 200 });
  }) as unknown as typeof fetch;
}
const breakdown = (results: { dimension_values: string[]; value: number }[]) => ({ data: [{ total_value: { breakdowns: [{ results }] } }] });

describe("readInstagramAudience", () => {
  it("reads gender, age and country", async () => {
    const row = await readInstagramAudience(
      "kathy_spd",
      "t",
      fakeGraph({
        me: { followers_count: 210 },
        gender: breakdown([r("F", 84), r("U", 32), r("M", 12)]),
        age: breakdown([r("35-44", 39), r("45-54", 34)]),
        country: breakdown([r("US", 49), r("GB", 20)]),
      }),
    );
    expect(row.gap).toBeNull();
    expect(row.people).toBe(128);
    expect(row.gender).toEqual({ Women: 87.5, Men: 12.5 });
    expect(row.country?.["United States"]).toBe(71);
  });
  it("under 100 followers asks nothing more", async () => {
    const row = await readInstagramAudience("x", "t", fakeGraph({ me: { followers_count: 57 } }));
    expect(row.gap).toBe("too_few_followers");
    expect(row.gender).toBeNull();
  });
  it('"Not enough users" is too little engagement, not an error', async () => {
    const row = await readInstagramAudience("x", "t", fakeGraph({ me: { followers_count: 238 }, gender: { error: { message: "Not enough users" } } }));
    expect(row.gap).toBe("not_enough_engagement");
  });
  it("any other refusal is an error with its words", async () => {
    const row = await readInstagramAudience("x", "t", fakeGraph({ me: { error: { message: "Error validating access token" } } }));
    expect(row.gap).toBe("error");
    expect(row.notes).toContain("access token");
  });
});

describe("the robot's Viewers readings (operation 14; Garreth, 2026-11-27)", () => {
  const item = {
    platform: "tiktok" as const,
    account: "sarah.keller52",
    period: "28 days",
    screenshots: ["tiktok/sarah.keller52/2026-11-27/12-viewers.jpeg", "tiktok/sarah.keller52/2026-11-27/13-viewers-gender.jpeg"],
    problem: null,
  };

  it("checks the hand-off: robot only, this platform's bucket paths only", () => {
    expect(parseAudienceHandoff({ read_by: "robot", audiences: [item] })).toEqual([item]);
    expect(() => parseAudienceHandoff({ read_by: "manual", audiences: [item] })).toThrow();
    expect(() => parseAudienceHandoff({ read_by: "robot", audiences: [] })).toThrow();
    expect(() => parseAudienceHandoff({ read_by: "robot", audiences: [{ ...item, screenshots: ["instagram/x/2026-11-27/01-a.jpeg"] }] })).toThrow();
    expect(() => parseAudienceHandoff({ read_by: "robot", audiences: [{ ...item, screenshots: ["../secret.jpeg"] }] })).toThrow();
    expect(parseAudienceHandoff({ read_by: "robot", audiences: [{ ...item, account: "@sarah.keller52" }] })[0]!.account).toBe("sarah.keller52");
  });

  it("turns the AI's reading of Yurie's recording into the row the Deep page reads", () => {
    // The numbers on Yurie's recording, 2026-11-27 (7 days).
    const row = robotAudienceRow(item, {
      timeframe: "Nov 19 - Nov 25",
      people: 1100,
      gender: { Female: 79, Male: 20, Other: 1 },
      age: { "18 -24": 13.6, "25- 34": 30, "35-44": 27.8, "45 - 54": 20, "55+": 8.6 },
      country: { "United States": 96.3, "United Kingdom": 1, Argentina: 0.3 },
      too_few: false,
      notes: null,
    }, "anthropic/claude-haiku-5.5");
    expect(row).toMatchObject({
      platform: "tiktok",
      account: "sarah.keller52",
      source: "robot",
      timeframe: "Last 28 days, Nov 19 - Nov 25",
      people: 1100,
      gender: { Women: 79, Men: 20, Other: 1 },
      age: { "18-24": 13.6, "25-34": 30, "35-44": 27.8, "45-54": 20, "55+": 8.6 },
      country: { "United States": 96.3, "United Kingdom": 1, Argentina: 0.3 },
      gap: null,
      screenshots: item.screenshots,
    });
  });

  it("empty is not 0: nothing shown is null with the reason", () => {
    expect(robotAudienceRow(item, { too_few: true, gender: null, age: null, country: null }, "m")).toMatchObject({ gender: null, age: null, country: null, gap: "not_enough_engagement" });
    expect(robotAudienceRow({ ...item, screenshots: [], problem: "the \"Viewers\" tab is not on screen" }, null, null)).toMatchObject({ gap: "error", notes: 'robot: the "Viewers" tab is not on screen' });
    // A percent that is not a percent is dropped, never kept as a number.
    expect(robotAudienceRow(item, { gender: { Female: "79%", Male: 140 } }, "m").gender).toEqual({ Women: 79 });
    expect(ageGroup("45 – 54")).toBe("45-54");
  });
});
