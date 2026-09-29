/**
 * Templates and their versions: `carousel_templates` and
 * `carousel_template_versions`. A template is the Studio's object; its
 * active version is what the writer and painter read.
 */
import { dbGet, dbGetAll, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";
import type { TemplateRecord, TemplateVersionSummary } from "@/server/carousel/repo/types";

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  character: string;
  content_type: string | null;
  library_id: string | null;
  source_reference_id: number | null;
  status: "draft" | "active" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  template_id: string;
  version: number;
  template: Record<string, unknown>;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

const T_COLS = "id,slug,name,character,content_type,library_id,source_reference_id,status,created_by,created_at,updated_at";
const V_COLS = "id,template_id,version,template,active,created_by,created_at";

function assemble(t: TemplateRow, versions: VersionRow[]): TemplateRecord {
  const mine = versions.filter((v) => v.template_id === t.id).sort((a, b) => b.version - a.version);
  const active = mine.find((v) => v.active) ?? mine[0] ?? null;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    character: t.character,
    contentType: t.content_type,
    libraryId: t.library_id,
    status: t.status,
    sourceReferenceId: t.source_reference_id,
    activeVersion: mine.find((v) => v.active)?.version ?? null,
    versions: mine.map<TemplateVersionSummary>((v) => ({ id: v.id, version: v.version, active: v.active, createdAt: v.created_at, createdBy: v.created_by })),
    template: active?.template ?? null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function listTemplateRecords(): Promise<TemplateRecord[]> {
  const [templates, versions] = await Promise.all([
    dbGetAll<TemplateRow>(`carousel_templates?select=${T_COLS}&order=created_at.asc`),
    dbGetAll<VersionRow>(`carousel_template_versions?select=${V_COLS}`),
  ]);
  return templates.map((t) => assemble(t, versions));
}

export async function getTemplateRecord(idOrSlug: string): Promise<TemplateRecord | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const rows = await dbGet<TemplateRow[]>(`carousel_templates?select=${T_COLS}&${isUuid ? "id" : "slug"}=eq.${enc(idOrSlug)}`);
  const t = rows[0];
  if (!t) return null;
  const versions = await dbGetAll<VersionRow>(`carousel_template_versions?select=${V_COLS}&template_id=eq.${enc(t.id)}`);
  return assemble(t, versions);
}

export async function getTemplateVersion(templateId: string, version: number): Promise<Record<string, unknown> | null> {
  const rows = await dbGet<VersionRow[]>(`carousel_template_versions?select=${V_COLS}&template_id=eq.${enc(templateId)}&version=eq.${version}`);
  return rows[0]?.template ?? null;
}

export async function createTemplate(input: {
  slug: string;
  name: string;
  character: string;
  libraryId: string | null;
  template: Record<string, unknown>;
  sourceReferenceId: number | null;
  status: "draft" | "active";
  by: string;
}): Promise<TemplateRecord> {
  const [t] = await dbInsert<TemplateRow>("carousel_templates", {
    slug: input.slug,
    name: input.name,
    character: input.character,
    library_id: input.libraryId,
    source_reference_id: input.sourceReferenceId,
    status: input.status,
    created_by: input.by,
  });
  await dbInsert("carousel_template_versions", {
    template_id: t.id,
    version: 1,
    template: input.template,
    active: input.status === "active",
    created_by: input.by,
  });
  return (await getTemplateRecord(t.id))!;
}

/** Save N+1 and make it active in one pass (DEV-24). */
export async function saveTemplateVersion(templateId: string, template: Record<string, unknown>, by: string, activate = true): Promise<TemplateRecord> {
  const rec = await getTemplateRecord(templateId);
  if (!rec) throw new Error("Template not found");
  const next = (rec.versions[0]?.version ?? 0) + 1;
  if (activate) await dbPatch(`carousel_template_versions?template_id=eq.${enc(templateId)}&active=eq.true`, { active: false });
  await dbInsert("carousel_template_versions", { template_id: templateId, version: next, template, active: activate, created_by: by });
  await dbPatch(`carousel_templates?id=eq.${enc(templateId)}`, { updated_at: new Date().toISOString(), ...(activate ? { status: "active" } : {}) });
  return (await getTemplateRecord(templateId))!;
}

export async function makeTemplateVersionActive(templateId: string, version: number): Promise<void> {
  await dbPatch(`carousel_template_versions?template_id=eq.${enc(templateId)}&active=eq.true`, { active: false });
  await dbPatch(`carousel_template_versions?template_id=eq.${enc(templateId)}&version=eq.${version}`, { active: true });
  await dbPatch(`carousel_templates?id=eq.${enc(templateId)}`, { updated_at: new Date().toISOString(), status: "active" });
}

export async function patchTemplate(templateId: string, patch: { name?: string; character?: string; libraryId?: string | null; status?: "draft" | "active" | "archived" }): Promise<void> {
  await dbPatch(`carousel_templates?id=eq.${enc(templateId)}`, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.character !== undefined ? { character: patch.character } : {}),
    ...(patch.libraryId !== undefined ? { library_id: patch.libraryId } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  });
}

export async function slugTaken(slug: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    dbGet<{ slug: string }[]>(`carousel_templates?select=slug&slug=eq.${enc(slug)}`),
    dbGet<{ content_type: string }[]>(`content_type_registry?select=content_type&content_type=eq.${enc(slug)}`),
  ]);
  return a.length > 0 || b.length > 0;
}
