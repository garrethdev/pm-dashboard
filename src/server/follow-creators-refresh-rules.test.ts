import { describe, expect, it } from "vitest";
import {
  SEARCH_PHRASES,
  SEARCHES_PER_RUN,
  instagramFromBio,
  isSellerLink,
  looksLikeSamePerson,
  phrasesFor,
  retireReason,
  topicsOf,
} from "./follow-creators-refresh-rules";

const base = { found: true, missedBefore: 0, followers: 2000, isPrivate: false, daysSincePost: null };

describe("retireReason", () => {
  it("keeps a creator who still fits", () => {
    expect(retireReason(base)).toBeNull();
    expect(retireReason({ ...base, followers: 6000, daysSincePost: 60 })).toBeNull();
  });
  it("forgives one empty lookup and retires on the second", () => {
    expect(retireReason({ ...base, found: false })).toBeNull();
    expect(retireReason({ ...base, found: false, missedBefore: 1 })).toBe("not found twice in a row");
  });
  it("retires a creator who went private, grew past 6,000, or went quiet on Instagram", () => {
    expect(retireReason({ ...base, isPrivate: true })).toBe("went private");
    expect(retireReason({ ...base, followers: 6001 })).toBe("grew past 6,000 followers");
    expect(retireReason({ ...base, daysSincePost: 61 })).toBe("no posts in 60 days");
  });
});

describe("phrasesFor", () => {
  it("takes ten phrases a month and moves on the next month", () => {
    const nov = phrasesFor(new Date("2026-11-01T13:00:00Z"));
    const dec = phrasesFor(new Date("2026-12-01T13:00:00Z"));
    expect(nov).toHaveLength(SEARCHES_PER_RUN);
    expect(new Set(nov).size).toBe(SEARCHES_PER_RUN);
    expect(dec).not.toEqual(nov);
    expect(nov.every((p) => SEARCH_PHRASES.includes(p))).toBe(true);
  });
  it("uses every phrase within a year", () => {
    const seen = new Set<string>();
    for (let m = 0; m < 12; m++) phrasesFor(new Date(Date.UTC(2027, m, 1))).forEach((p) => seen.add(p));
    expect(seen.size).toBe(SEARCH_PHRASES.length);
  });
});

describe("isSellerLink", () => {
  it("flags the GLP-1, pharmacy and affiliate links the first list rejected", () => {
    expect(isSellerLink("https://orderlymeds.com/pricing")).toBe(true);
    expect(isSellerLink("https://galaglp1.com")).toBe(true);
    expect(isSellerLink("https://intake.mondae.com/wl?r=x")).toBe(true);
    expect(isSellerLink("https://linktr.ee/lexenpeptide")).toBe(true);
  });
  it("leaves ordinary links alone", () => {
    expect(isSellerLink("https://linktr.ee/whitneypolfleit")).toBe(false);
    expect(isSellerLink(null)).toBe(false);
  });
});

describe("instagramFromBio", () => {
  it("reads the handle a bio names", () => {
    expect(instagramFromBio("Add me on IG @crystalmariee_xo ☺️", null)).toBe("crystalmariee_xo");
    expect(instagramFromBio("follow me on instagram @Kravessniya.", null)).toBe("kravessniya");
    expect(instagramFromBio("", "https://www.instagram.com/justaudrey/")).toBe("justaudrey");
    expect(instagramFromBio("Mom of 3", "https://linktr.ee/x")).toBeNull();
  });
});

describe("looksLikeSamePerson", () => {
  it("trusts a handle her bio names", () => {
    expect(looksLikeSamePerson("Kara", "Someone Else", true)).toBe(true);
  });
  it("needs a shared name word otherwise", () => {
    expect(looksLikeSamePerson("Shona | Midlife", "Shona Pressley", false)).toBe(true);
    expect(looksLikeSamePerson("Yara 🌚", "Jesus is King", false)).toBe(false);
    expect(looksLikeSamePerson(null, "Anyone", false)).toBe(false);
  });
});

describe("topicsOf", () => {
  it("tags the obvious topics", () => {
    expect(topicsOf("Mounjaro journey at 50, down 30 lbs, walking daily")).toEqual(["GLP-1", "Over 40/50", "Weight loss", "Fitness"]);
  });
});
