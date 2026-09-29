/**
 * The difference between two pieces of plain text, word by word, for showing
 * a proposal against the active Writing (DEV-25). Whitespace travels with
 * the word before it, so the pieces join back into the original texts.
 */
export interface DiffPart {
  kind: "same" | "added" | "removed";
  text: string;
}

const words = (s: string): string[] => s.match(/\S+\s*|\s+/g) ?? [];

export function diffWords(before: string, after: string): DiffPart[] {
  const a = words(before);
  const b = words(after);
  // Longest common subsequence. Writing is a few hundred words, so the
  // table is small; a very long text falls back to "all removed, all added".
  if (a.length * b.length > 4_000_000) return [{ kind: "removed" as const, text: before }, { kind: "added" as const, text: after }].filter((p) => p.text);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] = a[i].trim() === b[j].trim() ? table[(i + 1) * cols + j + 1] + 1 : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].trim() === b[j].trim()) {
      push("same", b[j]);
      i++;
      j++;
    } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) push("removed", a[i++]);
    else push("added", b[j++]);
  }
  while (i < a.length) push("removed", a[i++]);
  while (j < b.length) push("added", b[j++]);
  return out;
}
