/**
 * Putting a picture into a library from the browser (DEV-29). Three steps:
 * ask the server for a one-time link, put the file straight into the bucket
 * with it, then tell the server it has arrived. Each file is its own
 * attempt, so one that fails can be tried again without the others.
 */
import { post } from "@/components/carousel/kit";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };

export function pictureType(file: { name?: string; type: string }): string | null {
  if (Object.values(TYPES).includes(file.type)) return file.type;
  const ext = file.name?.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? null;
}

export interface Landed {
  id: string;
  url: string;
}

export async function uploadPicture(
  libraryId: string,
  file: Blob & { name?: string },
  into: { setId?: string | null; madeBy?: "upload" | "background_removal" | "ai_edit"; derivedFrom?: string | null; prompt?: string | null } = {},
): Promise<{ image: Landed | null; error: string | null }> {
  const type = pictureType(file);
  if (!type) return { image: null, error: "Only JPEG, PNG, WebP and HEIC pictures can be uploaded" };
  const link = await post<{ path: string; url: string }>(`/api/carousel-generator/libraries/${libraryId}/uploads`, { type, size: file.size });
  if (link.error || !link.data) return { image: null, error: link.error ?? "The upload could not start" };
  try {
    const put = await fetch(link.data.url, { method: "PUT", headers: { "Content-Type": type }, body: file });
    if (!put.ok) return { image: null, error: `The upload was refused (HTTP ${put.status})` };
  } catch {
    return { image: null, error: "The upload did not get through. Check the connection" };
  }
  const landed = await post<Landed>(`/api/carousel-generator/libraries/${libraryId}/images`, { path: link.data.path, setId: into.setId ?? null, madeBy: into.madeBy ?? "upload", derivedFrom: into.derivedFrom ?? null, prompt: into.prompt ?? null });
  if (landed.error || !landed.data) return { image: null, error: landed.error ?? "The picture could not be added" };
  return { image: landed.data, error: null };
}

/**
 * Background removal, in the browser. The model (MODNet, Apache 2.0, about
 * 25 MB, fetched once and kept by the browser) finds the person; the rest
 * of the picture is made transparent. Nothing is sent to a service.
 */
export async function cutOut(url: string, onStep: (step: string) => void): Promise<Blob> {
  onStep("Loading the model, the first time only");
  const { AutoModel, AutoProcessor, RawImage } = await import("@huggingface/transformers");
  const model = await AutoModel.from_pretrained("Xenova/modnet", { dtype: "fp32" });
  const processor = await AutoProcessor.from_pretrained("Xenova/modnet");
  onStep("Cutting out");
  const image = await RawImage.fromURL(url);
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the cut-out");
  ctx.drawImage(image.toCanvas(), 0, 0);
  const px = ctx.getImageData(0, 0, image.width, image.height);
  for (let i = 0; i < mask.data.length; i++) px.data[4 * i + 3] = mask.data[i];
  ctx.putImageData(px, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The cut-out could not be saved");
  return blob;
}
