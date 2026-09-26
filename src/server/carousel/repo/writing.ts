/**
 * The Writing tab's versions: `carousel_lane_directions`. One active version
 * per type, enforced by the database; Save version writes N+1 and makes it
 * active in one pass.
 */
import { dbGet, dbGetAll, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";
import type { WritingVersion } from "@/server/carousel/repo/types";

interface Row {
  id: string;
  content_type: string;
  version: number;
  direction: string;
  cited_rule_keys: string[] | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

const COLS = "id,content_type,version,direction,cited_rule_keys,active,created_by,created_at";

function toVersion(r: Row): WritingVersion {
  return {
    id: r.id,
    typeId: r.content_type,
    version: r.version,
    body: r.direction,
    citedRuleKeys: r.cited_rule_keys ?? [],
    active: r.active,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export async function listActiveWriting(): Promise<WritingVersion[]> {
  return (await dbGetAll<Row>(`carousel_lane_directions?select=${COLS}&active=eq.true`)).map(toVersion);
}

export async function listWriting(typeId: string): Promise<WritingVersion[]> {
  return (await dbGetAll<Row>(`carousel_lane_directions?select=${COLS}&content_type=eq.${enc(typeId)}&order=version.desc`)).map(toVersion);
}

export async function getWritingVersion(id: string): Promise<WritingVersion | null> {
  const rows = await dbGet<Row[]>(`carousel_lane_directions?select=${COLS}&id=eq.${enc(id)}`);
  return rows[0] ? toVersion(rows[0]) : null;
}

export async function saveWriting(typeId: string, body: string, by: string, citedRuleKeys: string[] = []): Promise<WritingVersion> {
  const existing = await listWriting(typeId);
  const next = (existing[0]?.version ?? 0) + 1;
  // Retire the active one first so the partial unique index lets the new one in.
  await dbPatch(`carousel_lane_directions?content_type=eq.${enc(typeId)}&active=eq.true`, { active: false });
  const [row] = await dbInsert<Row>("carousel_lane_directions", {
    content_type: typeId,
    version: next,
    direction: body,
    cited_rule_keys: citedRuleKeys,
    active: true,
    created_by: by,
  });
  return toVersion(row);
}

export async function makeWritingActive(typeId: string, id: string): Promise<void> {
  await dbPatch(`carousel_lane_directions?content_type=eq.${enc(typeId)}&active=eq.true`, { active: false });
  await dbPatch(`carousel_lane_directions?id=eq.${enc(id)}`, { active: true });
}
