import { evaluateCopy, type GateAdapters } from "../gate/evaluate";
import { buildWritingContract, writeCopy, type WritingInput, type WrittenCopy } from "./contract";
import { reviseCopy, type RevisionScope } from "./revise";

/** One written version through copy checks. The caller supplies a NEW draft-version
 * identity and persists this result atomically. Music and render checks are still
 * required; this function cannot approve a deck or write a lane row. */
export interface WriteCheckOptions {
  contentId: string;
  contentType: string;
  hookRole: string;
  modelId: string;
  generate: (prompt: string) => Promise<unknown>;
  gates: GateAdapters;
  timeoutMs?: number;
}

function prepare(input: WritingInput, options: WriteCheckOptions) {
  const contract = buildWritingContract(input);
  if (!options.contentId.trim() || !options.contentType.trim()) throw new Error("Draft identity and type are required");
  if (!contract.template.slides[0].text.some(box => box.role === options.hookRole)) {
    throw new Error("Hook role must be on the opening slide");
  }
  if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 60_000)) throw new Error("Invalid gate timeout");
  return contract;
}

async function checkWriting<T extends Awaited<ReturnType<typeof writeCopy>>>(contract: ReturnType<typeof buildWritingContract>, writing: T, options: WriteCheckOptions) {
  if (writing.state !== "copy_validated" || !writing.copy) return { state: writing.state, writing, gate: null };
  const copy = writing.copy;
  // Only painted roles are sent as on-screen text, in slide/box order. Never
  // include hidden legacy fields such as an unpainted transition line.
  const onScreenText = contract.template.slides.map(slide =>
    slide.text.map(box => copy.roles[box.role]).filter(Boolean).join("\n")
  ).filter(Boolean).join("\n\n");
  const gate = await evaluateCopy({
    content_id: options.contentId, type: options.contentType,
    text_hook: copy.roles[options.hookRole], caption: copy.caption,
    on_screen_text: onScreenText,
  }, options.gates, options.timeoutMs);
  return { state: gate.state === "flagged" ? "flagged" as const : "awaiting_music" as const, writing, gate };
}

export async function writeAndCheck(input: WritingInput, options: WriteCheckOptions) {
  input = structuredClone(input);
  options = { ...options, gates: { ...options.gates } };
  const contract = prepare(input, options);
  return checkWriting(contract, await writeCopy(input, options.modelId, options.generate), options);
}

/** Revisions deliberately use exactly the same checker as initial generation.
 * Even track-only revisions get a fresh verdict for their new content identity.
 * The repository still owns authorization, version locking and atomic saves. */
export async function reviseAndCheck(input: WritingInput,
  previous: { contentId: string; version: number; copy: WrittenCopy },
  options: WriteCheckOptions & { expectedVersion: number; scope: RevisionScope; feedback: string },
) {
  input = structuredClone(input);
  previous = structuredClone(previous);
  options = { ...options, gates: { ...options.gates }, scope: structuredClone(options.scope) };
  const contract = prepare(input, options);
  if (!previous.contentId.trim() || previous.contentId === options.contentId) throw new Error("Revision requires a new draft identity");
  const writing = await reviseCopy(input, previous, options);
  return checkWriting(contract, writing, options);
}
