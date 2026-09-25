import { describe, expect, it } from "vitest";
import { carouselCatalog, validDeckCount } from "./catalog";

describe("carousel registry projection", () => {
  it("excludes video without inventing generator readiness", () => {
    const rows = carouselCatalog([
      { content_type: "video", display_name: "Video", character_name: "A", media_shape: "video", lifecycle: "live" },
      { content_type: "carousel/string-key", display_name: null, character_name: null, media_shape: "image_carousel", lifecycle: "retired" },
    ]);
    expect(rows).toEqual([{ id: "carousel/string-key", name: "carousel/string-key", character: "Unassigned", lifecycle: "retired" }]);
  });
  it("orders names and uses identity to break ties", () => {
    const make = (id: string, name: string) => ({ content_type: id, display_name: name, character_name: "A", media_shape: "image_carousel", lifecycle: "live" });
    expect(carouselCatalog([make("b", "Same"), make("z", "Alpha"), make("a", "Same")]).map(row => row.id)).toEqual(["z", "a", "b"]);
  });
});

describe("deck count", () => {
  it.each(["1", "20", "50"])("accepts %s", value => expect(validDeckCount(value)).toBe(true));
  it.each(["", "0", "51", "-1", "2.5", "NaN", "1e1", " 2"])("rejects %s", value => expect(validDeckCount(value)).toBe(false));
});
