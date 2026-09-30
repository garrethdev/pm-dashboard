/**
 * Batch naming: `<type>-<UTC day>-<letter>`, the letter counting the batches
 * made for that type that day (a, b, ... z, aa). The day comes from the batch
 * creation transaction, never from the client.
 */
export function batchLetter(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error("Invalid batch sequence");
  let value = index + 1, result = "";
  while (value > 0) {
    value--;
    result = String.fromCharCode(97 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

export function batchName(contentType: string, date: string, index: number): string {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(contentType)) throw new Error("Invalid batch name prefix");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("Invalid batch date");
  return `${contentType}-${date}-${batchLetter(index)}`;
}
