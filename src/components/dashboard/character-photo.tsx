"use client";

import { PHOTO_SIDE } from "@/lib/data/character-rules";
import { cn } from "@/lib/utils";

/**
 * A character's profile photo (Garreth, 2026-10-01): the round thumbnail on
 * the Characters sheet, and the shrinking done before one is uploaded.
 */

/** The round picture, or the character's number where there is no photo. */
export function CharacterAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  const number = /(\d+)$/.exec(name)?.[1] ?? name.slice(0, 1);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-raised text-sm font-medium text-text-muted",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a signed link that expires; nothing to optimise
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{number}</span>
      )}
    </span>
  );
}

/**
 * Crop the middle square out of a picture and shrink it to 256px, as a JPEG.
 *
 * Done here, before upload, so a 12 MB iPhone photo goes up as ~30 KB: it
 * stays far under what the server will take, and the sheet loads quickly on a
 * phone. Drawn through an <img> so the phone's own decoder handles whatever
 * the camera produced, and the picture's rotation is applied as it is drawn.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file is not a picture this browser can open."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIDE;
    canvas.height = PHOTO_SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare the photo.");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      PHOTO_SIDE,
      PHOTO_SIDE,
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("This browser cannot prepare the photo.");
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Send a shrunk photo for one character. */
export async function uploadPhoto(character: string, file: File): Promise<Response> {
  const form = new FormData();
  form.set("character", character);
  form.set("file", file);
  return fetch("/api/characters/photo", { method: "POST", body: form });
}
