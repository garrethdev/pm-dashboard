import { describe, expect, it } from "vitest";
import {
  nextProfileName,
  normaliseProfile,
  normaliseUsername,
  parseNewAccount,
} from "@/lib/data/account-rules";

const TODAY = "2026-09-22";

function body(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    profile: "Profile 79",
    username: "cleora.glp",
    character: "Character 5",
    platform: "tiktok",
    deliveryMode: "manual",
    deviceId: null,
    createdOn: "2026-09-20",
    paused: true,
    ...over,
  };
}

describe("normaliseProfile", () => {
  it("keeps a name that is already right", () => {
    expect(normaliseProfile("Profile 19")).toBe("Profile 19");
  });

  it("settles the spellings that would otherwise become a second account", () => {
    // Every one of these is the SAME account to a person and a different
    // string to a database join.
    expect(normaliseProfile("profile 19")).toBe("Profile 19");
    expect(normaliseProfile("PROFILE 19")).toBe("Profile 19");
    expect(normaliseProfile("Profile  19")).toBe("Profile 19");
    expect(normaliseProfile("  Profile 19  ")).toBe("Profile 19");
    expect(normaliseProfile("Profile 019")).toBe("Profile 19");
    expect(normaliseProfile("Profile19")).toBe("Profile 19");
    expect(normaliseProfile("19")).toBe("Profile 19");
  });

  it("refuses anything that is not a profile number", () => {
    expect(normaliseProfile("")).toBeNull();
    expect(normaliseProfile("Profile")).toBeNull();
    expect(normaliseProfile("Profile 0")).toBeNull();
    expect(normaliseProfile("Profile 19a")).toBeNull();
    expect(normaliseProfile("Profile -19")).toBeNull();
    expect(normaliseProfile("Profile 19; drop")).toBeNull();
    expect(normaliseProfile(null)).toBeNull();
  });
});

describe("nextProfileName", () => {
  it("counts on from the highest", () => {
    expect(nextProfileName(["Profile 8", "Profile 78"])).toBe("Profile 79");
  });

  it("never offers a gap, because a deleted account's posts still carry its name", () => {
    expect(nextProfileName(["Profile 8", "Profile 10"])).toBe("Profile 11");
  });

  it("starts at one on an empty fleet", () => {
    expect(nextProfileName([])).toBe("Profile 1");
  });

  it("ignores rows with no name", () => {
    expect(nextProfileName(["Profile 5", null, undefined, ""])).toBe("Profile 6");
  });
});

describe("normaliseUsername", () => {
  it("drops the @ and the spaces", () => {
    expect(normaliseUsername("  @cleora.glp ")).toBe("cleora.glp");
  });

  it("refuses a handle with a space or a slash in it", () => {
    expect(normaliseUsername("cleora glp")).toBeNull();
    expect(normaliseUsername("tiktok.com/@cleora")).toBeNull();
    expect(normaliseUsername("")).toBeNull();
  });
});

describe("parseNewAccount", () => {
  it("accepts a filled-in form", () => {
    const out = parseNewAccount(body(), { today: TODAY });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.fields.profile).toBe("Profile 79");
      expect(out.fields.username).toBe("cleora.glp");
      expect(out.fields.deliveryMode).toBe("manual");
      expect(out.fields.paused).toBe(true);
    }
  });

  it("refuses a name that is not a Profile", () => {
    const out = parseNewAccount(body({ profile: "cleora" }), { today: TODAY });
    expect(out).toMatchObject({ ok: false });
  });

  it("refuses a missing character", () => {
    expect(parseNewAccount(body({ character: "  " }), { today: TODAY })).toMatchObject({
      ok: false,
    });
  });

  it("refuses an unknown platform", () => {
    expect(parseNewAccount(body({ platform: "youtube" }), { today: TODAY })).toMatchObject({
      ok: false,
    });
  });

  it("refuses a phone on a Cloud account", () => {
    // A Geelark account has no physical phone; letting one through would put a
    // cloud account into a phone's day.
    expect(
      parseNewAccount(body({ deliveryMode: "geelark", deviceId: 3 }), { today: TODAY }),
    ).toMatchObject({ ok: false });
  });

  it("takes a phone as a number or as the string a <select> gives", () => {
    const fromSelect = parseNewAccount(body({ deviceId: "3" }), { today: TODAY });
    expect(fromSelect.ok && fromSelect.fields.deviceId).toBe(3);
    const blank = parseNewAccount(body({ deviceId: "" }), { today: TODAY });
    expect(blank.ok && blank.fields.deviceId).toBeNull();
  });

  it("refuses a made-on date in the future or that never happened", () => {
    expect(parseNewAccount(body({ createdOn: "2027-01-01" }), { today: TODAY })).toMatchObject({
      ok: false,
    });
    expect(parseNewAccount(body({ createdOn: "2026-02-31" }), { today: TODAY })).toMatchObject({
      ok: false,
    });
    expect(parseNewAccount(body({ createdOn: "" }), { today: TODAY })).toMatchObject({ ok: false });
  });

  it("allows tomorrow, because the browser's date can be a day ahead of the server's", () => {
    expect(parseNewAccount(body({ createdOn: "2026-09-23" }), { today: TODAY })).toMatchObject({
      ok: true,
    });
  });

  it("pauses unless it is told not to", () => {
    const missing = parseNewAccount(body({ paused: undefined }), { today: TODAY });
    expect(missing.ok && missing.fields.paused).toBe(true);
    const live = parseNewAccount(body({ paused: false }), { today: TODAY });
    expect(live.ok && live.fields.paused).toBe(false);
  });
});
