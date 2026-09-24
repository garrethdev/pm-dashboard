import { projectBatch, type BatchAction, type BatchProgress } from "./status";

export class BatchCommandError extends Error {
  constructor(readonly status: 403 | 409, readonly code: string, message: string) { super(message); }
}

/**
 * Checks a human command against ownership, revision and current batch readiness.
 * actorId/caller must come from trusted server authentication, ownerId from storage;
 * none may be accepted as client assertions. expectedRevision is the client's token.
 * Invoke under the same transaction/row lock as the write, never as a preflight only.
 * This helper provides no lock, authentication, idempotency or persistence itself.
 */
export function authorizeBatchCommand(input: {
  batch: BatchProgress;
  ownerId: string;
  actorId: string;
  expectedRevision: number;
  action: BatchAction;
  caller: "human" | "worker";
}) {
  if (!input.actorId || input.actorId !== input.ownerId) {
    throw new BatchCommandError(403, "BATCH_READ_ONLY", "Only the batch owner may change it");
  }
  // Refuse stale tabs rather than applying an action to state the person has not seen.
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision !== input.batch.revision) {
    throw new BatchCommandError(409, "STALE_BATCH", "The batch changed. Refresh before trying again");
  }
  const projection = projectBatch(input.batch);
  // Worker advancement requires its own fenced lease, checked by the repository.
  // The worker is never allowed to use human commands, including final approval.
  if (input.caller !== "human") {
    throw new BatchCommandError(403, "HUMAN_COMMAND_REQUIRED", "This action requires a person");
  }
  if (!projection.actions.includes(input.action)) {
    throw new BatchCommandError(409, "ACTION_UNAVAILABLE", "The batch is not ready for this action");
  }
  return projection;
}
