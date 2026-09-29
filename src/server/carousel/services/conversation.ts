/**
 * The two conversations (DEV-25, and the Studio's from D6): the one beside
 * the Writing, which proposes a revised direction and cites accepted rules,
 * and the one beside the Studio's canvas, which changes the template.
 *
 * Neither ever saves. The Writing conversation hands back a proposal for
 * the editor; Save version stays a person's press. The Studio conversation
 * hands back a changed template for the canvas, which undo takes back.
 *
 * What a person types and what the model answers are both untrusted text.
 * The model is told the text boxes by name, and a mention like @hook in the
 * message is a question about that box.
 */
import { dbGetAll } from "@/server/carousel/repo/db";
import { askJson, text, type ChatTurn } from "@/server/carousel/services/llm";
import type { DraftSlide } from "@/server/carousel/services/studio";

export interface Said {
  who: "me" | "ai";
  text: string;
}

interface Box {
  role: string;
  purpose?: string;
  size?: number;
  max_chars?: number;
  writer?: string;
}

/** What the template's slides look like, in words the model can use. */
export function describeTemplate(template: Record<string, unknown> | null): { slides: number; size: string; boxes: Box[]; lines: string } {
  const slides = (template?.slides as { n: number; layout?: string; text?: { role: string; purpose?: string; size?: number }[] }[] | undefined) ?? [];
  const contract = (template?.copy_contract as { role: string; max_chars?: number; writer?: string }[] | undefined) ?? [];
  const canvas = (template?.canvas as { width?: number; height?: number } | undefined) ?? {};
  const byRole = new Map(contract.map((c) => [c.role, c]));
  const boxes: Box[] = [];
  const lines = slides
    .map((s) => {
      const names = (s.text ?? []).map((b) => {
        const c = byRole.get(b.role);
        boxes.push({ role: b.role, purpose: b.purpose, size: b.size, max_chars: c?.max_chars, writer: c?.writer });
        return `@${b.role}${c?.max_chars ? ` (at most ${c.max_chars} characters)` : ""}${c?.writer && c.writer !== "ai" ? `, ${c.writer === "fixed" ? "fixed text" : "typed per batch"}` : ""}${b.purpose ? `: ${b.purpose}` : ""}`;
      });
      return `Slide ${s.n}${s.layout === "quad" ? " (four photos)" : ""}: ${names.join("; ") || "no text"}`;
    })
    .join("\n");
  return { slides: slides.length, size: canvas.width && canvas.height ? `${canvas.width} by ${canvas.height}` : "unknown size", boxes, lines };
}

interface RuleRow {
  rule_key: string;
  category: string | null;
  rule_text: string;
  confidence: number | null;
  support_count: number | null;
}

/** Accepted rules that bear on writing. Timing and posting operations are not the writer's business. */
export async function writingRules(): Promise<RuleRow[]> {
  const rows = await dbGetAll<RuleRow>("content_knowledge_base?select=rule_key,category,rule_text,confidence,support_count&status=eq.active&category=not.in.(timing,network_ops)&order=support_count.desc.nullslast");
  return rows.slice(0, 50);
}

function turns(history: Said[], last: string): ChatTurn[] {
  const past = history.slice(-10).map((m): ChatTurn => ({ role: m.who === "me" ? "user" : "assistant", content: m.text.slice(0, 2000) }));
  return [...past, { role: "user", content: last }];
}

export interface WritingAnswer {
  reply: string;
  proposal: string | null;
  citedRuleKeys: string[];
}

