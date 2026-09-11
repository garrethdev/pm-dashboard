import { describe, expect, it } from "vitest";
import {
  mixBalanceError,
  parseLanes,
  resolveLaneCharacters,
  sumLanes,
  unbalancedCharacters,
  weeklyBudgetError,
} from "@/lib/data/cadence-rules";

/**
 * The cadence rules, which is where the 2026-09-09 external review found its
 * #6. Two of the four things it raised were fixed in the database on 09-10; the
 * other two are fixed here, and these tests are what stops them coming back.
 *
 * The registry used throughout mirrors the real one closely enough to matter:
 * `filler` belongs to the pseudo-character "All", and Character 2 and
 * Character 4 both own lanes, because "is this lane yours" is the question the
 * route used to get wrong.
 */
const REGISTRY: Record<string, string> = {
  ba_2slide: "Character 2",
  char2_slideshow: "Character 2",
  glowup: "Character 2",
  conspiracy_kitchen: "Character 4",
  divorce_stories: "Character 4",
  cleora: "Character 5",
  filler: "All",
};

describe("parseLanes", () => {
  it("reads a well-formed list", () => {
    expect(parseLanes([{ contentType: "glowup", cadencePerWeek: 4 }])).toEqual([
      { contentType: "glowup", cadencePerWeek: 4 },
    ]);
  });

  it("refuses the same content type twice", () => {
    // The review's finding. Before this, a duplicate passed the client's sum
    // check and was caught only by the database, as a transaction failure.
    const result = parseLanes([
      { contentType: "glowup", cadencePerWeek: 2 },
      { contentType: "ba_2slide", cadencePerWeek: 2 },
      { contentType: "glowup", cadencePerWeek: 3 },
    ]);
    expect(result).toBe("glowup is in the list twice — send each content type once");
  });

  it("refuses a duplicate even when the mix still adds up", () => {
    // The nastiest shape: 2 + 3 = 5 looks right to any sum check, but it is
    // two contradictory instructions for one registry row.
    const result = parseLanes([
      { contentType: "glowup", cadencePerWeek: 2 },
      { contentType: "glowup", cadencePerWeek: 3 },
    ]);
    expect(typeof result).toBe("string");
  });

  it("ignores a character sent by the browser", () => {
    // Old clients still send one. It must not reach the output — the registry
    // is the authority, and silently honouring this field is the bug.
    const result = parseLanes([
      { contentType: "glowup", character: "Character 4", cadencePerWeek: 1 },
    ]);
    expect(result).toEqual([{ contentType: "glowup", cadencePerWeek: 1 }]);
  });

  it.each([
    ["an empty list", []],
    ["not a list", { contentType: "glowup", cadencePerWeek: 1 }],
    ["a missing content type", [{ cadencePerWeek: 1 }]],
    ["a blank content type", [{ contentType: "   ", cadencePerWeek: 1 }]],
    ["a fractional cadence", [{ contentType: "glowup", cadencePerWeek: 1.5 }]],
    ["a negative cadence", [{ contentType: "glowup", cadencePerWeek: -1 }]],
    ["a cadence over the lane cap", [{ contentType: "glowup", cadencePerWeek: 11 }]],
    ["a string cadence", [{ contentType: "glowup", cadencePerWeek: "3" }]],
  ])("refuses %s", (_label, input) => {
    expect(typeof parseLanes(input)).toBe("string");
  });

  it("allows a lane set to zero", () => {
    // Zero is a real instruction — "keep the lane, stop scheduling it".
    expect(parseLanes([{ contentType: "glowup", cadencePerWeek: 0 }])).toEqual([
      { contentType: "glowup", cadencePerWeek: 0 },
    ]);
  });
});

describe("resolveLaneCharacters", () => {
  it("takes each lane's character from the registry", () => {
    const result = resolveLaneCharacters(
      [
        { contentType: "glowup", cadencePerWeek: 4 },
        { contentType: "divorce_stories", cadencePerWeek: 4 },
      ],
      REGISTRY,
    );
    expect(result).toEqual([
      { contentType: "glowup", character: "Character 2", cadencePerWeek: 4 },
      { contentType: "divorce_stories", character: "Character 4", cadencePerWeek: 4 },
    ]);
  });

  it("refuses a content type the registry does not have", () => {
    const result = resolveLaneCharacters(
      [{ contentType: "not_a_real_lane", cadencePerWeek: 1 }],
      REGISTRY,
    );
    expect(result).toBe("no such content type: not_a_real_lane");
  });

  it("names every unknown lane, not just the first", () => {
    const result = resolveLaneCharacters(
      [
        { contentType: "nope_one", cadencePerWeek: 1 },
        { contentType: "glowup", cadencePerWeek: 1 },
        { contentType: "nope_two", cadencePerWeek: 1 },
      ],
      REGISTRY,
    );
    expect(result).toBe("no such content type: nope_one, nope_two");
  });
});

describe("the two together", () => {
  it("cannot be talked into moving a lane to another character", () => {
    // This is the review's second half, stated as a test. A payload claiming
    // glowup belongs to Character 4 gets Character 2 anyway, because that is
    // what the registry says. The route's "is this lane yours" check then has
    // something real to compare against.
    const parsed = parseLanes([
      { contentType: "glowup", character: "Character 4", cadencePerWeek: 4 },
    ]);
    expect(Array.isArray(parsed)).toBe(true);

    const resolved = resolveLaneCharacters(parsed as never, REGISTRY);
    expect(resolved).toEqual([
      { contentType: "glowup", character: "Character 2", cadencePerWeek: 4 },
    ]);
  });
});

