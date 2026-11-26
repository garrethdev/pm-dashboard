import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  fitToCap,
  maskEmail,
  maskPhone,
  maskProxy,
  paginate,
  pickFields,
  reply,
  scrub,
} from "@/server/mcp/shape";

const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

describe("scrub", () => {
  it("drops secret-named fields and counts them", () => {
    const counter = { removed: 0 };
    const out = scrub(
      { username: "jane", tiktok_password: "hunter2", google_totp_secret: "ABC", access_token: "x", tokens: { a: 1 }, nested: { apiKey: "k" } },
      counter,
    );
    expect(out).toEqual({ username: "jane", nested: {} });
    expect(counter.removed).toBe(5);
  });

  it("keeps counts that only sound secret", () => {
    expect(scrub({ input_tokens: 120, output_tokens: 40 })).toEqual({ input_tokens: 120, output_tokens: 40 });
  });

  it("blanks login tokens and signed private links wherever they are", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop";
    const signed = "https://x.supabase.co/storage/v1/object/sign/issue-screenshots/a.png?token=abc";
    const out = scrub({ note: jwt, screenshotUrl: signed, key: "sb_secret_abc123", fine: "hello" }) as Record<string, string>;
    expect(out.note).toBe("[removed]");
    expect(out.screenshotUrl).toBe("[private file: link not shared]");
    expect(out.key).toBe("[removed]");
    expect(out.fine).toBe("hello");
  });

  it("leaves public picture links alone", () => {
    const url = "https://x.supabase.co/storage/v1/render/image/public/rich-life-images/a.jpg?width=400";
    expect(scrub({ cover: url })).toEqual({ cover: url });
  });

  it("masks emails, phone numbers and proxies by field name", () => {
    const out = scrub({
      userEmail: "garreth@example.com",
      phoneNumber: "+1 (305) 555-0142",
      proxy: "203.0.113.7:8080:user:pass",
      proxyHost: "isp.example.net",
      title: "Call 305 555 0142",
    }) as Record<string, string>;
    expect(out.userEmail).toBe("g***@example.com");
    expect(out.phoneNumber).toBe("•••0142");
    expect(out.proxy).toBe("203.x.x.x:8080");
    expect(out.proxyHost).toBe("i•••.net");
    expect(out.title).toBe("Call 305 555 0142");
  });

  it("masks an email in a field that is not named email", () => {
    // Found in the first live run: review.by and doneBy hold the person's email.
    expect(scrub({ review: { by: "czed@example.com" }, doneBy: "yurie@example.com", handle: "@kathy_spd" })).toEqual({
      review: { by: "c***@example.com" },
      doneBy: "y***@example.com",
      handle: "@kathy_spd",
    });
  });

  it("does not mask dates inside a list of objects under a phone-ish name", () => {
    const out = scrub({ phones: [{ name: "Phone 3", addedAt: "2026-11-26T15:04:05Z", number: "3055550142" }] }) as {
      phones: Record<string, string>[];
    };
    expect(out.phones[0].addedAt).toBe("2026-11-26T15:04:05Z");
    expect(out.phones[0].number).toBe("•••0142");
  });

  it("masks every number in a list of strings", () => {
    expect(scrub({ phoneNumbers: ["3055550142", "7865550199"] })).toEqual({ phoneNumbers: ["•••0142", "•••0199"] });
  });
});

describe("masks", () => {
  it("handles the proxy shapes the database holds", () => {
    expect(maskProxy("http://u:p@203.0.113.7:3128")).toBe("203.x.x.x:3128");
    expect(maskProxy("203.0.113.7")).toBe("203.x.x.x");
  });
  it("keeps short numbers", () => {
    expect(maskPhone("ext 42")).toBe("ext 42");
  });
  it("masks every address in a string", () => {
    expect(maskEmail("a@b.com, cd@e.org")).toBe("a***@b.com, c***@e.org");
  });
});

describe("paging", () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({ i }));

  it("says how many exist and where the next page starts", () => {
    const p = paginate(rows, 50);
    expect(p.total).toBe(120);
    expect(p.returned).toBe(50);
    expect(decodeCursor(p.nextCursor)).toBe(50);
    const last = paginate(rows, 50, encodeCursor(100));
    expect(last.returned).toBe(20);
    expect(last.nextCursor).toBeNull();
  });

  it("treats a bad cursor as the start", () => {
    expect(decodeCursor("not a cursor")).toBe(0);
  });

  it("picks fields", () => {
    expect(pickFields([{ a: 1, b: 2 }], ["b"])).toEqual([{ b: 2 }]);
  });
});

describe("fitting a reply", () => {
  it("cuts the longest list and says so", () => {
    const big = { data: { rows: Array.from({ length: 2000 }, (_, i) => ({ i, text: "x".repeat(50) })), small: [1, 2] } };
    const { cut, fits } = fitToCap(big, 20_000);
    expect(fits).toBe(true);
    expect(cut?.[0]).toMatchObject({ path: "rows", total: 2000 });
    expect(JSON.stringify(big).length).toBeLessThanOrEqual(20_000);
  });

  it("marks a cut reply as truncated with a note", () => {
    const rows = Array.from({ length: 3000 }, (_, i) => ({ i, text: "y".repeat(40) }));
    const out = parse(reply({ rows }, { tool: "t", view: "v", fetchedAt: "now", stale: false }));
    expect(out.meta.truncated).toBe(true);
    expect(out.meta.cut[0].path).toBe("rows");
    expect(out.meta.note).toMatch(/shortened/);
  });

  it("refuses rather than mangles a reply with nothing to cut", () => {
    const r = reply({ blob: "z".repeat(70_000) }, { tool: "t", view: "v", fetchedAt: "now", stale: false });
    expect(r.isError).toBe(true);
    expect(parse(r).error).toMatch(/too large/);
  });

  it("reports how many fields the scrubber removed", () => {
    const out = parse(reply({ password: "x", ok: 1 }, { tool: "t", view: "v", fetchedAt: "now", stale: false }));
    expect(out.data).toEqual({ ok: 1 });
    expect(out.meta.removed).toBe(1);
  });
});
