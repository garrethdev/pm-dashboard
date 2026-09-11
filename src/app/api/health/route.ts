import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

/**
 * Credential probe (plan §11 Phase 0): pings every upstream and reports which
 * credentials work — so missing keys surface before feature work depends on
 * them. Never returns secret values, only status.
 */

type UpstreamStatus = "ok" | "missing_credential" | "error";

interface Probe {
  name: string;
  status: UpstreamStatus;
  latencyMs?: number;
  detail?: string;
}

const TIMEOUT_MS = 6000;

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
}

async function probe(
  name: string,
  requiredEnv: string[],
  run: () => Promise<{ ok: boolean; detail?: string }>,
): Promise<Probe> {
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return { name, status: "missing_credential", detail: `env not set: ${missing.join(", ")}` };
  }
  const started = Date.now();
  try {
    const result = await run();
    return {
      name,
      status: result.ok ? "ok" : "error",
      latencyMs: Date.now() - started,
      detail: result.detail,
    };
  } catch (err) {
    return {
      name,
      status: "error",
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const probes = await Promise.all([
    probe("supabase (story-finder, service role)", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], async () => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const res = await timedFetch(
        `${process.env.SUPABASE_URL}/rest/v1/accounts?select=geelark_profile&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      );
      return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
    }),

    probe("supabase auth (anon key)", ["SUPABASE_URL", "SUPABASE_ANON_KEY"], async () => {
      const res = await timedFetch(`${process.env.SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY! },
      });
      return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
    }),

    probe("n8n", ["N8N_BASE_URL", "N8N_API_KEY"], async () => {
      const res = await timedFetch(`${process.env.N8N_BASE_URL}/api/v1/workflows?limit=1`, {
        headers: { "X-N8N-API-KEY": process.env.N8N_API_KEY! },
      });
      return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
    }),

    probe("geelark", ["GEELARK_BEARER_TOKEN"], async () => {
      // TODO: live credential — verify endpoint path against real account before trusting shape.
      const res = await timedFetch("https://openapi.geelark.com/open/v1/phone/list", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GEELARK_BEARER_TOKEN}`,
          traceId: crypto.randomUUID(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page: 1, pageSize: 1 }),
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const body = (await res.json()) as { code?: number; msg?: string };
      return { ok: body.code === 0, detail: body.code === 0 ? undefined : `code ${body.code}: ${body.msg}` };
    }),

    probe("proxy-cheap", ["PROXYCHEAP_API_KEY", "PROXYCHEAP_API_SECRET"], async () => {
      // TODO: live credential — endpoint shape unverified (plan §7); probe and adjust.
      const res = await timedFetch("https://api.proxy-cheap.com/proxies", {
        headers: {
          "X-Api-Key": process.env.PROXYCHEAP_API_KEY!,
          "X-Api-Secret": process.env.PROXYCHEAP_API_SECRET!,
        },
      });
      return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
    }),

    probe("textverified", ["TEXTVERIFIED_API_KEY", "TEXTVERIFIED_API_USERNAME"], async () => {
      // v2 auth flow: exchange API key + username for a bearer token.
      const res = await timedFetch("https://www.textverified.com/api/pub/v2/auth", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.TEXTVERIFIED_API_KEY!,
          "X-API-USERNAME": process.env.TEXTVERIFIED_API_USERNAME!,
        },
      });
      if (!res.ok) return { ok: false, detail: `auth HTTP ${res.status}` };
      const body = (await res.json()) as { token?: string };
      return { ok: Boolean(body.token), detail: body.token ? undefined : "no token in auth response" };
    }),

    probe("scrapecreators", ["SCRAPECREATORS_API_KEY"], async () => {
      // A real request, not a look at process.env. This used to return ok:true
      // on the strength of the key merely existing, say so in `detail`, and
      // then count itself among the successful probes anyway — so the one
      // screen whose job is "which credentials work" reported a working
      // credential it had never tried. Raised by the 2026-09-09 external
      // review.
      //
      // The credit-balance endpoint is the right one to ask: it needs the key
      // (a wrong one answers 401 — verified 2026-09-11), it costs no credits,
      // and what it returns is worth seeing. ScrapeCreators pays for every
      // avatar and follower count on the accounts pages, so a balance running
      // down is a real thing to know before it hits zero.
      const res = await timedFetch("https://api.scrapecreators.com/v1/account/credit-balance", {
        headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY! },
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const body = (await res.json()) as { success?: boolean; creditCount?: number };
      if (body.success !== true) return { ok: false, detail: "key rejected" };
      return { ok: true, detail: `${body.creditCount ?? "?"} credits remaining` };
    }),
  ]);

  const summary = {
    ok: probes.filter((p) => p.status === "ok").length,
    missing: probes.filter((p) => p.status === "missing_credential").length,
    error: probes.filter((p) => p.status === "error").length,
  };

  return NextResponse.json({ checkedAt: new Date().toISOString(), summary, upstreams: probes });
}
