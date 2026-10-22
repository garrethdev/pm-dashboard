import { describe, expect, it } from "vitest";
import { readDetails, readSet } from "./tagging";
import { readDirections } from "./directions";
import { linkedPath, linkedSetFolder } from "@/server/carousel/repo/libraries";

describe("reading a picture's details from the model's reply", () => {
  it("keeps the live vocabulary and drops what is not in it", () => {
    const d = readDetails({
      content: "A woman at a kitchen counter with a mug.",
      emotion: "calm, unhurried",
      subject: "character_6",
      setting: "home kitchen",
      framing: "waist-up phone photo",
      color_palette: "warm cream, oak",
      image_type: "before",
      arc_roles: ["Before", "stack", "Villain"],
      pillar: "Rich_Life",
      tags: ["Kitchen", "morning", "mug"],
      quality_score: "7.6",
      has_subject: true,
    });
    expect(d.image_type).toBe("Before");
    expect(d.arc_roles).toEqual(["Before", "Stack"]);
    expect(d.pillar).toBe("rich_life");
    expect(d.tags).toEqual(["kitchen", "morning", "mug"]);
    expect(d.quality_score).toBe(8);
    expect(d.has_subject).toBe(true);
  });

  it("survives a thin or odd reply", () => {
    const d = readDetails({ content: 42, tags: "a, b", quality_score: "high", has_subject: "yes" });
    expect(d.content).toBe("");
    expect(d.tags).toEqual(["a", "b"]);
    expect(d.quality_score).toBeNull();
    expect(d.has_subject).toBe(false);
    expect(d.image_type).toBeNull();
  });

  it("files into a set only when the library has one by that name", () => {
    const sets = [
      { id: "s1", name: "Kitchen", parentId: null, count: 3 },
      { id: "s2", name: "Morning", parentId: "s1", count: 1 },
    ];
    expect(readSet({ set: "kitchen" }, sets)).toBe("s1");
    expect(readSet({ set: "Kitchen/Morning" }, sets)).toBe("s2");
    expect(readSet({ set: "Garage" }, sets)).toBeNull();
    expect(readSet({}, sets)).toBeNull();
  });
});

describe("directions from one instruction", () => {
  it("takes the prompts, drops blanks and repeats, and stops at the count", () => {
    const out = readDirections({ prompts: ["In the kitchen", "", { prompt: "In the garage" }, "in the KITCHEN", "On a balcony", "At the gym"] }, 3);
    expect(out).toEqual(["In the kitchen", "In the garage", "On a balcony"]);
  });

  it("gives nothing when the reply has no list", () => {
    expect(readDirections({ prompts: "one" }, 4)).toEqual([]);
  });
});

describe("a linked library's sets are folders", () => {
  const lib = { id: "lib-1", prefix: "character-6" };
  it("reads a set id back to its folder and refuses anything else", () => {
    expect(linkedSetFolder(lib, "lib-1:before")).toBe("before");
    expect(linkedSetFolder(lib, "lib-1:before/kitchen")).toBe("before/kitchen");
    expect(() => linkedSetFolder(lib, "lib-2:before")).toThrow();
    expect(() => linkedSetFolder(lib, "lib-1:a/b/c")).toThrow();
    expect(() => linkedSetFolder(lib, "lib-1:../up")).toThrow();
  });
  it("builds the path under the prefix", () => {
    expect(linkedPath(lib, "before", "x.jpg")).toBe("character-6/before/x.jpg");
    expect(linkedPath(lib, null, "x.jpg")).toBe("character-6/x.jpg");
    expect(linkedPath({ prefix: "" }, null, "x.jpg")).toBe("x.jpg");
  });
});
