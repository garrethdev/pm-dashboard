/**
 * Claude's read of a recorded posting session (PF-26, phase 3).
 *
 * There is no written step list (Garreth, 2026-10-21): the check is for
 * anomalies, not for a fixed sequence. Claude is shown up to forty frames
 * spread evenly across the session, each labelled with its number and the
 * time since the first frame, and asked to describe what happened and call
 * out anything that looks wrong. The answer is one JSON object, read
 * defensively (`parseReview`): model output is untrusted.
 *
 * Goes through OpenRouter with the same key the Carousel Generator's writer
 * uses, so nothing new has to be set up to run it. Frames are shrunk to 480
 * pixels wide before they are sent: a phone screenshot is readable at that
 * size and costs a fraction of the full picture.
 */

import sharp from "sharp";
import { elapsedLabel, REVIEW_FRAME_LIMIT, sampleEvenly, spanMinutes, type FrameInfo } from "@/lib/data/phone-session-rules";
import { readFrame } from "@/lib/data/phone-session-storage";
import { parseReview, type PhoneSession, type SessionReview } from "@/lib/data/phone-sessions";

const MODEL = process.env.PHONE_SESSION_REVIEW_MODEL || "anthropic/claude-sonnet-4.6";
const FRAME_WIDTH = 480;

export function reviewAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export interface ReviewContext {
  deviceName: string | null;
  /** The accounts that live on this phone: what the screen should show. */
  accounts: { username: string | null; platform: string }[];
}

const SYSTEM = `You are checking a recorded work session. A worker uses a real iPhone by hand for the social media accounts listed, either to post content or to do a "manual warmup": using an account like a person would (scrolling the feed, watching, liking, following, switching between the phone's accounts) without posting. You are shown screenshots taken each time the screen changed, in order, each labelled with its frame number and the time since the session began. Some frames in between were left out to keep the set small.

First say what kind of session this was:
- "posting" when a post was made, or clearly being made, even if it did not go out
- "manual_warmup" when the worker only used the accounts without posting: feed, profiles, likes, follows, account switches, or an account opened and left on screen
- "other" when neither fits: settings, personal use, an app that is not one of the accounts', or nothing recognisable
Give one sentence on why.

There is no fixed list of steps. Describe what happened, then call out anything that looks wrong, careless or risky for the accounts:
- the wrong account or the wrong app being used
- a caption, media or setting that looks missing, wrong or incomplete
- account settings being changed
- time spent in unrelated apps, on unrelated accounts, or on personal use
- long idle gaps, or a post started but never sent
- login, verification, warning or block screens from the platform
- anything a careful manager would want to ask about

Do not flag ordinary scrolling, normal navigation or the usual steps of posting. Be concrete, and refer to frames by their number. If you cannot tell whether a post went out, say so.

Reply with one JSON object and nothing else:
{"kind": "posting" | "manual_warmup" | "other", "kindNote": "<one sentence on why>", "summary": "<a few plain sentences on what happened>", "postSeen": true | false | null, "timeline": [{"frame": <number>, "note": "<what is happening>"}], "anomalies": [{"frame": <number or null>, "severity": "low" | "medium" | "high", "what": "<what looks wrong and why it matters>"}]}
An empty anomalies list is the right answer for a clean session. A manual warmup that only parks on one screen for most of the session is worth a note in anomalies, since a warmup is meant to look like a person using the account.`;

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

async function shrink(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes).rotate().resize({ width: FRAME_WIDTH, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
}

function contextText(session: PhoneSession, ctx: ReviewContext, shown: number, total: number): string {
  const accounts = ctx.accounts.length
    ? ctx.accounts.map((a) => `${a.platform}: ${a.username ?? "(no username)"}`).join("; ")
    : "none recorded";
  const post = session.matchedPost
    ? `A hand-out was marked as posted in this window: ${session.matchedPost.contentType} for ${session.matchedPost.username ?? "an account"} on ${session.matchedPost.platform ?? "a platform"}.`
    : "No hand-out was marked as posted in this window.";
  return [
    `Phone: ${ctx.deviceName ?? "unknown"}.`,
    `Accounts on this phone: ${accounts}.`,
    `Session length: ${spanMinutes(session.startedAt, session.endedAt)} minutes, ${total} frames kept, ${shown} shown here.`,
    post,
  ].join("\n");
}

/**
 * Read the frames and ask for the review. Throws with a sentence for the
 * screen when the model cannot be reached or answers nonsense.
 */
export async function reviewSession(
  session: PhoneSession,
  frames: FrameInfo[],
  ctx: ReviewContext,
): Promise<{ model: string; review: SessionReview; framesShown: number }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The reviewer is not connected: OPENROUTER_API_KEY is not set");
  if (frames.length === 0) throw new Error("This session has no frames to read");

  const picks = sampleEvenly(frames.length, REVIEW_FRAME_LIMIT).map((i) => frames[i]);
  const parts: Part[] = [{ type: "text", text: contextText(session, ctx, picks.length, frames.length) }];
  let shown = 0;
  for (const f of picks) {
    const file = await readFrame(f.path);
    if (!file) continue;
    const small = await shrink(file.bytes);
    parts.push({ type: "text", text: `Frame ${f.number} at ${elapsedLabel(f.elapsedSec)}` });
    parts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${small.toString("base64")}` } });
    shown++;
  }
  if (shown === 0) throw new Error("None of this session's frames could be read");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Session Review",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: parts },
      ],
    }),
    signal: AbortSignal.timeout(110_000),
  });
  if (res.status === 402) throw new Error("The reviewer's account is out of credit");
  if (res.status === 429) throw new Error("The reviewer is busy. Try again in a moment");
  if (!res.ok) throw new Error(`The reviewer could not be reached (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("The reviewer returned nothing");
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The reviewer's reply could not be read");
  let raw: unknown;
  try {
    raw = JSON.parse(content.slice(start, end + 1));
  } catch {
    throw new Error("The reviewer's reply could not be read");
  }
  const review = parseReview(raw);
  if (!review || !review.summary) throw new Error("The reviewer's reply could not be read");
  return { model: MODEL, review, framesShown: shown };
}
