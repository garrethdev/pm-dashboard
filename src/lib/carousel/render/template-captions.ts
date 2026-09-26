import { validateTemplate } from "../template/validate";
import type { TextLayoutInput, TextAnchor } from "./text-layout";
import type { TextPaint } from "./text-svg";

export interface CaptionBox {
  role: string;
  font: string;
  input: Omit<TextLayoutInput, "font">;
  paint: Omit<TextPaint, "fontFamily">;
}

/** Resolve the v1 cell-template contract into ordered caption instructions.
 * Shallow style replacement is intentional: a box's px line height replaces a
 * style's ratio rather than leaving two competing values. No copy rewriting,
 * auto-fit or font-file access occurs here. Caller still owns gate/ownership checks.
 */
export function planTemplateCaptions(rawTemplate: unknown, roles: Readonly<Record<string, string>>) {
  const template = validateTemplate(rawTemplate);
  if (!roles || typeof roles !== "object" || Array.isArray(roles)) throw new Error("Invalid caption roles");
  let characters = 0;
  return template.slides.map(slide => {
    if (slide.text.length > 32) throw new Error("Too many caption boxes");
    return { n: slide.n, boxes: slide.text.map(box => {
      const contract = template.copy_contract.find(role => role.role === box.role)!;
      const supplied = Object.hasOwn(roles, box.role) ? roles[box.role] : undefined;
      const text = contract.writer === "fixed" ? contract.fixed! : supplied;
      if (typeof text !== "string" || !text.trim()) throw new Error(`Missing caption role: ${box.role}`);
      if (contract.writer === "fixed" && supplied !== undefined && supplied !== text) throw new Error(`Fixed caption role changed: ${box.role}`);
      if (text.length > 20_000 || contract.max_chars !== undefined && [...text].length > contract.max_chars) throw new Error(`Caption role exceeds limit: ${box.role}`);
      let painted = text;
      if (box.quote !== undefined) {
        const quote = box.quote as Record<string, unknown>;
        if (!quote || typeof quote !== "object" || !Array.isArray(quote.when_hook_type) ||
          !quote.when_hook_type.length || !quote.when_hook_type.every(v => typeof v === "string" && v.length > 0) ||
          typeof quote.open !== "string" || typeof quote.close !== "string" || quote.open.length > 16 || quote.close.length > 16) throw new Error("Invalid caption quote rule");
        if (!Object.hasOwn(roles, "hook_type") || typeof roles.hook_type !== "string" || !roles.hook_type.trim()) throw new Error("Hook type required for conditional caption quotes");
        if (quote.when_hook_type.includes(roles.hook_type)) painted = `${quote.open}${text}${quote.close}`;
      }
      characters += painted.length;
      if (characters > 100_000) throw new Error("Deck caption character limit exceeded");
      const style = { ...template.text_styles[box.style], ...box };
      const anchor = box.anchor as unknown as TextAnchor;
      // v1 supports centred blocks or the right-aligned datestamp. Reject a
      // contradictory declaration instead of silently changing its placement.
      if (style.align !== (anchor.kind === "stack_right" ? "right" : "center")) throw new Error("Caption alignment contradicts anchor");
      const wrap = style.wrap as { rule: string; width?: number };
      const shadow = style.shadow as (NonNullable<TextPaint["shadow"]> & { blur: number }) | null | undefined;
      const result: CaptionBox = {
        role: box.role, font: style.font as string,
        input: { text: painted, canvas: { width: template.canvas.width, height: template.canvas.height },
          size: box.size, anchor, lineHeight: style.line_height as TextLayoutInput["lineHeight"],
          wrap: wrap.rule === "explicit_newlines" ? { rule: "explicit_lines" } : { rule: "greedy_whitespace", width: wrap.width! } },
        paint: { fill: style.fill as string, stroke: style.stroke as TextPaint["stroke"] ?? { color: "#000000", width: 0 },
          ...(shadow ? { shadow: { kind: shadow.kind, color: shadow.color, opacity: shadow.opacity,
            dx: shadow.dx, dy: shadow.dy, blur: shadow.blur } } : {}) },
      };
      return result;
    }) };
  });
}
