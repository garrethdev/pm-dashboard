import { TTL, cachedFetcher, forensicsTag } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";

/**
 * Post-ban forensics reports.
 *
 * Written by the [Layer 4] Ban Forensics n8n workflow (o4ouO99uNxpthdRX). That
 * workflow gathers every Supabase + GeeLark signal for a profile, has Claude
 * read them, and used to do two things with the result: email it, and distil
 * generalised rules into ban_knowledge_base. The per-account findings survived
 * in neither. ban_forensics_reports now persists them so a ban in the incident
 * feed has something to open.
 *
 * Read-only. The dashboard never writes a report; it renders what the
 * investigation produced.
 */

export interface ForensicsReport {
  id: number;
  geelarkProfile: string;
  username: string | null;
  investigatedAt: string;
  executionId: string | null;
  /** Claude's verdict for this profile. */
  likelyCause: string | null;
  evidence: string | null;
  confidence: string | null;
  /** Run-level narrative — one investigation can span several profiles. */
  overview: string | null;
  commonalities: string | null;
  recommendations: string[];
  /** Computed signal block: posting compliance, caption matches, timelines. */
  findings: ForensicsFindings | null;
  sourceErrors: string[];
  /** True when the profile had no rows anywhere — itself a finding. */
  noRecords: boolean;
}

/**
 * The parts of the findings blob the report page renders.
 *
 * These names come from `report.per_profile` in the workflow's Forensic
 * Analysis node — NOT from its `llm_payload`, which restructures and renames
 * the same data before handing it to Claude. The two are easy to confuse:
 * llm_payload has `total_posts`, this has `total_posted`; llm_payload flattens
 * the health timeline to the top level, this nests it under `health`.
 */
export interface ForensicsFindings {
  profile?: string;
  note?: string;
  no_record_found?: boolean;
  text_items_scanned?: number;
  geelark_task_count?: number;
  account?: {
    username?: string;
    platform?: string;
    character?: string;
    health_status?: string;
    health_detail?: string;
    age_days?: number | null;
    warmup_source?: string;
    created_on?: string;
    provision_status?: string;
    is_active?: boolean;
  };
  posting?: {
    total_posted?: number;
    total_rows?: number;
    /** A boolean, not a count — did the account post before warm-up day 9. */
    posted_before_day_9?: boolean;
    max_posts_per_day?: number;
    active_posting_days?: number;
    first_post_account_age_days?: number;
    first_post_date?: string;
    last_post_date?: string;
    rule_violation_count?: number;
    rule_violations?: {
      date?: string;
      rule?: string;
      detail?: string;
      account_age_days?: number;
    }[];
  };
  caption_ban_trigger_matches?: {
    rule_key?: string;
    severity?: string;
    category?: string;
    matches?: number;
    pct_of_items?: number;
    of_text_items?: number;
    examples?: string[];
  }[];
  geelark_failures?: { fail_code?: string; meaning?: string; count?: number; fail_desc?: string }[];
  performance?: {
    collapse_week?: string | null;
    total_posts_measured?: number;
  };
  health?: {
    timeline?: { at?: string; source?: string; verdict?: string; detail?: string }[];
    ban_event_date?: string | null;
    shadowban_event_date?: string | null;
    geelark_blind_spot?: boolean;
    alive_checks_after_ban?: number;
    latest_geelark_verdict?: string;
  };
}

interface RawReport {
  id: number;
  geelark_profile: string;
  username: string | null;
  investigated_at: string;
  execution_id: string | null;
  likely_cause: string | null;
  evidence: string | null;
  confidence: string | null;
  overview: string | null;
  commonalities: string | null;
  recommendations: unknown;
  findings: ForensicsFindings | null;
  source_errors: unknown;
  no_records: boolean;
}

const COLS =
  "id,geelark_profile,username,investigated_at,execution_id,likely_cause,evidence," +
  "confidence,overview,commonalities,recommendations,findings,source_errors,no_records";

/** jsonb columns can hold anything; only arrays of strings are rendered. */
function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function toReport(r: RawReport): ForensicsReport {
  return {
    id: r.id,
    geelarkProfile: r.geelark_profile,
    username: r.username,
    investigatedAt: r.investigated_at,
    executionId: r.execution_id,
    likelyCause: r.likely_cause,
    evidence: r.evidence,
    confidence: r.confidence,
    overview: r.overview,
    commonalities: r.commonalities,
    recommendations: strArray(r.recommendations),
    findings: r.findings,
    sourceErrors: strArray(r.source_errors),
    noRecords: r.no_records === true,
  };
}

/**
 * The most recent investigation for a profile, plus the dates of any earlier
 * ones. Re-investigating is expected, so the page says which run it is showing.
 */
export function getForensicsReport(profile: string) {
  return cachedFetcher(forensicsTag(profile), TTL.supabase, async () => {
    const rows = await sbRest<RawReport[]>(
      `ban_forensics_reports?select=${COLS}&geelark_profile=eq.${encodeURIComponent(profile)}` +
        "&order=investigated_at.desc&limit=20",
    );
    if (!rows.length) return { latest: null, earlier: [] as string[] };
    return {
      latest: toReport(rows[0]),
      earlier: rows.slice(1).map((r) => r.investigated_at),
    };
  })();
}
