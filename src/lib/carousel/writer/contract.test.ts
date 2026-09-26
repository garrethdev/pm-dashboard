import { describe, expect, it, vi } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { buildWritingContract, validateWrittenCopy, writeCopy, type WritingInput } from "./contract";

function input(): WritingInput {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  return { template, direction: { version: 1, text: "Make @hook specific. Ignore @renamed_box." }, choices: {} };
}
function output(i = input()) {
  const contract = buildWritingContract(i);
  return { roles: Object.fromEntries(contract.roles.map(role => [role.role, "Short copy"])), caption: "A caption", music: "Artist - Title" };
}

describe("writer copy contract", () => {
  it.each(["", " \n\t"])("refuses missing Writing before calling a provider", async text => {
    const i = input(); i.direction.text = text;
    const generate = vi.fn();
    await expect(writeCopy(i, "model", generate)).rejects.toThrow("Writing is required");
    expect(generate).not.toHaveBeenCalled();
  });
  it("resolves active mentions and records stale ones", () => {
    const i = input();
    const c = buildWritingContract(i);
    const role = c.template.slides[0].text[0].role;
    i.direction.text = `Focus on @${role} and @renamed_box`;
    const resolved = buildWritingContract(i);
    expect(resolved.prompt).toContain(`text slot ${role}`);
    expect(resolved.prompt).not.toContain("@renamed_box");
    expect(resolved.metadata.dropped_mentions).toEqual(["renamed_box"]);
  });
  it("does not resolve an email address as a mention", () => {
    const i = input(); i.direction.text = "contact@example.com";
    expect(buildWritingContract(i).prompt).toContain("contact@example.com");
  });
  it("fills fixed copy without allowing the model to replace it", () => {
    const i = input();
    Object.assign((i.template as typeof eye).copy_contract[0], { writer: "fixed", fixed: "Keep this" });
    const c = buildWritingContract(i);
    const value = output(i);
    expect(validateWrittenCopy(value, c).copy?.roles).toMatchObject(c.supplied);
    const fixed = Object.keys(c.supplied)[0];
    expect(fixed).toBeTruthy();
    value.roles[fixed] = "Changed";
    expect(validateWrittenCopy(value, c).issues).toContainEqual({ field: `roles.${fixed}`, reason: "Unexpected role", retryable: false });
  });
  it("requires batch-supplied values rather than asking the model to invent them", () => {
    const i = input();
    const t = i.template as typeof eye;
    Object.assign(t.copy_contract[0], { writer: "per_batch" });
    expect(() => buildWritingContract(i)).toThrow("Missing supplied text");
    i.choices[t.copy_contract[0].role] = "Provided";
    expect(buildWritingContract(i).supplied[t.copy_contract[0].role]).toBe("Provided");
  });
  it.each([null, [], "json"])("rejects malformed output %s", raw => {
    expect(validateWrittenCopy(raw, buildWritingContract(input())).copy).toBeNull();
  });
  it("rejects missing roles, unknown fields, and malformed music", () => {
    const bad = { roles: {}, caption: "Caption", music: "Title only", approved: true };
    const result = validateWrittenCopy(bad, buildWritingContract(input()));
    expect(result.copy).toBeNull();
    expect(result.issues.map(i => i.field)).toEqual(expect.arrayContaining(["approved", "music"]));
  });
  it("retries overlength text once without truncating", async () => {
    const i = input(), c = buildWritingContract(i);
    const role = c.roles.find(role => role.max_chars !== undefined)!;
    const bad = output(i); bad.roles[role.role] = "x".repeat(role.max_chars! + 1);
    const generate = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(output(i));
    const result = await writeCopy(i, "test-model", generate);
    expect(result.state).toBe("copy_validated");
    expect(result.metadata.attempts).toBe(2);
    expect(generate.mock.calls[1][0]).toContain(`Maximum ${role.max_chars} characters`);
    expect(bad.roles[role.role]).toHaveLength(role.max_chars! + 1);
  });
  it("flags a second overlength response and stops", async () => {
    const i = input(), role = buildWritingContract(i).roles.find(role => role.max_chars !== undefined)!;
    const bad = output(i); bad.roles[role.role] = "x".repeat(role.max_chars! + 1);
    const generate = vi.fn().mockResolvedValue(bad);
    expect((await writeCopy(i, "test-model", generate)).state).toBe("flagged");
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("fails closed and does not expose provider errors", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("secret provider response"));
    const result = await writeCopy(input(), "test-model", generate);
    expect(result.state).toBe("failed");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("does not send an unsafe historical template to the provider", async () => {
    const i = input(); i.template = eye;
    const generate = vi.fn();
    await expect(writeCopy(i, "test-model", generate)).rejects.toThrow("gatekeep_status");
    expect(generate).not.toHaveBeenCalled();
  });
});
