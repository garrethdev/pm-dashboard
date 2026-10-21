import { afterEach, describe, expect, it } from "vitest";
import { isEmailAllowed, isReviewer, reviewerEmails } from "@/lib/auth";

const saved = { allowed: process.env.ALLOWED_EMAILS, reviewers: process.env.REVIEWER_EMAILS };

afterEach(() => {
  process.env.ALLOWED_EMAILS = saved.allowed;
  process.env.REVIEWER_EMAILS = saved.reviewers;
});

describe("isReviewer (PF-26)", () => {
  it("needs the address on both lists, compared lower-cased", () => {
    process.env.ALLOWED_EMAILS = "g@example.com, y@example.com, c@example.com";
    process.env.REVIEWER_EMAILS = "G@Example.com,c@example.com";
    expect(isReviewer("g@example.com")).toBe(true);
    expect(isReviewer(" C@EXAMPLE.COM ")).toBe(true);
    expect(isReviewer("y@example.com")).toBe(false);
    expect(isEmailAllowed("y@example.com")).toBe(true);
  });

  it("never widens the allowlist", () => {
    process.env.ALLOWED_EMAILS = "g@example.com";
    process.env.REVIEWER_EMAILS = "g@example.com,stranger@example.com";
    expect(isReviewer("stranger@example.com")).toBe(false);
    expect(reviewerEmails()).toEqual(["g@example.com", "stranger@example.com"]);
  });

  it("is nobody when the setting is unset or empty", () => {
    process.env.ALLOWED_EMAILS = "g@example.com";
    process.env.REVIEWER_EMAILS = "";
    expect(isReviewer("g@example.com")).toBe(false);
    delete process.env.REVIEWER_EMAILS;
    expect(isReviewer("g@example.com")).toBe(false);
    expect(isReviewer(undefined)).toBe(false);
    expect(isReviewer(null)).toBe(false);
  });
});
