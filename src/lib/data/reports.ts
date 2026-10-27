import { displayNameOf } from "@/lib/people";
import { getAccountPosts } from "@/lib/data/account-posts";
import { ACCOUNT_ID_COL } from "@/lib/data/account-id";
import {
  SCREENSHOT_TYPES,
  type IssueCategory,
  type IssueStatus,
  type ReportAccountInput,
  type ReportKind,
} from "@/lib/data/report-rules";
import { signStorageUrls } from "@/lib/data/storage-sign";
import { sbRest, sbRestAll } from "@/lib/data/supabase";
import { handleLabel, perfTable, toPlatform, type Platform } from "@/lib/platform";

/**
 * Reports sent from the floating button: issues and observations (Garreth,
 * 2026-10-09; observations and accounts 2026-10-27).
 *
 * The rows live in the `issues` table, the accounts and posts a report names
 * in `issue_accounts`, and `v_reports` reads the two together. All three and
 * the `issue-screenshots` bucket are private: written and read here with the
 * service key, and a screenshot reaches the browser only as an hour-long
 * signed link.
 */
const BUCKET = "issue-screenshots";

function service() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base) throw new Error("Supabase is not configured");
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/** A save refused because of what was sent, not because Supabase failed. */
export class ReportRefusal extends Error {}

/** An account a report names, as the Reports page shows it. */
export interface ReportAccount {
  profile: string;
  /** "@cleora", a Facebook name, or the Profile when there is no handle. */
  label: string;
  platform: Platform;
  /** The post the report names, when it names one. */
  postId: string | null;
  postUrl: string | null;
  postedAt: string | null;
}

export interface ReportRow {
  id: number;
  kind: ReportKind;
  reportedAt: string;
  /** First name, from the reporter's email. */
  reportedBy: string;
  category: string;
  description: string;
  pagePath: string | null;
  /** An issue's status; null on an observation. */
  status: string | null;
  screenshotUrl: string | null;
  accounts: ReportAccount[];
}

interface DbReport {
  id: number;
  kind: ReportKind;
  reported_at: string;
  reported_by: string;
  category: string;
  description: string;
  screenshot_path: string | null;
  page_path: string | null;
  status: string | null;
  accounts: {
    profile: string;
    username: string | null;
    display_name: string | null;
    platform: string;
    post_id: string | null;
    post_url: string | null;
    posted_at: string | null;
  }[];
}

/** Every report, newest first, with its screenshot link and the accounts it names. */
export async function getReports(): Promise<ReportRow[]> {
  const rows = await sbRestAll<DbReport>(
    "v_reports?select=id,kind,reported_at,reported_by,category,description,screenshot_path,page_path,status,accounts&order=id.desc",
  );
  const paths = rows.map((r) => r.screenshot_path).filter((p): p is string => !!p);
  const links = await signStorageUrls(BUCKET, paths, 3600);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    reportedAt: r.reported_at,
    reportedBy: displayNameOf(r.reported_by) ?? r.reported_by,
    category: r.category,
    description: r.description,
    pagePath: r.page_path,
    status: r.status,
    screenshotUrl: r.screenshot_path ? (links[r.screenshot_path] ?? null) : null,
    accounts: r.accounts.map((a) => {
      const platform = toPlatform(a.platform);
      return {
        profile: a.profile,
        label: handleLabel(platform, a.username, a.display_name) ?? a.profile,
        platform,
        postId: a.post_id,
        postUrl: a.post_url,
        postedAt: a.posted_at,
      };
    }),
  }));
}

// --- What the form offers ---------------------------------------------------

/** An account the form can name. */
export interface ReportAccountOption {
  profile: string;
  label: string;
  platform: Platform;
  character: string | null;
  isActive: boolean;
  /** False when the account has no handle yet, so there are no posts to pick. */
  hasPosts: boolean;
}

/**
 * Every account, active ones first, then by Profile number. Inactive ones are
 * kept: an observation is as likely to be about an account that was banned.
 */
