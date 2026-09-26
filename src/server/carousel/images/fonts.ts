import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { validateTemplate } from "@/lib/carousel/template/validate";

const catalog = {
  "Inter-Bold.ttf": { path: "inter/Inter-Bold.ttf", family: "Inter", sha256: "288316099b1e0a47a4716d159098005eef7c0066921f34e3200393dbdb01947f" },
  "LiberationSans-Bold.ttf": { path: "liberation/LiberationSans-Bold.ttf", family: "Liberation Sans", sha256: "788abee4c806d660e8aee46689dd8540cd4bb98da03dcc9d171ce3efd99a9173" },
} as const;

/** Only bundled static assets may be read. A template filename is a catalog key,
 * never a filesystem path or URL. Hash mismatches fail closed rather than change
 * line wrapping silently. Return fresh bytes so callers cannot mutate a cache. */
export async function loadBundledCaptionFont(file: string): Promise<Uint8Array> {
  if (!Object.hasOwn(catalog, file)) throw new Error("Caption font is not bundled");
  const entry = catalog[file as keyof typeof catalog];
  let bytes: Buffer;
  try { bytes = await readFile(join(process.cwd(), "assets/carousel-fonts", entry.path)); }
  catch { throw new Error("Bundled caption font is unavailable"); }
  if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error("Bundled caption font checksum mismatch");
  return Uint8Array.from(bytes);
}

/** Resolves only fonts actually painted by text boxes. Emoji is not treated as
 * a substitute text font; the caption painter still rejects emoji until its
 * bitmap-run path exists. Family/weight must match the bundled static face. */
export async function loadTemplateCaptionFonts(raw: unknown) {
  const template = validateTemplate(raw);
  const definitions = template.fonts as Record<string, { file: string; family: string; weight?: number }>;
  const keys = new Set(template.slides.flatMap(slide => slide.text.map(box =>
    String(box.font ?? template.text_styles[box.style].font))));
  const result = new Map<string, Uint8Array>();
  for (const key of keys) {
    const definition = definitions[key];
    if (!Object.hasOwn(catalog, definition.file)) throw new Error("Caption font is not bundled");
    const entry = catalog[definition.file as keyof typeof catalog];
    if (definition.family !== entry.family || definition.weight !== 700) throw new Error("Caption font face does not match bundled font");
    result.set(key, await loadBundledCaptionFont(definition.file));
  }
  return result;
}
