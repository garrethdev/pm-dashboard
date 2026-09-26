/**
 * What every generator route does first: the session gate, who is acting,
 * and one shape for errors. Route handlers stay short and the rules stay
 * in one place.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { authBypassed } from "@/lib/auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { logError } from "@/server/carousel/log";

export async function guard(): Promise<{ denied: NextResponse } | { denied: null; email: string }> {
  const denied = await requireSession();
  if (denied) return { denied };
  // The placeholder person exists only under the dev bypass; a real session
  // that cannot be read is refused rather than audited as somebody else.
  try {
    return { denied: null, email: await actingUserEmail() };
  } catch (err) {
    if (authBypassed()) return { denied: null, email: "dev@local" };
    logError("session read", err);
    return { denied: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

export function ok(data: unknown, init: ResponseInit = {}) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "private, no-store", ...(init.headers ?? {}) } });
}

export function bad(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/** Read a JSON body, or an empty object when there is none. */
export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Run a write, log it, and turn a thrown error into a readable response. */
export async function attempt<T>(
  email: string,
  action: string,
  target: string,
  fn: () => Promise<T>,
  detail?: unknown,
): Promise<NextResponse> {
  try {
    const result = await fn();
    await auditLog({ userEmail: email, action, target, newValue: detail ?? result ?? null });
    return ok(result ?? { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    logError(`${action} on ${target}`, err);
    return bad(message, 500);
  }
}
