import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import glow from "../../../../docs/carousel-templates/glowup.v1.json";
import { validateTemplate } from "@/lib/carousel/template/validate";
const mocks = vi.hoisted(() => ({ fetchImage: vi.fn() }));
vi.mock("./fetch-image", () => ({ fetchImageBytes: mocks.fetchImage }));
import { renderSavedDeck } from "./render-saved-deck";
import { uploadCaptionedDeck } from "./upload-deck";

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => vi.clearAllMocks());
it.each(["eye", "glow"])("connects real %s raster rendering to simulated storage and duplicate readback", async lane => {
  const raw = structuredClone(lane === "eye" ? eye : glow);
  // Deliberate test-only migration of the historical imports: approved=false,
  // no guessed gate verdict, and Glow Up's new generation canvas is 1080x1350.
  Reflect.deleteProperty(raw.lane.set_on_materialise, "gatekeep_status");
  if (lane === "glow") {
    const scale = 1350 / raw.canvas.height; raw.canvas.height = 1350;
    for (const slide of raw.slides) for (const cell of slide.cells) { cell.y *= scale; cell.h *= scale; }
  }
  const template = validateTemplate(raw), roles: Record<string, string> = {};
  for (const role of template.copy_contract) roles[role.role] = role.writer === "fixed" ? role.fixed! :
    role.role === "hook_type" ? "Jealous Friend" : role.role === "datestamp" ? "September\n2026" : "A calm morning";
  const url = "https://images.example.com/source.png";
  const source = await sharp({ create: { width: 40, height: 60, channels: 3, background: "#64748b" } }).png().toBuffer();
  mocks.fetchImage.mockResolvedValue(source);
  const rendered = await renderSavedDeck({ template, roles, deckId: "test-deck", libraryId: "test-library",
    allowedOrigins: ["https://images.example.com"],
    manifest: { deck_id: "test-deck", library_id: "test-library", template: { slug: template.slug, version: template.version },
      slides: template.slides.map(slide => ({ n: slide.n, cells: slide.cells.map((_, cell) => ({ cell, image_id: "source", public_url: url })) })) } });
  expect(mocks.fetchImage).toHaveBeenCalledTimes(1);
  const objects = new Map<string, Uint8Array>();
  const transport = vi.fn<typeof fetch>(async (request, options) => {
    const path = new URL(String(request)).pathname;
    expect(options?.redirect).toBe("error");
    if (options?.method === "POST") {
      expect(options.headers).toMatchObject({ "x-upsert": "false" });
      if (objects.has(path)) return new Response(null, { status: 400 });
      objects.set(path, Uint8Array.from(options.body as Uint8Array));
      return new Response("stored");
    }
    return objects.has(path) ? new Response(Uint8Array.from(objects.get(path)!)) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", transport);
  const output = template.output as { bucket: string };
  const upload = { template, rendered, prefix: "scratch/test-run", identifiers: { carousel_id: "CE-test", deck_key: "glow-test" } };
  const config = { origin: "https://project.supabase.co", serviceKey: "test-only-secret", allowedBuckets: [output.bucket] };
  const first = await uploadCaptionedDeck(upload, config);
  expect(first.state).toBe("storage_verified"); expect(first.databasePersisted).toBe(false); expect(first.approved).toBe(false);
  expect(first.verified).toHaveLength(template.slides.length);
  for (const receipt of first.verified) {
    const stored = objects.get(`/storage/v1/object/${receipt.bucket}/${receipt.path}`)!;
    expect(createHash("sha256").update(stored).digest("hex")).toBe(receipt.sha256);
    expect(await sharp(stored).metadata()).toMatchObject({ width: template.canvas.width, height: template.canvas.height, format: receipt.format });
    expect(receipt.path).toContain(lane === "eye" ? `slide_${String(receipt.n).padStart(2, "0")}.jpg` : `slide${receipt.n}.png`);
  }
  const again = await uploadCaptionedDeck(upload, config);
  expect(again.state).toBe("storage_verified"); expect(again.verified.every(receipt => receipt.reused)).toBe(true);
  expect(objects.size).toBe(template.slides.length);
  expect(transport).toHaveBeenCalledTimes(template.slides.length * 4);
  if (process.env.CAROUSEL_DECK_QA_DIR) await writeFile(join(process.env.CAROUSEL_DECK_QA_DIR, `${lane}-slide1.${lane === "eye" ? "jpg" : "png"}`), rendered.slides[0].bytes);
}, 20_000);
