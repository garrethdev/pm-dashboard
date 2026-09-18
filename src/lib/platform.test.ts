import { describe, expect, it } from "vitest";
import {
  PLATFORMS,
  PLATFORM_LABEL,
  PLATFORM_SHORT_LABEL,
  hasAnalytics,
  isPlatform,
  platformFilterOptions,
  platformsToOffer,
  platformProfileUrl,
  toPlatform,
} from "@/lib/platform";

/**
 * The platform helpers (PF-08).
 *
 * Worth testing because of the one mistake they exist to prevent: before
 * Facebook, every screen read "not Instagram" as TikTok. A Facebook account
 * treated that way is looked up in the TikTok views table, finds nothing, and
 * shows as an account nobody is watching. The health detector has already cost
 * real accounts that way once.
 */
describe("toPlatform", () => {
  it("keeps the three known platforms", () => {
    expect(toPlatform("tiktok")).toBe("tiktok");
    expect(toPlatform("instagram")).toBe("instagram");
    expect(toPlatform("facebook")).toBe("facebook");
  });

  it("does not turn Facebook into TikTok", () => {
    expect(toPlatform("facebook")).not.toBe("tiktok");
  });

  it("forgives capitals and stray spaces typed into the database by hand", () => {
    expect(toPlatform(" Facebook ")).toBe("facebook");
    expect(toPlatform("Instagram")).toBe("instagram");
  });

  it("reads anything unknown or empty as TikTok, as it always has", () => {
    expect(toPlatform(null)).toBe("tiktok");
    expect(toPlatform(undefined)).toBe("tiktok");
    expect(toPlatform("")).toBe("tiktok");
    expect(toPlatform("youtube")).toBe("tiktok");
  });
});

describe("isPlatform", () => {
  it("accepts only the exact known values", () => {
    expect(isPlatform("facebook")).toBe(true);
    expect(isPlatform("Facebook")).toBe(false);
    expect(isPlatform("youtube")).toBe(false);
    expect(isPlatform(null)).toBe(false);
  });
});

describe("hasAnalytics", () => {
  it("is true only where a views feed exists", () => {
    expect(hasAnalytics("tiktok")).toBe(true);
    expect(hasAnalytics("instagram")).toBe(true);
    expect(hasAnalytics("facebook")).toBe(false);
  });
});

describe("platformProfileUrl", () => {
  it("builds each platform's public profile link", () => {
    expect(platformProfileUrl("tiktok", "cleora")).toBe("https://www.tiktok.com/@cleora");
    expect(platformProfileUrl("instagram", "cleora")).toBe("https://www.instagram.com/cleora/");
    expect(platformProfileUrl("facebook", "cleora.asmr")).toBe("https://www.facebook.com/cleora.asmr");
  });

  it("returns nothing when the account has no handle yet", () => {
    expect(platformProfileUrl("facebook", null)).toBeNull();
    expect(platformProfileUrl("facebook", "  ")).toBeNull();
  });

  it("drops a leading @ so TikTok links do not double it", () => {
    expect(platformProfileUrl("tiktok", "@cleora")).toBe("https://www.tiktok.com/@cleora");
  });

  it("keeps the dots and underscores handles are made of", () => {
    expect(platformProfileUrl("instagram", "a_b.c")).toBe("https://www.instagram.com/a_b.c/");
  });
});

describe("labels and filter options", () => {
  it("has a full and a short name for every platform", () => {
    for (const p of PLATFORMS) {
      expect(PLATFORM_LABEL[p]).toBeTruthy();
      expect(PLATFORM_SHORT_LABEL[p]).toBeTruthy();
    }
    expect(PLATFORM_SHORT_LABEL.facebook).toBe("FB");
  });

  it("keeps the old All / TT / IG filter when no Facebook account is listed", () => {
    expect(platformFilterOptions(["tiktok", "instagram"])).toEqual([
      { value: "all", label: "All" },
      { value: "tiktok", label: "TT" },
      { value: "instagram", label: "IG" },
    ]);
    // An empty list still offers the two platforms the app has always had.
    expect(platformFilterOptions([]).map((o) => o.value)).toEqual(["all", "tiktok", "instagram"]);
  });

  it("offers All first, then every platform", () => {
    expect(platformFilterOptions()).toEqual([
      { value: "all", label: "All" },
      { value: "tiktok", label: "TT" },
      { value: "instagram", label: "IG" },
      { value: "facebook", label: "FB" },
    ]);
  });
});

describe("platformsToOffer", () => {
  it("always offers Facebook in Physical, even before a Facebook account exists", () => {
    const options = platformFilterOptions(platformsToOffer("physical", ["tiktok"]));
    expect(options.map((o) => o.value)).toEqual(["all", "tiktok", "instagram", "facebook"]);
  });

  it("keeps Cloud on the platforms it has", () => {
    const options = platformFilterOptions(platformsToOffer("cloud", ["tiktok", "instagram"]));
    expect(options.map((o) => o.value)).toEqual(["all", "tiktok", "instagram"]);
  });
});
