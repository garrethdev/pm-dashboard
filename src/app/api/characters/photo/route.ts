import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { uploadCharacterPhoto } from "@/lib/data/character-photos";
import { photoRefusal } from "@/lib/data/character-rules";
import { sbRest } from "@/lib/data/supabase";
import { actingUserEmail, auditLog } from "@/lib/data/writes";

/**
 * POST /api/characters/photo — a character's profile photo, from the
 * Characters sheet (Garreth, 2026-10-01).
 *
 * multipart/form-data with `character` and one `file`, already shrunk to a
 * 256px square by the browser. It goes to the private character-photos bucket
 * with the service key; the browser only ever sees hour-long signed links.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid upload" }, { status: 400 });
  }
  const character = form.get("character");
  const file = form.get("file");
  if (typeof character !== "string" || character.trim() === "") {
    return NextResponse.json({ error: "Which character?" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  const refusal = photoRefusal(file);
  if (refusal) return NextResponse.json({ error: refusal }, { status: 400 });

  try {
    const rows = await sbRest<{ character: string; photo_path: string | null }[]>(
      `characters?select=character,photo_path&character=eq.${encodeURIComponent(character.trim())}&limit=1`,
    );
    const current = rows[0];
    if (!current) {
      return NextResponse.json({ error: `There is no character called "${character}".` }, { status: 404 });
    }

    const userEmail = await actingUserEmail();
    const path = await uploadCharacterPhoto(current.character, current.photo_path, file);
    await auditLog({
      userEmail,
      action: "character_photo_upload",
      target: current.character,
      oldValue: { photo_path: current.photo_path },
      newValue: { photo_path: path, bytes: file.size },
    });
    return NextResponse.json({ ok: true, path });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The photo did not upload" },
      { status: 502 },
    );
  }
}
