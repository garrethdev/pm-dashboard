import { evaluateCopy, type GateAdapters } from "../gate/evaluate";
import { buildWritingContract, writeCopy, type WritingInput } from "./contract";

/** One written version through copy checks. The caller supplies a NEW draft-version
 * identity and persists this result atomically. Music and render checks are still
 * required; this function cannot approve a deck or write a lane row. */
export async function writeAndCheck(input: WritingInput, options: {
  contentId: string;
  contentType: string;
  hookRole: string;
  modelId: string;
  generate: (prompt: string) => Promise<unknown>;
  gates: GateAdapters;
  timeoutMs?: number;
}) {
  const contract = buildWritingContract(input);
  if (!options.contentId.trim() || !options.contentType.trim()) throw new Error("Draft identity and type are required");
  if (!contract.template.slides[0].text.some(box => box.role === options.hookRole)) {
    throw new Error("Hook role must be on the opening slide");
  }
  const writing = await writeCopy(input, options.modelId, options.generate);
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