export async function getReportAccountOptions(): Promise<ReportAccountOption[]> {
  const rows = await sbRest<
    {
      geelark_profile: string;
      username: string | null;
      display_name: string | null;
      platform: string | null;
      character: string | null;
      is_active: boolean;
    }[]
  >("accounts?select=geelark_profile,username,display_name,platform,character,is_active");
  const num = (p: string) => Number(p.replace(/\D+/g, ""));
  return rows
    .map((r) => {
      const platform = toPlatform(r.platform);
      return {
        profile: r.geelark_profile,
        label: handleLabel(platform, r.username, r.display_name) ?? r.geelark_profile,
        platform,
        character: r.character,
        isActive: r.is_active,
        hasPosts: !!r.username,
      };
    })
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || num(a.profile) - num(b.profile));
}

/** A post the form can name. */
export interface ReportPostOption {
  postId: string;
  postedAt: string;
  caption: string | null;
  format: string | null;
}

/** How many of an account's newest posts the form offers. */
const POST_OPTIONS_MAX = 60;

/** An account's newest posts, or none when it has no handle or no such Profile. */
export async function getReportPostOptions(profile: string): Promise<ReportPostOption[]> {
  const [account] = await sbRest<{ username: string | null; platform: string | null }[]>(
    `accounts?select=username,platform&geelark_profile=eq.${encodeURIComponent(profile)}`,
  );
  if (!account?.username) return [];
  const { data } = await getAccountPosts(account.username, toPlatform(account.platform));
  return data.slice(0, POST_OPTIONS_MAX).map((p) => ({
    postId: p.postId,
    postedAt: p.postedAt,
    caption: p.caption,
    format: p.format,
  }));
}

// --- Saving -----------------------------------------------------------------

/** One issue_accounts row, copied from the account and its post as they are now. */
interface AccountSnapshot {
  account_id: string;
  geelark_profile: string;
  username: string | null;
  display_name: string | null;
  platform: Platform;
  post_id: string | null;
  post_url: string | null;
  posted_at: string | null;
}

/**
 * Look up the accounts and posts a report names, and copy what the row keeps.
 * Refuses, saving nothing, when an account or a post is not there: a post must
 * belong to the account it is named under.
 */
async function snapshotAccounts(inputs: ReportAccountInput[]): Promise<AccountSnapshot[]> {
  if (inputs.length === 0) return [];
  const list = inputs.map((a) => `"${a.profile}"`).join(",");
  const rows = await sbRest<
    {
      id: string;
      geelark_profile: string;
      username: string | null;
      display_name: string | null;
      platform: string | null;
    }[]
  >(
    `accounts?select=${ACCOUNT_ID_COL},geelark_profile,username,display_name,platform` +
      `&geelark_profile=in.(${encodeURIComponent(list)})`,
  );
  const byProfile = new Map(rows.map((r) => [r.geelark_profile, r]));

  return Promise.all(
    inputs.map(async (input) => {
      const a = byProfile.get(input.profile);
      if (!a) throw new ReportRefusal(`${input.profile} is not an account.`);
      const platform = toPlatform(a.platform);
      const snap: AccountSnapshot = {
        account_id: a.id,
        geelark_profile: a.geelark_profile,
        username: a.username,
        display_name: platform === "facebook" ? a.display_name : null,
        platform,
        post_id: null,
        post_url: null,
        posted_at: null,
      };
      if (input.postId === null) return snap;
      if (!a.username) throw new ReportRefusal(`${input.profile} has no posts to name.`);
      const [post] = await sbRest<{ post_id: string; post_url: string | null; posted_at: string | null }[]>(
        `${perfTable(platform)}?select=post_id,post_url,posted_at` +
          `&account=eq.${encodeURIComponent(a.username)}&post_id=eq.${encodeURIComponent(input.postId)}&limit=1`,
      );
      if (!post) throw new ReportRefusal(`That post is not one of ${input.profile}'s.`);
      return { ...snap, post_id: post.post_id, post_url: post.post_url, posted_at: post.posted_at };
    }),
  );
}