export async function writingConversation(input: {
  typeName: string;
  character: string;
  template: Record<string, unknown> | null;
  active: string | null;
  draft: string;
  history: Said[];
  message: string;
}): Promise<WritingAnswer> {
  const t = describeTemplate(input.template);
  const rules = await writingRules();
  const system = [
    `You help a person shape the writing direction for a photo carousel type called "${input.typeName}", voiced by ${input.character || "its character"}. The direction is the standing brief a copywriter follows for every deck of this type.`,
    `The template has ${t.slides} slides at ${t.size}. Its text boxes, by name:\n${t.lines || "(none yet)"}`,
    `When the person writes @name they mean that text box. Use the same @names back, so your reply and the direction read alike.`,
    `Accepted house rules, each with a key. When a rule shapes your proposal, cite its key. Cite only keys from this list:\n${rules.map((r) => `- ${r.rule_key}: ${r.rule_text}`).join("\n") || "(none)"}`,
    `What you can change: the direction's words. What you cannot change: the number of slides, the text boxes, their limits, the images, the music, or when anything posts. If asked for one of those, say plainly that the direction cannot change it and where it is changed instead (the Studio for slides and boxes, the library for images).`,
    `Ask at most one question, and only when you cannot make a sensible proposal without the answer. Otherwise propose.`,
    `A proposal is the full revised direction, ready to replace the current one, not a fragment and not a list of edits. Keep what the person did not ask to change. Plain text, no markdown, no headings.`,
    `Reply as {"reply": "one to three plain sentences to the person", "proposal": "the full revised direction, or null when you are only asking or declining", "cited_rule_keys": ["..."]}.`,
  ].join("\n\n");
  const current = input.draft.trim() || input.active?.trim() || "";
  const last = [`The direction as it stands in the editor:\n${current || "(nothing written yet)"}`, `The person says: ${input.message.slice(0, 2000)}`].join("\n\n");
  const raw = await askJson(system, turns(input.history, last), { temperature: 0.5, maxTokens: 2500 });
  const known = new Set(rules.map((r) => r.rule_key));
  const cited = Array.isArray(raw.cited_rule_keys) ? (raw.cited_rule_keys as unknown[]).filter((k): k is string => typeof k === "string" && known.has(k)).slice(0, 20) : [];
  const proposal = text(raw.proposal, 20_000);
  const reply = text(raw.reply, 1200) || (proposal ? "Here is a revised direction." : "I could not make a proposal from that.");
  return { reply, proposal: proposal && proposal !== current ? proposal : null, citedRuleKeys: proposal ? cited : [] };
}

/** The offer on an empty Writing tab: one prompt built from the template and its slides. */
export async function firstWritingDraft(input: { typeName: string; character: string; template: Record<string, unknown> | null }): Promise<WritingAnswer> {
  const t = describeTemplate(input.template);
  const rules = await writingRules();
  const system = [
    `You write the first writing direction for a photo carousel type called "${input.typeName}", voiced by ${input.character || "its character"}. The direction is the standing brief a copywriter follows for every deck of this type.`,
    `The template has ${t.slides} slides at ${t.size}. Its text boxes, by name:\n${t.lines || "(none yet)"}`,
    `Say what each text box is for by its @name, how the deck should sound, how long a line may run, and what the caption does. Two to four short paragraphs. Plain text, no markdown, no headings.`,
    `Accepted house rules, each with a key. Follow the ones that apply and cite their keys. Cite only keys from this list:\n${rules.map((r) => `- ${r.rule_key}: ${r.rule_text}`).join("\n") || "(none)"}`,
    `Reply as {"reply": "one plain sentence on what you wrote", "proposal": "the direction", "cited_rule_keys": ["..."]}.`,
  ].join("\n\n");
  const raw = await askJson(system, [{ role: "user", content: "Write a first draft." }], { temperature: 0.7, maxTokens: 2000 });
  const proposal = text(raw.proposal, 20_000);
  if (!proposal) throw new Error("The writer returned no draft");
  const known = new Set(rules.map((r) => r.rule_key));
  const cited = Array.isArray(raw.cited_rule_keys) ? (raw.cited_rule_keys as unknown[]).filter((k): k is string => typeof k === "string" && known.has(k)).slice(0, 20) : [];
  return { reply: text(raw.reply, 600) || "A first draft is in the editor. It is not saved.", proposal, citedRuleKeys: cited };
}

export interface StudioChange {
  reply: string;
  slides: DraftSlide[] | null;
  direction: string | null;
  sample: Record<string, string> | null;
}

