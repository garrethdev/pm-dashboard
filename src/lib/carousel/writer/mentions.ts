import type { CarouselTemplate, CopyRole } from "../template/validate";

export interface WritingMention {
  /** UTF-16 offsets match browser selection APIs; end is exclusive. */
  start: number; end: number; text: string; name: string; role: CopyRole | null;
}

/** The UI and prompt builder share the same active painted-role vocabulary.
 * Hidden contract fields are not text boxes and must not appear as suggestions. */
export function paintedWritingRoles(template: CarouselTemplate) {
  const painted = new Set(template.slides.flatMap(slide => slide.text.map(box => box.role)));
  return template.copy_contract.filter(role => painted.has(role.role));
}

/** Plain text is canonical: tokenization neither rewrites it nor emits markup.
 * Uses the existing identifier mention syntax; email addresses are left alone. */
export function writingMentions(text: string, roles: readonly CopyRole[]): WritingMention[] {
  const names = new Map(roles.map(role => [role.role, role]));
  return [...text.matchAll(/(?<![\w@])@([a-zA-Z][a-zA-Z0-9_-]*)/g)].map(match => ({
    start: match.index, end: match.index + match[0].length, text: match[0],
    name: match[1], role: names.get(match[1]) ?? null,
  }));
}

/** UI selection replacement is atomic for existing mentions. A caret inside a
 * pill or a range crossing part of one replaces the whole token, never nests it.
 * Returns plain text and the caret after insertion; focus/DOM handling is UI work. */
export function insertWritingMention(text: string, start: number, end: number, name: string, roles: readonly CopyRole[]) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > text.length) throw new Error("Invalid Writing selection");
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name) || !roles.some(role => role.role === name)) throw new Error("Unknown Writing mention");
  for (const token of writingMentions(text, roles)) {
    if ((start === end && start > token.start && start < token.end) || (start < token.end && end > token.start)) {
      start = Math.min(start, token.start); end = Math.max(end, token.end);
    }
  }
  const inserted = `@${name}`;
  // A separator is necessary only where adjacent identifier characters would
  // otherwise merge with the token or prevent it from being recognized.
  const before = text.slice(0, start), after = text.slice(end);
  const prefix = /[\w@]$/.test(before) ? " " : "";
  const suffix = /^[@a-zA-Z0-9_-]/.test(after) ? " " : "";
  return { text: before + prefix + inserted + suffix + after, caret: before.length + prefix.length + inserted.length + suffix.length };
}

/** Only a matching identifier prefix at a collapsed caret opens suggestions.
 * A UI can pass the dismissed trigger offset after Escape without editing text;
 * reset it on a new typing interaction. Menu placement/focus belongs to the UI. */
export function writingMentionSuggestions(text: string, caret: number, roles: readonly CopyRole[], dismissedStart?: number) {
  if (!Number.isSafeInteger(caret) || caret < 0 || caret > text.length) throw new Error("Invalid Writing caret");
  const match = /(?<![\w@])@([a-zA-Z][a-zA-Z0-9_-]*|)$/.exec(text.slice(0, caret));
  if (!match || match.index === dismissedStart) return null;
  // An interior caret is not a new trigger; replacing a rendered pill uses the
  // separate atomic insertion path instead of opening a nested menu.
  if (writingMentions(text, roles).some(token => caret > token.start && caret < token.end)) return null;
  const candidates = roles.filter(role => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(role.role) && role.role.startsWith(match[1]));
  return candidates.length ? { start: match.index, end: caret, query: match[1], candidates } : null;
}

/** Returns null when normal browser deletion should handle plain prose. Existing
 * active AND stale mentions are atomic. No whitespace normalization is applied. */
export function deleteWritingMention(text: string, start: number, end: number, direction: "backward" | "forward", roles: readonly CopyRole[]) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > text.length ||
      !["backward", "forward"].includes(direction)) throw new Error("Invalid Writing deletion");
  const tokens = writingMentions(text, roles);
  const overlaps = tokens.filter(token => start === end
    ? direction === "backward" ? start > token.start && start <= token.end : start >= token.start && start < token.end
    : start < token.end && end > token.start);
  if (!overlaps.length) return null;
  const from = Math.min(start, ...overlaps.map(token => token.start));
  const to = Math.max(end, ...overlaps.map(token => token.end));
  return { text: text.slice(0, from) + text.slice(to), caret: from };
}
