/**
 * Tag with AI (DEV-41): a vision pass reads one picture and writes its
 * details, the headings the renderer and the Studio already use. The
 * vocabulary is the live data's (read from `carousel_images` on 2026-10-22):
 * the arc roles, image types and pillars are fixed lists; the rest is plain
 * words. Nothing is read automatically (Garreth, 2026-09-16): a picture is
 * read when a person asks, one at a time or over a library.
 */
import { getLibrary, moveImage, setImageDetails, type ImageRow, type LibraryRef } from "@/server/carousel/repo/libraries";
import type { LibrarySet } from "@/server/carousel/repo/types";
import { text } from "@/server/carousel/services/llm";
import { thumbnail } from "@/server/carousel/services/library-images";

const MODEL = process.env.CAROUSEL_VISION_MODEL || process.env.CAROUSEL_WRITER_MODEL || "anthropic/claude-sonnet-4.6";

export const ARC_ROLES = ["Hook", "Before", "After", "Stack", "Reveal", "Payoff", "Confession"] as const;
export const IMAGE_TYPES = ["Before", "After", "first image"] as const;
export const PILLARS = ["rich_life", "lavish_life", "informational", "transformation_simple_character_2"] as const;

export interface Details {
  content: string;
  emotion: string | null;
  subject: string | null;
  setting: string | null;
  framing: string | null;
  color_palette: string | null;
  image_type: string | null;
  arc_roles: string[];
  pillar: string | null;
  tags: string[];
  quality_score: number | null;
  has_subject: boolean;
}

const pick = <T extends string>(v: unknown, from: readonly T[]): T | null => {
  const s = text(v, 60);
  return (from.find((x) => x.toLowerCase() === s.toLowerCase()) as T | undefined) ?? null;
};

/** Take the model's reply apart into the details, trusting none of it. */
export function readDetails(reply: Record<string, unknown>): Details {
  const list = (v: unknown, max: number): string[] => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => text(x, 40)).filter(Boolean).slice(0, max);
  const score = Number(reply.quality_score);
  return {
    content: text(reply.content, 600),
    emotion: text(reply.emotion, 120) || null,
    subject: text(reply.subject, 300) || null,
    setting: text(reply.setting, 200) || null,
    framing: text(reply.framing, 300) || null,
    color_palette: text(reply.color_palette, 160) || null,
    image_type: pick(reply.image_type, IMAGE_TYPES),
    arc_roles: list(reply.arc_roles, 7).map((r) => pick(r, ARC_ROLES)).filter((r): r is (typeof ARC_ROLES)[number] => r !== null),
    pillar: pick(reply.pillar, PILLARS),
    tags: list(reply.tags, 12).map((t) => t.toLowerCase()),
    quality_score: Number.isFinite(score) ? Math.max(1, Math.min(10, Math.round(score))) : null,
    has_subject: reply.has_subject === true,
  };
}

/** The set the model filed the picture under, if it named one the library has. */
export function readSet(reply: Record<string, unknown>, sets: LibrarySet[]): string | null {
  const name = text(reply.set, 120).toLowerCase();
  if (!name) return null;
  const hit = sets.find((s) => s.name.toLowerCase() === name) ?? sets.find((s) => `${sets.find((p) => p.id === s.parentId)?.name ?? ""}/${s.name}`.toLowerCase() === name);
  return hit?.id ?? null;
}

function system(sets: LibrarySet[]): string {
  const setWords = sets.length ? `\nThe library's sets: ${sets.map((s) => (s.parentId ? `${sets.find((p) => p.id === s.parentId)?.name ?? ""}/${s.name}` : s.name)).join(", ")}. Put the one it belongs in under "set", or null when none fits.` : "";
  return `You read one photograph for a social media carousel library and describe it so a renderer can pick it for a slide. Reply with one JSON object and nothing else, with these keys:
content: what the picture shows, two or three plain sentences.
emotion: the mood in a few words.
subject: the person, in a phrase (or "no person").
setting: where it is.
framing: how it is shot, in a phrase.
color_palette: the main colours.
image_type: one of ${IMAGE_TYPES.join(", ")} (Before is an unglamorous everyday moment; After is the glowing, elevated one; first image is a cover-worthy opener).
arc_roles: a list from ${ARC_ROLES.join(", ")}.
pillar: one of ${PILLARS.join(", ")}.
tags: up to 12 short lowercase words.
quality_score: 1 to 10, as a phone photo for social media.
has_subject: true when a person is the subject.${setWords}`;
}

/** Ask the vision model about one picture. The picture goes as a JPEG no larger than 1,024 px. */
async function ask(bytes: Buffer, sets: LibrarySet[]): Promise<Record<string, unknown>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The reader is not connected: OPENROUTER_API_KEY is not set");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app", "X-Title": "PM Dashboard Carousel Generator" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system(sets) },
        { role: "user", content: [{ type: "text", text: "Read this picture." }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${bytes.toString("base64")}` } }] },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 402) throw new Error("The reader's account is out of credit");
  if (res.status === 429) throw new Error("The reader is busy. Try again in a moment");
  if (!res.ok) throw new Error(`The reader could not be reached (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The reader's reply could not be read");
  try {
    return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error("The reader's reply could not be read");
  }
}

/**
 * Read one picture and write its details. With `intoSets`, the model also
 * names the set it belongs in, and the picture is moved there when the
 * library has a set by that name.
 */
export async function readImage(library: LibraryRef, row: ImageRow, opts: { intoSets: boolean; sets?: LibrarySet[] }): Promise<{ details: Details; setId: string | null }> {
  const sets = opts.intoSets ? (opts.sets ?? (await getLibrary(library.id))?.sets ?? []) : [];
  const reply = await ask(await thumbnail(row, 1024), sets);
  const details = readDetails(reply);
  if (!details.content) throw new Error("The reader said nothing about the picture");
  await setImageDetails(library.id, row.id, { ...details });
  let setId: string | null = null;
  if (opts.intoSets) {
    setId = readSet(reply, sets);
    if (setId && setId !== row.set_id) await moveImage(library, row, setId);
  }
  return { details, setId };
}