/** The Studio's conversation: the model hands back the slides as it would have them, or nothing. */
export async function studioConversation(input: {
  name: string;
  template: Record<string, unknown>;
  copy: Record<string, string>;
  sets: string[];
  history: Said[];
  message: string;
}): Promise<StudioChange> {
  const slides = (input.template.slides as { n: number; layout?: string; images?: { pools?: string[] }; text?: { role: string; purpose?: string; size?: number; anchor?: { kind?: string; at?: number } }[] }[] | undefined) ?? [];
  const now = slides.map((s) => ({
    layout: s.layout === "quad" ? "quad" : "single",
    set: s.images?.pools?.[0] ?? null,
    boxes: (s.text ?? []).map((b) => ({ name: b.role, purpose: b.purpose ?? "", size: b.size ?? 60, at: b.anchor?.kind === "block_centre_y" && typeof b.anchor.at === "number" ? b.anchor.at : 0.5, sample: input.copy[b.role] ?? "" })),
  }));
  const canvas = (input.template.canvas as { width?: number; height?: number } | undefined) ?? {};
  const system = [
    `You help a person design the template for a photo carousel type called "${input.name}". The canvas is ${canvas.width ?? 1080} by ${canvas.height ?? 1350}.`,
    `What you can change: how many slides there are (2 to 20) and their order; each slide's layout ("single" one photo, "quad" four photos); which image set a slide draws from; the text boxes on a slide (1 to 3), their names, what each is for, their font size (28 to 96) and "at", where the box's centre sits from 0 (top) to 1 (bottom); the sample line shown in each box; and the writing direction.`,
    `What you cannot change: fonts, colours, stroke and shadow, the canvas size, the image library itself, or anything about posting. If asked for one of those, say plainly that you cannot, and that font, size, alignment and wrap width are in the panel at the left when a text box is selected.`,
    input.sets.length ? `The image library's sets: ${input.sets.join(", ")}. Use only these names for "set", or null.` : `No image library is chosen, so "set" is always null.`,
    `Text box names are short snake_case and unique across the deck; the first slide's main box is "hook". When the person writes @name they mean that box; use the same @names back. Keep a box's name when you change it, so its settings are kept.`,
    `Ask at most one question, and only when you cannot act without the answer. Otherwise make the change.`,
    `When you change anything, return every slide in order, changed or not, in "slides". When you change nothing, "slides" is null.`,
    `Reply as {"reply": "one to three plain sentences on what you changed, or your question, or why you cannot", "slides": [{"layout": "single", "set": null, "boxes": [{"name": "hook", "purpose": "...", "size": 64, "at": 0.5, "sample": "..."}]}] or null, "direction": "the revised writing direction, or null to leave it"}.`,
  ].join("\n\n");
  const last = [`The slides as they stand:\n${JSON.stringify(now)}`, `The writing direction as it stands:\n${text((input.template.directions as { copy?: unknown } | undefined)?.copy, 4000) || "(none)"}`, `The person says: ${input.message.slice(0, 2000)}`].join("\n\n");
  const raw = await askJson(system, turns(input.history, last), { temperature: 0.4, maxTokens: 3500 });
  const allowed = new Set(input.sets);
  let out: DraftSlide[] | null = null;
  const sample: Record<string, string> = {};
  if (Array.isArray(raw.slides) && raw.slides.length >= 2) {
    const used = new Set<string>();
    out = (raw.slides as Record<string, unknown>[]).slice(0, 20).map((s, i) => {
      const boxes = (Array.isArray(s.boxes) ? (s.boxes as Record<string, unknown>[]) : []).slice(0, 3).map((b, k) => {
        let name = text(b.name, 40).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || (i === 0 && k === 0 ? "hook" : `line_${i + 1}`);
        while (used.has(name)) name = `${name.replace(/_\d+$/, "")}_${i + 1}${k ? `_${k + 1}` : ""}${used.has(`${name.replace(/_\d+$/, "")}_${i + 1}`) ? "b" : ""}`;
        used.add(name);
        const line = text(b.sample, 300);
        if (line) sample[name] = line;
        return { name, purpose: text(b.purpose, 200), size: Math.max(28, Math.min(96, Math.round(Number(b.size) || 60))), at: Math.max(0.05, Math.min(0.95, Number(b.at) || 0.5)) };
      });
      if (!boxes.length) {
        const name = i === 0 ? "hook" : `line_${i + 1}`;
        used.add(name);
        boxes.push({ name, purpose: "", size: 56, at: 0.5 });
      }
      const set = typeof s.set === "string" && allowed.has(s.set) ? s.set : null;
      return { layout: s.layout === "quad" ? ("quad" as const) : ("single" as const), boxes, set };
    });
  }
  const direction = text(raw.direction, 4000) || null;
  const reply = text(raw.reply, 1200) || (out ? "Changed." : "I did not change anything.");
  return { reply, slides: out, direction, sample: out ? sample : null };
}
