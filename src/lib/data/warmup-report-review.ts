/**
 * Claude's read of one warmup report (Garreth, 2026-10-28): what happened,
 * where the problem is, and what to try. The Warmups page's Analyze button.
 *
 * The same shape as a recorded session's review (phone-session-review.ts): one
 * OpenRouter call with the key the Carousel Generator's writer already uses,
 * one JSON object back, read defensively because model output is untrusted.
 * Claude is sent the report's summary, its diary as readable lines, and the
 * stop screenshot when there is one. "Copy for Claude" hands over the same
 * diary raw, for a person who would rather ask in a chat.
 */

import sharp from "sharp";
import { countsLine, diaryLines, etFull } from "@/lib/data/warmup-report-format";
import type { WarmupReportDiary } from "@/lib/data/warmup-reports";
import { parseWarmupReview, type WarmupReview } from "@/lib/data/warmup-review-shape";

const MODEL = process.env.WARMUP_REVIEW_MODEL || process.env.PHONE_SESSION_REVIEW_MODEL || "anthropic/claude-sonnet-4.6";
/** The diary's limit in the call, in characters. The largest diary so far is
 *  about 88,000; a longer one keeps its start and, mostly, its end, which is
 *  where a stop is explained. */
const DIARY_MAX_CHARS = 150_000;
const DIARY_HEAD_CHARS = 20_000;
const SCREEN_WIDTH = 600;

export function reviewAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

const SYSTEM = `You are reading the report of a warmup robot. The robot drives a real iPhone over USB to "warm up" a social media account: it scrolls the feed, watches videos, and sometimes likes, saves or follows, so the account looks like a person uses it. It never posts. Each warmup should run about 15 minutes. When something goes wrong the robot stops and records a short stop note.

You are given the report's summary, the robot's diary (its log, one line per event, times in New York time) and, when there is one, a screenshot of the phone's screen at the moment it stopped.

The people reading your answer run the phones but are not developers. Write in plain English, short sentences, no code words. Where the robot's own words help (a stop note, a screen name), you may quote them.

Work out:
- what happened, in order, and why the warmup ended
- where the problem is: "phone" (the phone or its USB connection, e.g. it disconnected or locked), "platform" (the app: an update, a pop-up, a slow feed, a changed screen), "robot" (the robot misread a screen or got lost, and the app itself looked normal), "account" (the wrong account was signed in, or the account is logged out, restricted or warned), "none" (the warmup finished normally), or "unknown"
- whether the platform showed anything that suggests the account itself is at risk: a warning, a restriction, a ban notice, a login or verification wall
- the single most useful thing for a person to do next

Reply with one JSON object and nothing else:
{"summary": "<two to four plain sentences on what happened>", "cause": "phone" | "platform" | "robot" | "account" | "none" | "unknown", "causeNote": "<one sentence on why you put it there>", "nextStep": "<one sentence: what to do next>", "accountRisk": true | false, "moments": [{"time": "<HH:MM:SS from the diary, or null>", "note": "<what happened then>"}]}
Keep moments to the few that explain the ending, six at most. If the diary does not say enough to tell, say so plainly rather than guess.`;

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

/** The diary as readable lines, trimmed to the call's limit. */
export function diaryForReview(log: string | null): string {
  if (!log) return "(No diary was sent with this warmup.)";
  const text = diaryLines(log)
    .map((l) => `${l.time ?? "--:--:--"} ${l.level} ${l.msg}${l.extra ? `  ${l.extra}` : ""}`)
    .join("\n");
  if (text.length <= DIARY_MAX_CHARS) return text;
  const tail = DIARY_MAX_CHARS - DIARY_HEAD_CHARS;
  return `${text.slice(0, DIARY_HEAD_CHARS)}\n… (${text.length - DIARY_MAX_CHARS} characters left out) …\n${text.slice(-tail)}`;
}

function summaryText(r: WarmupReportDiary): string {
  return [
    `Account: ${r.username ? `@${r.username}` : "(no username)"}${r.profile ? `, ${r.profile}` : ""}`,
    `Phone: ${r.deviceName ?? "unknown"}`,
    `Warmup ${r.sessionNo} of the day, started ${etFull(r.startedAt)}, ended ${etFull(r.endedAt)}, ${r.minutes} minutes`,
    `Outcome: ${r.outcome}${r.note ? `, stop note "${r.note}"` : ""}`,
    `Counts: ${countsLine(r.counts)}`,
  ].join("\n");
}

/**
 * Ask for the read. Throws with a sentence for the screen when the model
 * cannot be reached or answers nonsense.
 */
export async function reviewWarmup(
  report: WarmupReportDiary,
  screenshot: Uint8Array | null,
): Promise<{ model: string; review: WarmupReview }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The analysis is not connected: OPENROUTER_API_KEY is not set");
  if (!report.log && !screenshot) {
    throw new Error(
      report.clearedAt
        ? "This warmup's diary was cleared after 30 days, so there is nothing left to read"
        : "This warmup came with no diary and no screenshot, so there is nothing to read",
    );
  }

  const parts: Part[] = [
    { type: "text", text: `Report summary:\n${summaryText(report)}` },
    { type: "text", text: `Diary:\n${diaryForReview(report.log)}` },
  ];
  if (screenshot) {
    const small = await sharp(screenshot).resize({ width: SCREEN_WIDTH, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
    parts.push({ type: "text", text: "The phone's screen when the warmup stopped:" });
    parts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${small.toString("base64")}` } });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Warmup Review",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: parts },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 402) throw new Error("The analysis account is out of credit");
  if (res.status === 429) throw new Error("The analysis is busy. Try again in a moment");
  if (!res.ok) throw new Error(`The analysis could not be reached (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("The analysis returned nothing");
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  let raw: unknown = null;
  if (start >= 0 && end > start) {
    try {
      raw = JSON.parse(content.slice(start, end + 1));
    } catch {
      raw = null;
    }
  }
  const review = parseWarmupReview(raw);
  if (!review) throw new Error("The analysis reply could not be read");
  return { model: MODEL, review };
}
