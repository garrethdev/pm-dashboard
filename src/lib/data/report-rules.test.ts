import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  reportRefusal,
  screenshotRefusal,
  statusOf,
  validPagePath,
} from "@/lib/data/issue-rules";

describe("reportRefusal", () => {
  const ok = { category: "posting", description: "Profile 31 posted twice", pagePath: "/todo" };

  it("accepts a complete report", () => {
    expect(reportRefusal(ok)).toBeNull();
  });

  it("accepts a report with no page", () => {
    expect(reportRefusal({ ...ok, pagePath: null })).toBeNull();
  });

  it("needs a known category", () => {
    expect(reportRefusal({ ...ok, category: "" })).toBe("Choose a category.");
    expect(reportRefusal({ ...ok, category: "billing" })).toBe("Choose a category.");
  });

  it("needs a description that is more than spaces", () => {
    expect(reportRefusal({ ...ok, description: "   " })).toBe("Say what happened.");
  });

  it("caps the description", () => {
    expect(reportRefusal({ ...ok, description: "x".repeat(2001) })).toMatch(/under 2000/);
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
  it("names categories and statuses", () => {
    expect(categoryLabel("devices")).toBe("Devices & proxies");
    expect(statusOf("in_progress").label).toBe("In progress");
  });

  it("treats an unknown status as open rather than crashing the page", () => {
    expect(statusOf("weird").value).toBe("open");
  });
});
