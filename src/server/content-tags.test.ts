import { describe, expect, it } from "vitest";
import { firstMedia, hookFamilyOf, hookTextOf, hookTypeOf, isVideo, parseDuration, promptFor, readAiReply } from "./content-tags";

describe("hookTextOf", () => {
  it("reads each lane's own name for the hook words", () => {
    expect(hookTextOf({ hook_text: "Day 1: I'm gonna lose some weight" })).toBe("Day 1: I'm gonna lose some weight");
    expect(hookTextOf({ text_hook: "Week one I almost quit", text_hook_after: "Week seven" })).toBe("Week one I almost quit");
    expect(hookTextOf({ hook_before: "before i figured out what worked", hook_after: "same girl" })).toBe("before i figured out what worked");
    expect(hookTextOf({ screen_1_text: "A box. A claimed life force." })).toBe("A box. A claimed life force.");
  });
  it("prefers the hook over slide 1's text, and skips empty columns", () => {
    expect(hookTextOf({ slide_1: "slide copy", hook_text: "  ", hook: "the hook" })).toBe("the hook");
  });
  it("is empty when the lane keeps no hook words", () => {
    expect(hookTextOf({ transcript: "a whole transcript" })).toBeNull();
    expect(hookTextOf(null)).toBeNull();
    expect(hookTextOf({ hooks: ["not", "text"] })).toBeNull();
  });
});

describe("hookTypeOf", () => {
  it("keeps the type the writer recorded", () => {
    expect(hookTypeOf({ hook_type: "talk_to_weight:fired" }, "journey_3slide")).toBe("talk_to_weight:fired");
    expect(hookTypeOf({ hook_angle: "curiosity" }, "embarrassed_angle")).toBe("curiosity");
  });
  it("drops types that say nothing", () => {
    expect(hookTypeOf({ hook_type: "viral_theories" }, "viral_theories")).toBeNull();
    expect(hookTypeOf({ hook_type: "default" }, "cleora_asmr")).toBeNull();
    expect(hookTypeOf({}, "cleora")).toBeNull();
  });
});

describe("hookFamilyOf", () => {
  it("groups a lane's fine-grained types by the part before the colon", () => {
    expect(hookFamilyOf("talk_to_weight:fired")).toBe("talk_to_weight");
    expect(hookFamilyOf("declaration:reward")).toBe("declaration");
  });
  it("puts Journey's 'Declaration' with its 'declaration:…' types", () => {
    expect(hookFamilyOf("Declaration")).toBe("declaration");
  });
  it("keeps a type with no colon whole", () => {
    expect(hookFamilyOf("contrarian")).toBe("contrarian");
    expect(hookFamilyOf(null)).toBeNull();
  });
});

describe("parseDuration", () => {
  it("reads ffmpeg's duration line in seconds", () => {
    expect(parseDuration("  Duration: 00:00:46.00, start: 0.000000, bitrate: 2208 kb/s")).toBe(46);
    expect(parseDuration("Duration: 00:01:02.53, start")).toBe(62.53);
  });
  it("is empty when ffmpeg gave none", () => {
    expect(parseDuration("Duration: N/A, bitrate: N/A")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });
});

describe("isVideo and firstMedia", () => {
  it("trusts the registry's shape, and the file name when there is none", () => {
    expect(isVideo("video", "https://x/slide_1.jpg")).toBe(true);
    expect(isVideo("image_carousel", "https://x/a.mp4")).toBe(false);
    expect(isVideo(null, "https://x/CLE-B1-0003.mp4")).toBe(true);
    expect(isVideo(null, "https://x/slide_01.jpg")).toBe(false);
  });
  it("takes the first stored slide, else the single media link", () => {
    expect(firstMedia("https://x/v.mp4", ["https://x/s1.jpg", "https://x/s2.jpg"])).toBe("https://x/s1.jpg");
    expect(firstMedia("https://x/v.mp4", null)).toBe("https://x/v.mp4");
    expect(firstMedia(null, [])).toBeNull();
  });
  it("turns a Google Drive view link into the file itself", () => {
    expect(firstMedia("https://drive.google.com/file/d/12-xdzTngaJPLWdHrlelyhcii8mzLJgh9/view?usp=sharing", null)).toBe(
      "https://drive.google.com/uc?export=download&id=12-xdzTngaJPLWdHrlelyhcii8mzLJgh9",
    );
  });
});

describe("readAiReply", () => {
  it("reads the expected fields", () => {
    expect(readAiReply({ face: true, words_on_screen: " TUMORS MELTED AFTER A FEVER ", hook_type: "Surprising_Fact" })).toEqual({
      face: true,
      wordsOnScreen: "TUMORS MELTED AFTER A FEVER",
      hookType: "surprising_fact",
    });
  });
  it("leaves out anything not on the list or of the wrong kind", () => {
    expect(readAiReply({ face: "yes", words_on_screen: 42, hook_type: "clickbait" })).toEqual({
      face: null,
      wordsOnScreen: null,
      hookType: null,
    });
  });
  it("does not read a property of every object as a hook type", () => {
    expect(readAiReply({ hook_type: "constructor" }).hookType).toBeNull();
  });
  it("cuts long words to length", () => {
    expect(readAiReply({ words_on_screen: "x".repeat(900) }).wordsOnScreen).toHaveLength(500);
  });
});

describe("promptFor", () => {
  it("asks for a hook type only when the writer recorded none", () => {
    expect(promptFor("He only remembers me for alimony", true)).toContain('The opening line is: "He only remembers me for alimony"');
    expect(promptFor(null, true)).toContain("Judge the words on screen.");
    expect(promptFor("anything", false)).toContain('leave it as ""');
  });
});
