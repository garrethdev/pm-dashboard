import { describe, expect, it } from "vitest";
import { chooseTrack, type TrackRow } from "./music";

const library: TrackRow[] = [
  { id: "1", artist: "Ayla Hart", title: "Slow Morning", pillar_fit: ["universal"], usage_count: 4 },
  { id: "2", artist: "Noor", title: "Glass Water", pillar_fit: ["universal"], usage_count: 0 },
];

describe("the track a deck is given (PR #31 review item 7)", () => {
  it("keeps the writer's track when the library has it", () => {
    expect(chooseTrack(library, "Ayla Hart - Slow Morning", "deck-1", null)).toEqual({ music: "Ayla Hart - Slow Morning", status: "found", asked: null });
  });
  it("says so when it swaps in a library track, and keeps what was asked for", () => {
    const t = chooseTrack(library, "Someone Else - Not In The Library", "deck-1", null);
    expect(t.status).toBe("substituted");
    expect(t.asked).toBe("Someone Else - Not In The Library");
    expect(library.map((r) => `${r.artist} - ${r.title}`)).toContain(t.music);
  });
  it("is a plain pick when the writer asked for nothing", () => {
    expect(chooseTrack(library, null, "deck-1", null).status).toBe("found");
  });
  it("is not found only when the library is empty", () => {
    expect(chooseTrack([], "Someone Else - Not In The Library", "deck-1", null)).toEqual({ music: "Someone Else - Not In The Library", status: "not_found", asked: "Someone Else - Not In The Library" });
  });
});
