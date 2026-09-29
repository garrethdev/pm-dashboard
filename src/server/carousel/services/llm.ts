/**
 * One way to ask the model for a JSON object. The writer and the Studio's
 * draft each grew their own call; the two conversations share this one.
 * Model output is untrusted: callers read the fields they expect and cut
 * every string to a length.
 */
const MODEL = process.env.CAROUSEL_WRITER_MODEL || "anthropic/claude-sonnet-4.6";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function modelAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function askJson(system: string, turns: ChatTurn[], opts: { temperature?: number; maxTokens?: number } = {}): Promise<Record<string, unknown>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The writer is not connected: OPENROUTER_API_KEY is not set");
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
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: `${system}\n\nReply with one JSON object and nothing else.` }, ...turns],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 402) throw new Error("The writer's account is out of credit");
  if (res.status === 429) throw new Error("The writer is busy. Try again in a moment");
  if (!res.ok) throw new Error(`The writer could not be reached (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("The writer returned nothing");
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The writer's reply could not be read");
  try {
    return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error("The writer's reply could not be read");
  }
}

export const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
