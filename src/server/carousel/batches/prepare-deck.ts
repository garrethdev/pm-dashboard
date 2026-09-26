import { readPinnedTemplate } from "../templates/read-version";
import { readPinnedWriting } from "../writer/read-writing";
import { readImageLibrary } from "../images/library";
import { pickImages, type PickingTemplate } from "@/lib/carousel/picking/pick";
import { buildWritingContract, type WritingInput } from "@/lib/carousel/writer/contract";

export interface PinnedDeckInput {
  deckId: string;
  contentType: string;
  templateId: string;
  templateVersion: number;
  writingVersionId: string;
  libraryId: string;
  note: string;
  perBatchText: Record<string, string>;
}

/** Internal preparation from an authorized, already-pinned batch snapshot.
 * Not an API authorization boundary: the caller must check ownership/revision.
 * No model call, write, approval or render occurs here. Persist the proposal
 * atomically before painting, and use that saved manifest on render retries.
 */
export async function prepareDeck(input: PinnedDeckInput) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![input.deckId, input.templateId, input.writingVersionId, input.libraryId].every(id => typeof id === "string" && uuid.test(id)) ||
      !Number.isSafeInteger(input.templateVersion) || input.templateVersion < 1 ||
      typeof input.contentType !== "string" || !input.contentType.trim() || input.contentType.length > 200 ||
      typeof input.note !== "string" || input.note.length > 2000 ||
      !input.perBatchText || typeof input.perBatchText !== "object" || Array.isArray(input.perBatchText)) throw new Error("Invalid pinned deck input");
  // Snapshot caller-owned text before the first await so a concurrent edit cannot
  // produce a prompt assembled from two different revisions.
  const snapshot = { ...input, perBatchText: { ...input.perBatchText } };
  const pinned = await readPinnedTemplate(snapshot.templateId, snapshot.templateVersion);
  if (pinned.template.content_type !== snapshot.contentType) throw new Error("Template does not belong to the batch content type");
  const allowed = new Set(pinned.template.copy_contract.filter(role => role.writer === "per_batch").map(role => role.role));
  if (Object.keys(snapshot.perBatchText).some(key => !allowed.has(key))) throw new Error("Unexpected per-batch text role");
  const writing = await readPinnedWriting(snapshot.writingVersionId, snapshot.contentType);
  const writingInput: WritingInput = { template: pinned.template, direction: writing.direction,
    note: snapshot.note, choices: snapshot.perBatchText };
  const contract = buildWritingContract(writingInput);
  // Validation above establishes image_rules and slide image configuration.
  const picking: PickingTemplate = { slug: contract.template.slug, version: contract.template.version,
    image_rules: contract.template.image_rules as Record<string, unknown>, slides: contract.template.slides };
  const libraryId = snapshot.libraryId.toLowerCase();
  const manifest = pickImages(picking, await readImageLibrary(libraryId), libraryId, snapshot.deckId.toLowerCase());
  return { state: "prepared" as const, persisted: false as const,
    templateVersionId: pinned.versionId, writingVersionId: writing.writingVersionId,
    writingInput, contract, manifest };
}
