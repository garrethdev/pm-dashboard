/**
 * The copy writer (DEV-08): one deck's copy from the type's template, its
 * Writing and the batch's note, through OpenRouter.
 *
 * The model writes against the template's copy contract: every role whose
 * writer is `ai`, each within its character limit, plus the caption and a
 * music suggestion. Fixed roles are never asked for; per-batch roles come
 * from the Generate form. Reference text and model output are untrusted and
 * are only ever rendered as plain text.
 *
 * Without OPENROUTER_API_KEY the writer falls back to a fixture that makes
 * plausible copy, so the screens can be clicked through on a machine with
 * no keys. The batch page says which writer ran.
 */
export interface CopyRole {
  role: string;
  columns?: string[];
  writer: "ai" | "fixed" | "per_batch";
  fixed?: string;
  max_chars?: number;
  beat?: string;
  values?: string[];
  painted?: boolean;
}

export interface WriteRequest {
  typeName: string;
  character: string;
  slug: string;
  contract: CopyRole[];
  writing: string | null;
  note: string | null;
  perBatchText: Record<string, string>;
  feedback: string | null;
  /** Hooks already written in this batch, so the next deck differs. */
  avoidHooks: string[];
  position: number;
  seed: string;
}

export interface WriteResult {
  copy: Record<string, string>;
  hook: string;
  caption: string;
  musicHint: string | null;
  writer: "openrouter" | "fixture";
  model: string | null;
}

const MODEL = process.env.CAROUSEL_WRITER_MODEL || "anthropic/claude-sonnet-4.6";

function aiRoles(contract: CopyRole[]): CopyRole[] {
  return contract.filter((r) => r.writer === "ai" && r.role !== "caption");
}

function hookRole(contract: CopyRole[]): string {
  return contract.find((r) => r.role === "hook" || r.beat === "hook")?.role ?? aiRoles(contract)[0]?.role ?? "hook";
}

/** Fixed and per-batch roles are settled without the model. */
export function settledRoles(contract: CopyRole[], perBatchText: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of contract) {
    if (r.writer === "fixed" && r.fixed) out[r.role] = r.fixed;
    if (r.writer === "per_batch") out[r.role] = perBatchText[r.role] ?? r.fixed ?? "";
  }
  return out;
}

function prompt(req: WriteRequest): string {
  const roles = aiRoles(req.contract)
    .map((r) => `- "${r.role}"${r.beat ? ` (${r.beat})` : ""}${r.max_chars ? `, at most ${r.max_chars} characters` : ""}${r.values ? `, one of: ${r.values.join(", ")}` : ""}`)
    .join("\n");
  const caption = req.contract.find((r) => r.role === "caption");
  const settled = settledRoles(req.contract, req.perBatchText);
  const fixedLines = Object.entries(settled).map(([k, v]) => `- "${k}": ${JSON.stringify(v)}`).join("\n");
  return [
    `You write short social-media carousel copy for the "${req.typeName}" carousel, voiced by ${req.character}.`,
    req.writing ? `Writing direction for this carousel type:\n${req.writing}` : "There is no saved writing direction; write warm, plain, first-person copy.",
    req.note ? `Note for this batch: ${req.note}` : "",
    req.feedback ? `Feedback on the previous attempt, which must be addressed: ${req.feedback}` : "",
    fixedLines ? `These lines are fixed and already decided; write around them:\n${fixedLines}` : "",
    req.avoidHooks.length ? `Hooks already used in this batch; this deck must open differently:\n${req.avoidHooks.map((h) => `- ${h}`).join("\n")}` : "",
    `Write every one of these roles, each a plain string with no hashtags and no emoji unless the direction asks for them:\n${roles}`,
    `Also write "caption"${caption?.max_chars ? ` (at most ${caption.max_chars} characters)` : ""} and "music_hint" (an artist and song title that suits the deck, as "Artist - Title").`,
    `Deck ${req.position} of the batch. Reply with one JSON object only: {"copy": {role: text, ...}, "caption": "...", "music_hint": "..."}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callOpenRouter(text: string): Promise<{ content: string; model: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Carousel Generator",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.9,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a careful copywriter. You answer with a single JSON object and nothing else." },
        { role: "user", content: text },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Writer HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; model?: string };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("The writer returned nothing");
  return { content, model: json.model ?? MODEL };
}

function parse(content: string): { copy: Record<string, string>; caption: string; music_hint: string | null } {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const raw = JSON.parse(content.slice(start, end + 1)) as { copy?: Record<string, unknown>; caption?: unknown; music_hint?: unknown };
  const copy: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.copy ?? {})) if (typeof v === "string") copy[k] = v.trim();
  return {
    copy,
    caption: typeof raw.caption === "string" ? raw.caption.trim() : "",
    music_hint: typeof raw.music_hint === "string" ? raw.music_hint.trim() : null,
  };
}

const FIXTURE_HOOKS = [
  "I stopped chasing the scale and started chasing sleep.",
  "Nobody told me the mirror lies before 9am.",
  "Six months. One habit. No filters.",
  "The photo I almost deleted is the one that changed my mind.",
  "My under-eyes told on me long before my face did.",
  "I gave up on a Tuesday. I started again on a Wednesday.",
  "What I ate had less to do with it than when I slept.",
  "The version of me in this photo had no idea.",
];

function fixture(req: WriteRequest): WriteResult {
  const n = Math.abs([...req.seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  const copy: Record<string, string> = {};
  const roles = aiRoles(req.contract);
  roles.forEach((r, i) => {
    const line = r.values?.length
      ? r.values[(n + i) % r.values.length]
      : i === 0
        ? FIXTURE_HOOKS[(n + req.position) % FIXTURE_HOOKS.length]
        : `${r.beat ? r.beat.charAt(0).toUpperCase() + r.beat.slice(1) : r.role.replace(/_/g, " ")}: a plain line for slide ${i + 1}, written by the fixture writer.`;
    copy[r.role] = r.max_chars ? line.slice(0, r.max_chars) : line;
  });
  const hook = copy[hookRole(req.contract)] ?? "";
  return {
    copy,
    hook,
    caption: `${hook} I kept it simple and it kept working. Save this for the day you need it.`,
    musicHint: null,
    writer: "fixture",
    model: null,
  };
}

export function writerAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY) && process.env.CAROUSEL_FIXTURE_WRITER !== "true";
}

export async function writeDeck(req: WriteRequest): Promise<WriteResult> {
  if (!writerAvailable()) return fixture(req);
  const { content, model } = await callOpenRouter(prompt(req));
  const parsed = parse(content);
  const hook = parsed.copy[hookRole(req.contract)] ?? "";
  return { copy: parsed.copy, hook, caption: parsed.caption, musicHint: parsed.music_hint, writer: "openrouter", model };
}
