import { displayNameOf } from "@/lib/people";
import { SCREENSHOT_TYPES, type IssueCategory, type IssueStatus } from "@/lib/data/issue-rules";
import { signStorageUrls } from "@/lib/data/storage-sign";
import { sbRestAll } from "@/lib/data/supabase";

/**
 * Issues reported from the floating button (Garreth, 2026-10-09).
 *
 * The table and the `issue-screenshots` bucket are both private: written and
 * read here with the service key, and a screenshot reaches the browser only as
 * an hour-long signed link.
 */
const BUCKET = "issue-screenshots";

function service() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base) throw new Error("Supabase is not configured");
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

export interface IssueRow {
  id: number;
  reportedAt: string;
  /** First name, from the reporter's email. */
  reportedBy: string;
  category: string;
  description: string;
  pagePath: string | null;
  status: string;
  screenshotUrl: string | null;
}

interface DbIssue {
  id: number;
  reported_at: string;
  reported_by: string;
  category: string;
  description: string;
  screenshot_path: string | null;
  page_path: string | null;
  status: string;
}

/** Every issue, newest first, with its screenshot link. */
export async function getIssues(): Promise<IssueRow[]> {
  const rows = await sbRestAll<DbIssue>(
    "issues?select=id,reported_at,reported_by,category,description,screenshot_path,page_path,status&order=id.desc",
  );
  const paths = rows.map((r) => r.screenshot_path).filter((p): p is string => !!p);
  const links = await signStorageUrls(BUCKET, paths, 3600);
  return rows.map((r) => ({
    id: r.id,
    reportedAt: r.reported_at,
    reportedBy: displayNameOf(r.reported_by) ?? r.reported_by,
    category: r.category,
    description: r.description,
    pagePath: r.page_path,
    status: r.status,
    screenshotUrl: r.screenshot_path ? (links[r.screenshot_path] ?? null) : null,
  }));
}

/**
 * Save a report. The screenshot goes up first; if the row then fails to save,
 * the file is removed again so nothing is left that no issue points at.
 */
export async function createIssue(input: {
  reportedBy: string;
  category: IssueCategory;
  description: string;
  pagePath: string | null;
  screenshot: File | null;
}): Promise<{ id: number; screenshotPath: string | null }> {
  const { base, headers } = service();

  let screenshotPath: string | null = null;
  if (input.screenshot) {
    const month = new Date().toISOString().slice(0, 7);
    screenshotPath = `${month}/${crypto.randomUUID()}.${SCREENSHOT_TYPES[input.screenshot.type]}`;
    const up = await fetch(`${base}/storage/v1/object/${BUCKET}/${screenshotPath}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": input.screenshot.type },
      body: await input.screenshot.arrayBuffer(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!up.ok) {
      console.error(`issue screenshot upload rejected (HTTP ${up.status}):`, await up.text().catch(() => ""));
      throw new Error(`The screenshot did not upload (HTTP ${up.status}). Nothing was saved.`);
    }
  }

  const res = await fetch(`${base}/rest/v1/issues?select=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      reported_by: input.reportedBy,
      category: input.category,
      description: input.description.trim(),
      page_path: input.pagePath,
      screenshot_path: screenshotPath,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    console.error(`issue insert rejected (HTTP ${res.status}):`, await res.text().catch(() => ""));
    if (screenshotPath) await removeScreenshot(screenshotPath);
    throw new Error(`The issue did not save (HTTP ${res.status}). Nothing was saved.`);
  }
  const [row] = (await res.json()) as { id: number }[];
  return { id: row.id, screenshotPath };
}

/** Move an issue to Open, In progress or Fixed. Returns the old status, or null if there is no such issue. */
export async function setIssueStatus(id: number, status: IssueStatus): Promise<string | null> {
  const { base, headers } = service();
  const current = await fetch(`${base}/rest/v1/issues?select=status&id=eq.${id}`, {
    headers,
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!current.ok) throw new Error(`Couldn't read the issue (HTTP ${current.status}). Nothing was changed.`);
  const [row] = (await current.json()) as { status: string }[];
  if (!row) return null;

  const res = await fetch(`${base}/rest/v1/issues?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status, status_changed_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`The status did not save (HTTP ${res.status}). Nothing was changed.`);
  return row.status;
}

async function removeScreenshot(path: string): Promise<void> {
  try {
    const { base, headers } = service();
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error(`could not remove orphaned issue screenshot ${path} (HTTP ${res.status})`);
  } catch (err) {
    console.error(`could not remove orphaned issue screenshot ${path}`, err);
  }
}
