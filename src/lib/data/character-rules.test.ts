import { describe, expect, it } from "vitest";
import {
  characterSlug,
  nextCharacterName,
  parseCharacterEdit,
  parseNewCharacter,
  photoRefusal,
} from "@/lib/data/character-rules";

describe("nextCharacterName", () => {
  it("is one past the highest number, whatever order they come in", () => {
    expect(nextCharacterName(["Character 3", "Character 5", "Character 2", "Character 4"])).toBe(
      "Character 6",
    );
  });

  it("starts at 1 with nothing to count, and ignores names that are not numbered", () => {
    expect(nextCharacterName([])).toBe("Character 1");
    expect(nextCharacterName(["All", "Character 2"])).toBe("Character 3");
  });
});

describe("parseNewCharacter", () => {
  it("takes a character with the posting amounts skipped", () => {
    const r = parseNewCharacter({ character: "Character 6", notes: "  ", maxPerDay: "", perWeek: "" });
    expect(r).toEqual({
      ok: true,
      fields: { character: "Character 6", notes: null, maxPerDay: null, perWeek: null },
    });
  });

  it("takes both amounts as numbers or as typed text", () => {
    const r = parseNewCharacter({ character: "Character 6", maxPerDay: "2", perWeek: 14 });
    expect(r.ok && r.fields).toMatchObject({ maxPerDay: 2, perWeek: 14 });
  });

  it("refuses a name the planner would not read", () => {
    expect(parseNewCharacter({ character: "Cleora" }).ok).toBe(false);
    expect(parseNewCharacter({ character: "character 6" }).ok).toBe(false);
  });

  it("refuses one amount without the other", () => {
    expect(parseNewCharacter({ character: "Character 6", maxPerDay: "2" }).ok).toBe(false);
    expect(parseNewCharacter({ character: "Character 6", perWeek: "14" }).ok).toBe(false);
  });

  it("refuses a week that cannot fit into the days", () => {
    const r = parseNewCharacter({ character: "Character 6", maxPerDay: 1, perWeek: 8 });
    expect(r).toEqual({ ok: false, error: "8 a week will not fit into 1 a day. The most is 7." });
  });

  it("refuses amounts out of range or not whole", () => {
    expect(parseNewCharacter({ character: "Character 6", maxPerDay: 0, perWeek: 1 }).ok).toBe(false);
    expect(parseNewCharacter({ character: "Character 6", maxPerDay: 11, perWeek: 1 }).ok).toBe(false);
    expect(parseNewCharacter({ character: "Character 6", maxPerDay: "1.5", perWeek: 7 }).ok).toBe(false);
  });
});

describe("parseCharacterEdit", () => {
  it("changes only what was sent", () => {
    expect(parseCharacterEdit({ character: "Character 6", notes: "Cleora's sister" })).toEqual({
      ok: true,
      fields: { character: "Character 6", notes: "Cleora's sister" },
    });
  });

  it("reads empty amounts as none, the same as Setup character", () => {
    expect(parseCharacterEdit({ character: "Character 6", maxPerDay: "", perWeek: "" })).toEqual({
      ok: true,
      fields: { character: "Character 6", amounts: { maxPerDay: null, perWeek: null } },
    });
  });

  it("holds amounts to the same rules as Setup character", () => {
    expect(parseCharacterEdit({ character: "Character 6", maxPerDay: 1, perWeek: 8 }).ok).toBe(false);
  });
});

describe("character photos", () => {
  it("takes JPG, PNG and WebP up to 2 MB", () => {
    expect(photoRefusal({ type: "image/jpeg", size: 30_000 })).toBe(null);
    expect(photoRefusal({ type: "image/heic", size: 30_000 })).not.toBe(null);
    expect(photoRefusal({ type: "image/png", size: 3 * 1024 * 1024 })).not.toBe(null);
    expect(photoRefusal({ type: "image/png", size: 0 })).not.toBe(null);
  });

  it("files each character's photos under its own folder", () => {
    expect(characterSlug("Character 6")).toBe("character-6");
  });
});