/**
 * Save a report. The accounts are checked first, then the screenshot goes
 * up, then the report, then its accounts. If a later step fails, what the
 * earlier ones wrote is removed again, so nothing is left half-saved.
 */
export async function createReport(input: {
  reportedBy: string;
  kind: ReportKind;
  category: IssueCategory;
  description: string;
  pagePath: string | null;
  screenshot: File | null;
  accounts: ReportAccountInput[];
}): Promise<{ id: number; screenshotPath: string | null }> {
  const { base, headers } = service();
  const accounts = await snapshotAccounts(input.accounts);

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
      console.error(`report screenshot upload rejected (HTTP ${up.status}):`, await up.text().catch(() => ""));
      throw new Error(`The screenshot did not upload (HTTP ${up.status}). Nothing was saved.`);
    }
  }

  const res = await fetch(`${base}/rest/v1/issues?select=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      kind: input.kind,
      reported_by: input.reportedBy,
      category: input.category,
      description: input.description.trim(),
      page_path: input.pagePath,
      screenshot_path: screenshotPath,
      // Said outright: the column defaults to 'open', which the database
      // refuses on an observation.
      status: input.kind === "issue" ? "open" : null,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    console.error(`report insert rejected (HTTP ${res.status}):`, await res.text().catch(() => ""));
    if (screenshotPath) await removeScreenshot(screenshotPath);
    throw new Error(`The report did not save (HTTP ${res.status}). Nothing was saved.`);
  }
  const [row] = (await res.json()) as { id: number }[];

  if (accounts.length > 0) {
    const linked = await fetch(`${base}/rest/v1/issue_accounts`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(accounts.map((a) => ({ ...a, issue_id: row.id }))),
      signal: AbortSignal.timeout(8_000),
    });
    if (!linked.ok) {
      console.error(`report accounts insert rejected (HTTP ${linked.status}):`, await linked.text().catch(() => ""));
      await removeReport(row.id);
      if (screenshotPath) await removeScreenshot(screenshotPath);
      throw new Error(`The accounts did not save (HTTP ${linked.status}). Nothing was saved.`);
    }
  }
  return { id: row.id, screenshotPath };
}

/**
 * Move an issue to Open, In progress or Fixed. Returns the old status, or null
 * if there is no such report. An observation has no status, so it is refused.
 */
export async function setIssueStatus(id: number, status: IssueStatus): Promise<string | null> {
  const { base, headers } = service();
  const current = await fetch(`${base}/rest/v1/issues?select=kind,status&id=eq.${id}`, {
    headers,
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!current.ok) throw new Error(`Couldn't read the report (HTTP ${current.status}). Nothing was changed.`);
  const [row] = (await current.json()) as { kind: ReportKind; status: string | null }[];
  if (!row) return null;
  if (row.kind !== "issue" || row.status === null) {
    throw new ReportRefusal("An observation has no status.");
  }

  const res = await fetch(`${base}/rest/v1/issues?id=eq.${id}&kind=eq.issue`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status, status_changed_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`The status did not save (HTTP ${res.status}). Nothing was changed.`);
  return row.status;
}

async function removeReport(id: number): Promise<void> {
  try {
    const { base, headers } = service();
    const res = await fetch(`${base}/rest/v1/issues?id=eq.${id}`, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error(`could not remove half-saved report ${id} (HTTP ${res.status})`);
  } catch (err) {
    console.error(`could not remove half-saved report ${id}`, err);
  }
}

async function removeScreenshot(path: string): Promise<void> {
  try {
    const { base, headers } = service();
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error(`could not remove orphaned report screenshot ${path} (HTTP ${res.status})`);
  } catch (err) {
    console.error(`could not remove orphaned report screenshot ${path}`, err);
  }
}
