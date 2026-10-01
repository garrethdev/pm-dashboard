import { fetchCharacterOverrides, resolveCharacterCaps, NO_OVERRIDE } from "@/lib/data/cadence";
import { signCharacterPhotos } from "@/lib/data/character-photos";
import { nextCharacterName } from "@/lib/data/character-rules";
import { getFleetDefaults } from "@/lib/data/scheduler-config";
import { sbRest } from "@/lib/data/supabase";

/**
 * The Characters sheet on the Accounts page (Garreth, 2026-10-01): every
 * character, what it owns and how much its accounts post.
 *
 * Read live, never cached: the sheet is opened to change these, and it has
 * to show the state a save is about to replace.
 *
 * WHO OWNS A CONTENT TYPE is `content_type_registry.character`, one character
 * per type. Only the active ones count, the same as the daily planner.
 */
export interface CharacterSummary {
  name: string;
  notes: string | null;
  /** Where its photo is kept, and an hour-long link to show it. */
  photoPath: string | null;
  photoUrl: string | null;
  /** Active content types this character owns. */
  contentTypes: { contentType: string; displayName: string }[];
  /** Active accounts on it, Cloud and Physical together. */
  accounts: number;
  /** The character's own numbers; null where it follows the fleet default. */
  override: { maxPerDay: number | null; perWeek: number | null };
  /** What the planner uses: its own number where set, the fleet's otherwise. */
  effective: { maxPerDay: number; perWeek: number };
}

export async function getCharacterSummaries(): Promise<{
  characters: CharacterSummary[];
  next: string;
}> {
  const [chars, registry, accounts, overrides, fleet] = await Promise.all([
    sbRest<{ character: string; notes: string | null; is_active: boolean; photo_path: string | null }[]>(
      "characters?select=character,notes,is_active,photo_path&order=character.asc",
    ),
    sbRest<{ content_type: string; display_name: string | null; character: string }[]>(
      "content_type_registry?select=content_type,display_name,character&active=eq.true",
    ),
    sbRest<{ character: string | null }[]>("accounts?select=character&is_active=eq.true"),
    fetchCharacterOverrides(),
    getFleetDefaults(),
  ]);

  const photos = await signCharacterPhotos(
    chars.map((c) => c.photo_path).filter((p): p is string => !!p),
  );

  const accountCount = new Map<string, number>();
  for (const a of accounts) {
    if (a.character) accountCount.set(a.character, (accountCount.get(a.character) ?? 0) + 1);
  }

  const characters = chars
    .filter((c) => c.is_active)
    .map<CharacterSummary>((c) => {
      const own = overrides[c.character] ?? NO_OVERRIDE;
      const caps = resolveCharacterCaps(own, fleet.data);
      return {
        name: c.character,
        notes: c.notes,
        photoPath: c.photo_path,
        photoUrl: c.photo_path ? (photos[c.photo_path] ?? null) : null,
        contentTypes: registry
          .filter((r) => r.character === c.character)
          .map((r) => ({ contentType: r.content_type, displayName: r.display_name ?? r.content_type }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
        accounts: accountCount.get(c.character) ?? 0,
        override: { maxPerDay: own.maxPostsPerDay, perWeek: own.glpWeekCap },
        effective: { maxPerDay: caps.maxPostsPerDay, perWeek: caps.glpWeek },
      };
    })
    // "Character 10" after "Character 9", not after "Character 1".
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return { characters, next: nextCharacterName(chars.map((c) => c.character)) };
}
