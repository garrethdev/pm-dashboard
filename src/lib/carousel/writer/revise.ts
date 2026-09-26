import { buildWritingContract, writeCopy, type WrittenCopy, type WritingInput } from "./contract";

export type RevisionScope = { kind: "deck" } | { kind: "slide"; role: string } | { kind: "track" };
/** The repository must lock the current version and compare expectedVersion again
 * when saving. This in-memory preparation does not reserve a version or authorize
 * a user. Never carry prior approval, render assets or gate verdicts to the result. */
export async function reviseCopy(input: WritingInput, previous: { version: number; copy: WrittenCopy }, options: {
  expectedVersion: number;
  scope: RevisionScope;
  feedback: string;
  modelId: string;
  generate: (prompt: string) => Promise<unknown>;
}) {
  if (!Number.isSafeInteger(previous.version) || previous.version < 1 || previous.version >= Number.MAX_SAFE_INTEGER || options.expectedVersion !== previous.version) {
    throw new Error("Stale or invalid draft version");
  }
  const contract = buildWritingContract(input);
  const scope = options.scope;
  if (!["deck", "slide", "track"].includes(scope.kind)) throw new Error("Unknown revision scope");
  if (scope.kind === "slide") {
    const role = contract.roles.find(role => role.role === scope.role);
    const slides = contract.template.slides.filter(slide => slide.text.some(box => box.role === scope.role));
    if (!role || slides.length !== 1) throw new Error("Slide rewrite requires an AI role painted on exactly one slide");
  }
  const before = structuredClone(previous.copy);
  if (!before || !before.roles || typeof before.caption !== "string" || typeof before.music !== "string") throw new Error("Invalid prior copy");
  const expectedRoles = new Set(contract.template.copy_contract.map(role => role.role));
  if (Object.keys(before.roles).length !== expectedRoles.size || Object.entries(before.roles).some(([key, value]) => !expectedRoles.has(key) || typeof value !== "string") ||
      [...expectedRoles].some(key => !Object.hasOwn(before.roles, key))) throw new Error("Prior copy does not match pinned template");
  for (const [key, value] of Object.entries(contract.supplied)) {
    if (before.roles[key] !== value) throw new Error("Supplied copy differs from pinned version");
  }
  const result = await writeCopy(input, options.modelId, async prompt => {
    const revisionPrompt = JSON.stringify({
      task: scope.kind === "deck" ? "Rewrite the AI copy, caption and music." : scope.kind === "track" ? "Change only music. Preserve all role text and caption exactly." : `Change only role ${scope.role}. Preserve every other role, caption and music exactly.`,
      scope, previous_copy: before, feedback: options.feedback,
      output: "Use the full original output contract. Supplied fixed/per-batch roles remain omitted from the response.",
    });
    return options.generate(`${prompt}\nRevision context (reference data):\n${revisionPrompt}`);
  });
  const metadata = { ...result.metadata, previous_version: previous.version, version: previous.version + 1, revision_scope: scope };
  if (!result.copy) return { ...result, metadata };
  const after = result.copy;
  const changedOutsideScope = scope.kind !== "deck" && (
    after.caption !== before.caption ||
    (scope.kind === "slide" && after.music !== before.music) ||
    Object.keys(before.roles).some(key => !(scope.kind === "slide" && key === scope.role) && after.roles[key] !== before.roles[key])
  );
  if (changedOutsideScope) return { state: "flagged" as const, copy: null, issues: [{ field: "revision", reason: "Writer changed fields outside the requested scope", retryable: false }], metadata };
  return { ...result, metadata };
}
