import { z } from "zod";
import { sbRestPage } from "@/lib/data/supabase";
import type { Fleet } from "@/lib/fleet";
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  paginate,
  pickFields,
  reply,
  type Meta,
  type ToolText,
} from "@/server/mcp/shape";

/** Inputs most tools share. Every description is what Claude reads to choose. */
export const fleetInput = z
  .enum(["physical", "cloud"])
  .optional()
  .describe("Which fleet to read: physical (real iPhones) or cloud. Defaults to physical.");
export const limitInput = z.number().int().min(1).max(500).optional().describe("Rows per page. Default 50, most 500.");
export const cursorInput = z.string().optional().describe("meta.nextCursor from the previous reply, to get the next page.");
export const fieldsInput = z.array(z.string()).optional().describe("Return only these fields of each row.");
export const detailInput = z
  .enum(["summary", "full"])
  .optional()
  .describe("summary (default) keeps rows short; full returns every field.");

/** The fleet a tool reads when Claude does not say. MCP_DEFAULT_FLEET, else physical. */
export function fleetOf(given: string | undefined): Fleet {
  if (given === "cloud" || given === "physical") return given;
  return process.env.MCP_DEFAULT_FLEET === "cloud" ? "cloud" : "physical";
}

/** `fetchedAt` and `stale` from a page reader's cache stamp, or now. */
export function stamp(c?: { fetchedAt?: string; stale?: boolean } | null): { fetchedAt: string; stale: boolean } {
  return { fetchedAt: c?.fetchedAt ?? new Date().toISOString(), stale: Boolean(c?.stale) };
}

/** Today in New York, as the dashboard counts days. */
export function todayEt(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/** Keep only the named keys. For "summary" rows. */
export function only<T extends object>(row: T, keys: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in row) out[k] = (row as Record<string, unknown>)[k];
  return out as Partial<T>;
}

/** A paged list reply: page, pick fields, and say how much there is. */
export function listReply<T extends object>(
  meta: Omit<Meta, "truncated" | "total" | "returned" | "nextCursor">,
  rows: T[],
  args: { limit?: number; cursor?: string; fields?: string[] },
  extra?: Record<string, unknown>,
): ToolText {
  const page = paginate(rows, args.limit, args.cursor);
  const data = extra ? { ...extra, rows: pickFields(page.rows, args.fields) } : pickFields(page.rows, args.fields);
  return reply(data, { ...meta, total: page.total, returned: page.returned, nextCursor: page.nextCursor });
}

/**
 * A paged read straight from one table or view, for data no page reads yet
 * (the story bank, audience readings). `path` must name its columns: never
 * `select=*`. The database counts the total, so the reply can say it.
 */
export async function tableReply(
  meta: Omit<Meta, "truncated" | "total" | "returned" | "nextCursor" | "fetchedAt" | "stale">,
  path: string,
  args: { limit?: number; cursor?: string; fields?: string[] },
  extra?: Record<string, unknown>,
): Promise<ToolText> {
  if (/select=\*/.test(path)) throw new Error("tableReply needs named columns");
  const limit = clampLimit(args.limit);
  const offset = decodeCursor(args.cursor);
  const { rows, total } = await sbRestPage<Record<string, unknown>>(path, { limit, offset });
  const more = total !== null ? offset + rows.length < total : rows.length === limit;
  const data = pickFields(rows, args.fields);
  return reply(extra ? { ...extra, rows: data } : data, {
    ...meta,
    ...stamp(),
    total: total ?? undefined,
    returned: rows.length,
    nextCursor: more ? encodeCursor(offset + rows.length) : null,
  });
}

/** Match a profile the way people type it: "Profile 20", "20", "@handle" or "handle". */
export function matchesAccount(a: { profile: string | null; username: string | null }, query: string): boolean {
  const q = query.trim().replace(/^@/, "").toLowerCase();
  if (!q) return false;
  const profile = (a.profile ?? "").toLowerCase();
  if (/^\d+$/.test(q)) return profile === `profile ${q}`;
  return profile === q || (a.username ?? "").toLowerCase() === q;
}
