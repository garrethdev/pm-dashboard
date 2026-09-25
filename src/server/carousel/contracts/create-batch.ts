/** Registry typeId is a text key; version/library IDs identify supporting rows. */
export interface CreateBatchInput {
  typeId: string;
  templateVersionId: string;
  writingVersionId: string;
  libraryId: string;
  requested: number;
  auto: boolean;
  note: string;
  perBatchText: Record<string, string>;
}
export class BatchInputError extends Error {
  readonly code = "INVALID_BATCH_INPUT";
  readonly status = 422;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = new Set(["typeId", "templateVersionId", "writingVersionId", "libraryId", "requested", "auto", "note", "perBatchText"]);

/**
 * Validates request shape and bounds without coercing strings into numbers/booleans.
 * This does not establish that any referenced entity exists or is accessible.
 * Persistence must verify ownership, pinned versions, library sets, Writing readiness
 * and that text-box keys belong to the selected template before creating a batch.
 * Text is preserved as authored, not sanitized HTML; consumers must render it safely.
 */
export function parseCreateBatch(input: unknown): CreateBatchInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BatchInputError("Expected a batch object");
  const value = input as Record<string, unknown>;
  // Reject mass-assignment fields such as owner, lifecycle or approval rather than
  // allowing them to flow into a later database insert.
  if (Object.keys(value).some(key => !fields.has(key))) throw new BatchInputError("Unexpected batch field");
  // The shared registry is keyed by content_type, not UUID. Never interpolate
  // this key as a SQL identifier: the repository must bind it as a value.
  if (typeof value.typeId !== "string" || !value.typeId.trim() || value.typeId.length > 200 || /[\u0000-\u001f\u007f]/.test(value.typeId)) {
    throw new BatchInputError("typeId must be a registry key of at most 200 characters");
  }
  for (const key of ["templateVersionId", "writingVersionId", "libraryId"]) {
    if (typeof value[key] !== "string" || !uuid.test(value[key])) throw new BatchInputError(`${key} must be a UUID`);
  }
  if (!Number.isInteger(value.requested) || (value.requested as number) < 1 || (value.requested as number) > 50) {
    throw new BatchInputError("requested must be an integer from 1 to 50");
  }
  if (typeof value.auto !== "boolean") throw new BatchInputError("auto must be a boolean");
  const note = value.note ?? "";
  if (typeof note !== "string" || note.length > 2000) throw new BatchInputError("note must be at most 2000 characters");
  const text = value.perBatchText ?? {};
  if (!text || typeof text !== "object" || Array.isArray(text) || Object.keys(text).length > 100) {
    throw new BatchInputError("Invalid perBatchText");
  }
  // Bound text payloads and reject prototype-related keys before downstream merging.
  const entries = Object.entries(text);
  if (entries.some(([key, v]) => !/^[a-zA-Z0-9_-]{1,100}$/.test(key) ||
      ["__proto__", "constructor", "prototype"].includes(key) || typeof v !== "string" || v.length > 10000)) {
    throw new BatchInputError("Invalid text-box key or value");
  }
  return { typeId: value.typeId as string, templateVersionId: value.templateVersionId as string,
    writingVersionId: value.writingVersionId as string, libraryId: value.libraryId as string,
    requested: value.requested as number, auto: value.auto, note,
    perBatchText: Object.fromEntries(entries) as Record<string, string> };
}