describe("weeklyBudgetError", () => {
  it("passes a split that fits the week", () => {
    // 3 a day is 21 a week; 11 + 3 = 14.
    expect(weeklyBudgetError(3, 11, 3)).toBeNull();
  });

  it("passes a split that exactly fills the week", () => {
    expect(weeklyBudgetError(2, 10, 4)).toBeNull();
  });

  it("refuses more posts than there are slots", () => {
    const message = weeklyBudgetError(1, 11, 3);
    expect(message).toContain("can post 7 times a week");
    expect(message).toContain("comes to 14");
  });
});

describe("mixBalanceError", () => {
  const capFor = (name: string) => (name === "Character 5" ? 7 : 11);

  it("passes when every character's lanes add up to its own cap", () => {
    const error = mixBalanceError(
      [
        { contentType: "glowup", character: "Character 2", cadencePerWeek: 4 },
        { contentType: "ba_2slide", character: "Character 2", cadencePerWeek: 4 },
        { contentType: "char2_slideshow", character: "Character 2", cadencePerWeek: 3 },
        { contentType: "cleora", character: "Character 5", cadencePerWeek: 7 },
      ],
      capFor,
    );
    expect(error).toBeNull();
  });

  it("measures a character against ITS cap, not the fleet's", () => {
    // Character 5 runs 7 a week against a fleet 11. Measuring it against 11 is
    // what made the editor refuse every save for every character before
    // 2026-09-10, so this is the regression test for that.
    const error = mixBalanceError(
      [{ contentType: "cleora", character: "Character 5", cadencePerWeek: 7 }],
      capFor,
    );
    expect(error).toBeNull();
  });

  it("names each character that does not balance", () => {
    const error = mixBalanceError(
      [
        { contentType: "glowup", character: "Character 2", cadencePerWeek: 4 },
        { contentType: "cleora", character: "Character 5", cadencePerWeek: 6 },
      ],
      capFor,
    );
    expect(error).toBe(
      "Character 2's mix adds up to 4, not 11; Character 5's mix adds up to 6, not 7",
    );
  });
});

describe("sumLanes", () => {
  it("adds an empty list to zero", () => {
    expect(sumLanes([])).toBe(0);
  });

  it("adds the weekly numbers", () => {
    expect(sumLanes([{ cadencePerWeek: 4 }, { cadencePerWeek: 3 }, { cadencePerWeek: 0 }])).toBe(7);
  });
});

describe("unbalancedCharacters", () => {
  /**
   * The 2026-09-11 lockout, as it actually happened: `cleora_asmr` was switched
   * on in the database, so Character 5's lanes asked 7 + 7 while its allowance
   * still read 7. Every other character balanced. The Fleet tab refused to save
   * anything for anyone and named nobody.
   */
  const CHARACTERS = [
    { name: "Character 2", laneSum: 11 },
    { name: "Character 3", laneSum: 11 },
    { name: "Character 4", laneSum: 11 },
    { name: "Character 5", laneSum: 14 },
  ];
  const capFor = (name: string) => (name === "Character 5" ? 7 : 11);

  it("names only the character at fault, on the fleet tab", () => {
    expect(unbalancedCharacters(CHARACTERS, capFor, null)).toEqual([
      { name: "Character 5", sum: 14, target: 7 },
    ]);
  });

  it("is empty once that character's allowance is raised to match", () => {
    const fixed = (name: string) => (name === "Character 5" ? 14 : 11);
    expect(unbalancedCharacters(CHARACTERS, fixed, null)).toEqual([]);
  });

  it("reports the scoped character when it is the one at fault", () => {
    expect(unbalancedCharacters(CHARACTERS, capFor, "Character 5")).toEqual([
      { name: "Character 5", sum: 14, target: 7 },
    ]);
  });

  /** The banner must not point at a character whose numbers are not on screen:
   *  on the Char 2 tab, Character 5's problem is not actionable. */
  it("stays silent on another character's tab", () => {
    expect(unbalancedCharacters(CHARACTERS, capFor, "Character 2")).toEqual([]);
  });

  it("reports every offender on the fleet tab, not just the first", () => {
    const twoWrong = [
      { name: "Character 2", laneSum: 9 },
      { name: "Character 5", laneSum: 14 },
    ];
    expect(unbalancedCharacters(twoWrong, capFor, null)).toEqual([
      { name: "Character 2", sum: 9, target: 11 },
      { name: "Character 5", sum: 14, target: 7 },
    ]);
  });

  /** Under-allocating locks the save exactly as over-allocating does, and the
   *  banner has to read correctly in that direction too. */
  it("catches a mix that falls short of the allowance", () => {
    expect(unbalancedCharacters([{ name: "Character 4", laneSum: 8 }], capFor, null)).toEqual([
      { name: "Character 4", sum: 8, target: 11 },
    ]);
  });

  it("treats a character with no lanes at all as unbalanced against a live cap", () => {
    expect(unbalancedCharacters([{ name: "Character 3", laneSum: 0 }], capFor, null)).toEqual([
      { name: "Character 3", sum: 0, target: 11 },
    ]);
  });
});
