import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, CADENCE_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { parseCharacterEdit, parseNewCharacter } from "@/lib/data/character-rules";
import { getCharacterSummaries } from "@/lib/data/characters";
import { upstreamMessage } from "@/lib/data/upstream-error";
import {
  actingUserEmail,
  auditLog,
  saveCharacterOverride,
  setCharacterNotes,
  setupCharacter,
} from "@/lib/data/writes";

/** What a character change makes stale: the character lists on Add account
 *  and Edit account (the content-type options), the planner's caps and the
 *  cadence editor. */
const CHARACTER_TAGS = [
  ACCOUNTS_TAG,
  CADENCE_TAG,
  "scheduler-content-types",
  "scheduler-config",
  "scheduler-effective-config",
];

/**
 * GET /api/characters — the Characters sheet (Garreth, 2026-10-01): every
 * character with what it owns, how many accounts it has and how much they
 * post, and the name the next one will get. Read live each time it opens.
 */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    return NextResponse.json(await getCharacterSummaries());
  } catch (err) {
    return NextResponse.json({ error: upstreamMessage(err, "Supabase") }, { status: 502 });
  }
}

/**
 * PATCH /api/characters — Edit on the Characters sheet: the description, and
 * the posting amounts of a character that owns no content types yet.
 *
 * A character that owns content types keeps its amounts in Adjust cadence,
 * where its content types' numbers have to add up to its weekly number. A
 * weekly number changed here without them would break that sum, and one
 * character out of balance stops Adjust cadence saving for every character.
 *
 * Empty amounts mean none, as on Setup character: a daily cap of 0. Filler is
 * written as 0 for the same reason Setup writes it: the planner has no filler
 * pool for a new character.
 */
export async function PATCH(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = parseCharacterEdit(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { character, notes, amounts } = parsed.fields;

  try {
    const { characters } = await getCharacterSummaries();
    const current = characters.find((c) => c.name === character);
    if (!current) {
      return NextResponse.json({ error: `There is no character called "${character}".` }, { status: 404 });
    }
    if (amounts && current.contentTypes.length > 0) {
      return NextResponse.json(
        { error: `${character}'s posting amounts are set in Adjust cadence, with its content types.` },
        { status: 409 },
      );
    }

    const userEmail = await actingUserEmail();
    if (notes !== undefined && notes !== current.notes) await setCharacterNotes(character, notes);
    if (amounts) {
      await saveCharacterOverride(
        character,
        { maxPostsPerDay: amounts.maxPerDay ?? 0, glpWeekCap: amounts.perWeek ?? 0, fillerWeekCap: 0 },
        userEmail,
      );
    }
    await auditLog({
      userEmail,
      action: "character_edit",
      target: character,
      oldValue: { notes: current.notes, ...current.override },
      newValue: {
        ...(notes !== undefined ? { notes } : {}),
        ...(amounts ? { maxPerDay: amounts.maxPerDay ?? 0, perWeek: amounts.perWeek ?? 0 } : {}),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Saving the character failed" },
      { status: 502 },
    );
  }

  for (const tag of CHARACTER_TAGS) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ ok: true });
}

/**
 * POST /api/characters — Setup character, beside Add account on the Physical
 * Accounts page (Garreth, 2026-10-01).
 *
 * The name, a description, and optionally how much its accounts post. No
 * content types: a new character starts with none and is given its own when
 * they are built, so until then its accounts get no posts. The database
 * function refuses a name that already exists, so two people setting up
 * "Character 6" at once cannot both win.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = parseNewCharacter(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await setupCharacter(parsed.fields, await actingUserEmail());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setting up the character failed" },
      { status: 502 },
    );
  }

  for (const tag of CHARACTER_TAGS) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ ok: true, character: parsed.fields.character });
}
