import { describe, expect, it } from "vitest";
import {
  accountsRefusal,
  categoryLabel,
  kindLabel,
  parseAccountsField,
  reportRefusal,
  screenshotRefusal,
  statusOf,
  validPagePath,
} from "@/lib/data/report-rules";

describe("reportRefusal", () => {
  const ok = {
    kind: "issue",
    category: "posting",
    description: "Profile 31 posted twice",
    pagePath: "/todo",
    accounts: [],
  };

  it("accepts a complete report", () => {
    expect(reportRefusal(ok)).toBeNull();
  });

  it("accepts an observation", () => {
    expect(reportRefusal({ ...ok, kind: "observation" })).toBeNull();
  });

  it("accepts a report with no page", () => {
    expect(reportRefusal({ ...ok, pagePath: null })).toBeNull();
  });

  it("needs a known kind", () => {
    expect(reportRefusal({ ...ok, kind: "" })).toBe("Choose Issue or Observation.");
    expect(reportRefusal({ ...ok, kind: "idea" })).toBe("Choose Issue or Observation.");
  });

  it("needs a known category", () => {
    expect(reportRefusal({ ...ok, category: "" })).toBe("Choose a category.");
    expect(reportRefusal({ ...ok, category: "billing" })).toBe("Choose a category.");
  });

  it("needs a description that is more than spaces, worded for the kind", () => {
    expect(reportRefusal({ ...ok, description: "   " })).toBe("Say what happened.");
    expect(reportRefusal({ ...ok, kind: "observation", description: "" })).toBe("Say what you noticed.");
  });

  it("caps the description", () => {
    expect(reportRefusal({ ...ok, description: "x".repeat(2001) })).toMatch(/under 2000/);
  });

  it("checks the accounts", () => {
    expect(reportRefusal({ ...ok, accounts: null })).toBe("The accounts are not valid.");
  });
});

describe("accountsRefusal", () => {
  it("takes none", () => {
    expect(accountsRefusal([])).toBeNull();
  });

  it("takes accounts with and without a post", () => {
    expect(
      accountsRefusal([
        { profile: "Profile 21", postId: null },
        { profile: "Profile 8", postId: "7561234567890123456" },
      ]),
    ).toBeNull();
  });

  it("refuses the same account twice", () => {
    expect(
      accountsRefusal([
        { profile: "Profile 21", postId: null },
        { profile: "Profile 21", postId: "1" },
      ]),
    ).toBe("Profile 21 is named twice.");
  });

  it("refuses more than ten", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ profile: `Profile ${i + 1}`, postId: null }));
    expect(accountsRefusal(many)).toMatch(/10 accounts at most/);
  });

  it("refuses anything that is not a Profile with an optional post", () => {
    expect(accountsRefusal("Profile 21")).toBe("The accounts are not valid.");
    expect(accountsRefusal([{ profile: "@cleora", postId: null }])).toBe("The accounts are not valid.");
    expect(accountsRefusal([{ profile: "Profile 21", postId: "" }])).toBe("The accounts are not valid.");
    expect(accountsRefusal([{ profile: "Profile 21" }])).toBe("The accounts are not valid.");
  });
});

describe("parseAccountsField", () => {
  it("reads an empty field as no accounts", () => {
    expect(parseAccountsField(null)).toEqual([]);
    expect(parseAccountsField("")).toEqual([]);
  });

  it("reads JSON", () => {
    expect(parseAccountsField('[{"profile":"Profile 21","postId":null}]')).toEqual([
      { profile: "Profile 21", postId: null },
    ]);
  });

  it("turns text that is not JSON into something accountsRefusal refuses", () => {
    expect(accountsRefusal(parseAccountsField("Profile 21"))).toBe("The accounts are not valid.");
  });
});

describe("validPagePath", () => {
  it("takes a path inside the app", () => {
    expect(validPagePath("/accounts?fleet=physical")).toBe(true);
  });

  it("refuses another site", () => {
    expect(validPagePath("https://example.com/")).toBe(false);
    expect(validPagePath("//example.com/")).toBe(false);
  });
});

describe("screenshotRefusal", () => {
  it("takes a PNG under the limit", () => {
    expect(screenshotRefusal({ type: "image/png", size: 1_000_000 })).toBeNull();
  });

  it("refuses HEIC, which the browser converts first", () => {
    expect(screenshotRefusal({ type: "image/heic", size: 1_000 })).toMatch(/JPG, PNG or WebP/);
  });

  it("refuses anything over 5 MB", () => {
    expect(screenshotRefusal({ type: "image/jpeg", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});

describe("labels", () => {
  it("names kinds, categories and statuses", () => {
    expect(kindLabel("observation")).toBe("Observation");
    expect(categoryLabel("devices")).toBe("Devices & proxies");
    expect(statusOf("in_progress").label).toBe("In progress");
  });

  it("treats an unknown status as open rather than crashing the page", () => {
    expect(statusOf("weird").value).toBe("open");
  });
});
