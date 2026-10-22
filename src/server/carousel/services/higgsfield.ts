/**
 * Asking Higgsfield for a picture (DEV-30), through the account connected
 * on Settings. Until 2026-10-22 this file spoke to Higgsfield's developer
 * API with its own key and its own dollar wallet, which was empty. Garreth's
 * instruction the same day: use the main Higgsfield account through the MCP
 * server instead, so pictures spend that account's plan credits, as the
 * Claude connector does. The shape of this module is unchanged — the
 * generate route and the library service ask the same way — only the line
 * underneath moved (see `higgsfield-mcp.ts` for the connection itself).
 *
 * One picture: submit a job, wait for it in long polls, download the result.
 * The model is Soul 2, Higgsfield's own portrait model. With a base image
 * the picture keeps the face or the place; without one it runs from the
 * prompt alone. Soul 2 has no 4:5, so "portrait" is 3:4 and the painter
 * crops to the slide cell as it does for every library picture.
 */
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { NotConnected, parseToolResult, textOf, withHiggsfield } from "@/server/carousel/services/higgsfield-mcp";

export type Shape = "portrait" | "tall" | "square";

/** The three shapes the form offers, and what Soul 2 is asked for. */
export const SHAPES: Record<Shape, string> = { portrait: "3:4", tall: "9:16", square: "1:1" };

export const isShape = (v: unknown): v is Shape => typeof v === "string" && v in SHAPES;

/** Soul 2 in Higgsfield's catalogue (`models_explore`, read 2026-10-22). */
export const MODEL = process.env.HIGGSFIELD_IMAGE_MODEL || "soul_2";
/** The lower of Soul 2's two tiers; the degrade pass shrinks the picture anyway. */
const QUALITY = "1.5k";

/** One long poll's budget, the most the tool allows. */
const POLL_S = 15;
const WAIT_MS = 150_000; // the route's 300 s ceiling also has to fit the SynthID removal
const FETCH_MS = 30_000;

/**
 * A failure that stops the whole run, not just one picture: Higgsfield is
 * not connected, the sign-in has expired, or the account is out of credits.
 * The route passes `code` on, and the page fails every waiting tile with
 * the same reason.
 */
export class HiggsfieldError extends Error {
  readonly code: "run_blocked" | undefined;
  constructor(message: string, blocksRun = false) {
    super(message);
    this.code = blocksRun ? "run_blocked" : undefined;
  }
}

export interface Ask {
  prompt: string;
  shape: Shape;
  /** A public link to one of the library's own pictures; the face or the place is kept. */
  baseImageUrl?: string | null;
  seed?: number | null;
}

interface Job {
  index?: number;
  job_id?: string;
  status?: string;
  result_url?: string;
  result_urls?: string[];
  error?: string | null;
}

interface JobsReply {
  jobs?: Job[];
  all_terminal?: boolean;
  poll_after_seconds?: number;
}

/** What went wrong, as the error the route expects. */
function wrap(err: unknown): HiggsfieldError {
  if (err instanceof HiggsfieldError) return err;
  if (err instanceof NotConnected) return new HiggsfieldError(err.message, true);
  const m = err instanceof Error ? err.message : String(err);
  if (/insufficient|not enough credits|out of credits|no credits|balance/i.test(m)) return new HiggsfieldError("The Higgsfield account is out of credits", true);
  if (/minimum plan|subscription (is )?required|upgrade (your|the) plan/i.test(m)) return new HiggsfieldError(`Higgsfield refused: ${m}`, true);
  return new HiggsfieldError(m || "Higgsfield could not be reached");
}

/** One tool call on an open session; a tool error becomes an Error with its words. */
async function call<T>(client: Client, name: string, args: Record<string, unknown>): Promise<T> {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(textOf(result as { content?: unknown }) || `Higgsfield ${name} failed`);
  return parseToolResult(result) as T;
}

/** Ask for one picture. The answer is a job id to wait on, not the picture. */
export async function submit(ask: Ask): Promise<{ requestId: string }> {
  try {
    return await withHiggsfield(async (client) => {
      const medias: { role: string; value: string }[] = [];
      if (ask.baseImageUrl) {
        const imported = await call<{ media_id?: string; id?: string }>(client, "media_import_url", { url: ask.baseImageUrl, type: "image" });
        const id = imported?.media_id ?? imported?.id;
        if (!id) throw new HiggsfieldError("Higgsfield did not take the base picture");
        medias.push({ role: "image", value: id });
      }
      const params: Record<string, unknown> = {
        model: MODEL,
        prompt: ask.prompt,
        aspect_ratio: SHAPES[ask.shape],
        quality: QUALITY,
        // Credits, never a trial allowance: the dashboard spends what the connected plan holds.
        use_unlim: false,
        ...(medias.length ? { medias } : {}),
        ...(ask.seed ? { seed: ask.seed } : {}),
      };
      const reply = await call<JobsReply & { failed_count?: number }>(client, "generate_image_batch", {
        context: "A picture for an image library in the PM Dashboard",
        requests: [{ index: 0, params }],
      });
      const job = reply?.jobs?.[0];
      if (!job?.job_id) throw new HiggsfieldError(job?.error ? `Higgsfield refused the request: ${job.error}` : "Higgsfield did not accept the request");
      return { requestId: job.job_id };
    });
  } catch (err) {
    throw wrap(err);
  }
}

function urlsOf(job: Job): string[] {
  if (Array.isArray(job.result_urls) && job.result_urls.length) return job.result_urls.filter(Boolean);
  return job.result_url ? [job.result_url] : [];
}

/** Wait for a job to finish and hand back the picture links. */
export async function awaitImages(requestId: string): Promise<string[]> {
  try {
    return await withHiggsfield(async (client) => {
      const at = Date.now();
      for (;;) {
        const reply = await call<JobsReply>(client, "jobs_wait", { jobs: [{ index: 0, job_id: requestId }], timeout_seconds: POLL_S });
        const job = reply?.jobs?.[0] ?? {};
        switch (job.status) {
          case "completed":
          case "succeeded": {
            const urls = urlsOf(job);
            if (!urls.length) throw new HiggsfieldError("Higgsfield finished but returned no picture");
            return urls;
          }
          case "failed":
          case "error":
            throw new HiggsfieldError(job.error ? `Higgsfield could not make the picture: ${job.error}` : "Higgsfield could not make the picture");
          case "nsfw":
            throw new HiggsfieldError("Higgsfield declined the picture as unsafe. Change the prompt");
          case "canceled":
          case "cancelled":
            throw new HiggsfieldError("The request was cancelled");
        }
        if (Date.now() - at > WAIT_MS) throw new HiggsfieldError("Higgsfield took too long to make the picture");
        const pause = Math.min(Math.max(reply?.poll_after_seconds ?? 0, 0), 10) * 1000;
        if (pause) await new Promise((r) => setTimeout(r, pause));
      }
    });
  } catch (err) {
    throw wrap(err);
  }
}

/** Fetch a finished picture. The link is public, so it carries nothing of the account. */
export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) throw new HiggsfieldError(`The picture could not be downloaded (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Submit, wait and download: one picture's bytes. */
export async function generate(ask: Ask): Promise<{ bytes: Buffer; requestId: string }> {
  const { requestId } = await submit(ask);
  const [url] = await awaitImages(requestId);
  return { bytes: await download(url), requestId };
}
