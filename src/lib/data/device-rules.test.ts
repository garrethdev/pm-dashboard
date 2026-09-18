import { describe, expect, it } from "vitest";
import {
  assignRefusal,
  MAX_ACCOUNTS_PER_DEVICE,
  parseDeviceFields,
  proofRefusal,
  proxyForDisplay,
} from "@/lib/data/device-rules";

/**
 * The three-accounts rule lives only in the app — the database will happily
 * take a fourth — so this function is the whole guard. A phone carrying more
 * accounts than planned is exactly the pattern the move to real phones is
 * meant to get away from.
 */
describe("assignRefusal", () => {
  const base = {
    deviceId: 7,
    deviceName: "iPhone 3",
    deviceActive: true,
    heldCount: 0,
    accountActive: true,
    accountDeviceId: null,
  };

  it("allows an account onto an empty phone", () => {
    expect(assignRefusal(base)).toBeNull();
  });

  it("allows the third account", () => {
    expect(assignRefusal({ ...base, heldCount: MAX_ACCOUNTS_PER_DEVICE - 1 })).toBeNull();
  });

  it("refuses a fourth and names the phone", () => {
    const why = assignRefusal({ ...base, heldCount: 3 });
    expect(why).toContain("iPhone 3");
    expect(why).toContain("3 accounts");
  });

  it("refuses a phone that is switched off, even when it has room", () => {
    expect(assignRefusal({ ...base, deviceActive: false })).toContain("switched off");
  });

  it("refuses a retired account", () => {
    expect(assignRefusal({ ...base, accountActive: false })).toContain("retired");
  });

  it("refuses an account that is already on this phone", () => {
    expect(assignRefusal({ ...base, accountDeviceId: 7 })).toContain("already on iPhone 3");
  });

  it("refuses an account that is on a different phone rather than moving it silently", () => {
    expect(assignRefusal({ ...base, accountDeviceId: 2 })).toContain("another phone");
  });
});

describe("proofRefusal", () => {
  it("accepts a normal screenshot", () => {
    expect(proofRefusal({ type: "image/png", size: 400_000 })).toBeNull();
  });

  it("refuses a file that is not an image", () => {
    expect(proofRefusal({ type: "application/pdf", size: 1000 })).not.toBeNull();
  });

  it("refuses anything over 5 MB", () => {
    expect(proofRefusal({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toContain("5 MB");
  });

  it("refuses an empty file", () => {
    expect(proofRefusal({ type: "image/jpeg", size: 0 })).not.toBeNull();
  });
});

describe("parseDeviceFields", () => {
  it("trims, and turns blank optional fields into null", () => {
    expect(
      parseDeviceFields({ name: "  iPhone 1 ", model: "", notes: "  " }, { requireName: true }),
    ).toEqual({ ok: true, fields: { name: "iPhone 1", model: null, notes: null } });
  });

  it("needs a name to register a phone", () => {
    expect(parseDeviceFields({ model: "iPhone 12" }, { requireName: true }).ok).toBe(false);
  });

  it("lets an edit leave the name alone but not blank it", () => {
    expect(parseDeviceFields({ model: "iPhone 12" }, { requireName: false }).ok).toBe(true);
    expect(parseDeviceFields({ name: " " }, { requireName: false }).ok).toBe(false);
  });

  it("refuses values that are not text", () => {
    expect(parseDeviceFields({ name: "A", model: 12 }, { requireName: true }).ok).toBe(false);
  });

  it("ignores keys it does not know", () => {
    expect(parseDeviceFields({ name: "A", id: 99 }, { requireName: true })).toEqual({
      ok: true,
      fields: { name: "A" },
    });
  });
});

describe("proxyForDisplay", () => {
  it("drops the username and password from a full pasted line", () => {
    expect(proxyForDisplay("82.47.5.7:41802:user:pa:ss")).toBe("82.47.5.7:41802");
  });

  it("leaves host:port and empty values as they are", () => {
    expect(proxyForDisplay("82.47.5.7:41802")).toBe("82.47.5.7:41802");
    expect(proxyForDisplay(null)).toBeNull();
  });
});
