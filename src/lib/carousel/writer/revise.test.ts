import { describe, expect, it, vi } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { buildWritingContract } from "./contract";
import { reviseCopy, type RevisionScope } from "./revise";
function setup() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  const input = { template, direction: { version: 1, text: "Clear copy" }, choices: {} };
  const contract = buildWritingContract(input);
  const output = { roles: Object.fromEntries(contract.roles.map(role => [role.role, "Copy"])), caption: "Caption", music: "Artist - Title" };
  const previous = { version: 4, copy: { ...structuredClone(output), roles: { ...output.roles, ...contract.supplied } } };
  const options = { expectedVersion: 4, scope: { kind: "track" } as RevisionScope, feedback: "Different track", modelId: "test/model", generate: vi.fn(async () => structuredClone(output)) };
  return { input, previous, options, output, contract };
}
describe("copy revision isolation", () => {
  it("changes track only and proposes version N+1 without altering the original", async () => {
    const { input, previous, options, output } = setup();
    const snapshot = structuredClone(previous);
    options.generate.mockResolvedValue({ ...output, music: "Another Artist - Another Title" });
    const result = await reviseCopy(input, previous, options);
    expect(result.state).toBe("copy_validated");
    expect(result.metadata).toMatchObject({ previous_version: 4, version: 5 });
    expect(result.copy?.roles).toEqual(previous.copy.roles);
    expect(previous).toEqual(snapshot);
  });
  it("rewrites only one slide role", async () => {
    const { input, previous, options, output, contract } = setup();
    const role = contract.template.slides[0].text[0].role;
    options.scope = { kind: "slide", role };
    options.generate.mockResolvedValue({ ...output, roles: { ...output.roles, [role]: "New hook" } });
    const result = await reviseCopy(input, previous, options);
    expect(result.state).toBe("copy_validated");
    expect(result.copy?.roles[role]).toBe("New hook");
    expect(result.copy?.music).toBe(previous.copy.music);
  });
  it("rejects collateral caption edits rather than saving them", async () => {
    const { input, previous, options, output } = setup();
    options.generate.mockResolvedValue({ ...output, caption: "Unexpected rewrite" });
    const result = await reviseCopy(input, previous, options);
    expect(result.state).toBe("flagged");
    expect(result.copy).toBeNull();
  });
  it("permits a full deck revision", async () => {
    const { input, previous, options, output } = setup(); options.scope = { kind: "deck" };
    options.generate.mockResolvedValue({ ...output, caption: "New caption" });
    expect((await reviseCopy(input, previous, options)).copy?.caption).toBe("New caption");
  });
  it("rejects stale versions before contacting a provider", async () => {
    const { input, previous, options } = setup(); options.expectedVersion = 3;
    await expect(reviseCopy(input, previous, options)).rejects.toThrow("Stale");
    expect(options.generate).not.toHaveBeenCalled();
  });
  it("rejects nonpainted roles before contacting a provider", async () => {
    const { input, previous, options } = setup(); options.scope = { kind: "slide", role: "transition_line" };
    await expect(reviseCopy(input, previous, options)).rejects.toThrow("exactly one slide");
    expect(options.generate).not.toHaveBeenCalled();
  });
  it("rejects prior copy from another template", async () => {
    const { input, previous, options } = setup(); previous.copy.roles.unknown = "Copy";
    await expect(reviseCopy(input, previous, options)).rejects.toThrow("pinned template");
    expect(options.generate).not.toHaveBeenCalled();
  });
});
