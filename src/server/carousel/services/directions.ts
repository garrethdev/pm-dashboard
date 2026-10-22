/**
 * Different directions (2026-10-22): the writer turns one instruction into
 * N distinct picture prompts. The person reads and changes them in the form
 * before any is generated, so the model's words are a draft, never a run.
 */
import { askJson, text } from "@/server/carousel/services/llm";

const SYSTEM = `You write prompts for a photo generator that makes candid phone photos of one recurring person (the library's character) for a social media carousel.
Given one instruction and a number, write that many prompts. Each prompt is one picture: a different place, moment or activity, so no two are alike, while the person, their look and the instruction's mood stay the same.
Each prompt: one or two plain sentences, concrete (where, what they are doing, light, time of day, what the phone sees), no camera jargon, no text or captions in the picture, no brand names unless the instruction names one.`;

/** Take the model's reply apart: a list of prompts, cut to length, with blanks and repeats dropped. */
export function readDirections(reply: Record<string, unknown>, count: number): string[] {
  const raw = Array.isArray(reply.prompts) ? reply.prompts : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of raw) {
    const line = text(typeof p === "object" && p && "prompt" in p ? (p as { prompt: unknown }).prompt : p, 600);
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= count) break;
  }
  return out;
}

export async function writeDirections(instruction: string, count: number, libraryName: string): Promise<string[]> {
  const reply = await askJson(SYSTEM, [{ role: "user", content: `Library: ${libraryName}\nHow many: ${count}\nInstruction: ${instruction}\n\nReply as {"prompts": ["...", "..."]} with exactly ${count} prompts.` }], { temperature: 0.8, maxTokens: 2500 });
  const prompts = readDirections(reply, count);
  if (!prompts.length) throw new Error("The writer gave no directions. Try again");
  return prompts;
}
