import { TTL, cachedFetcher } from "@/lib/data/cache";

/**
 * TextVerified v2 API — phone number rentals. Parsers built from observed
 * responses on 2026-08-31:
 *   POST /api/pub/v2/auth (X-API-KEY + X-API-USERNAME) → {token, expiresAt}
 *   GET  /api/pub/v2/reservations/rental/renewable    → 58 rentals
 *   GET  /api/pub/v2/reservations/rental/nonrenewable → 10 rentals
 *   GET  /api/pub/v2/billing-cycles                   → renewal dates
 * Renewable rentals expire with their billing cycle; nonrenewable rentals
 * expose no end date in the list shape.
 */
export interface PhoneRental {
  id: string;
  number: string; // digits only, e.g. "2832259220"
  serviceName: string;
  state: string; // "renewableActive" | "nonrenewableActive" | ...
  renewable: boolean;
  createdAt: string;
  cycleEndsAt: string | null; // renewables only
  includedForRenewal: boolean | null; // renewables only
}

const BASE = "https://www.textverified.com";

interface RawRental {
  id: string;
  number?: string;
  serviceName?: string;
  state?: string;
  createdAt?: string;
  billingCycleId?: string;
  isIncludedForNextRenewal?: boolean;
}

async function authToken(): Promise<string> {
  const res = await fetch(`${BASE}/api/pub/v2/auth`, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.TEXTVERIFIED_API_KEY!,
      "X-API-USERNAME": process.env.TEXTVERIFIED_API_USERNAME!,
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`textverified auth HTTP ${res.status}`);
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("textverified auth: no token");
  return body.token;
}

async function tvGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`textverified HTTP ${res.status} on ${path}`);
  return (await res.json()) as T;
}

async function fetchRentals(): Promise<PhoneRental[]> {
  const token = await authToken();
  const [renewable, nonrenewable, cycles] = await Promise.all([
    tvGet<{ data: RawRental[] }>(token, "/api/pub/v2/reservations/rental/renewable"),
    tvGet<{ data: RawRental[] }>(token, "/api/pub/v2/reservations/rental/nonrenewable"),
    tvGet<{ data: { id: string; billingCycleEndsAt?: string }[] }>(token, "/api/pub/v2/billing-cycles"),
  ]);

  const cycleEnds = new Map(cycles.data.map((c) => [c.id, c.billingCycleEndsAt ?? null]));

  const map = (raw: RawRental, renewableFlag: boolean): PhoneRental => ({
    id: raw.id,
    number: (raw.number ?? "").replace(/\D/g, ""),
    serviceName: raw.serviceName ?? "",
    state: raw.state ?? "",
    renewable: renewableFlag,
    createdAt: raw.createdAt ?? "",
    cycleEndsAt: renewableFlag ? (cycleEnds.get(raw.billingCycleId ?? "") ?? null) : null,
    includedForRenewal: renewableFlag ? (raw.isIncludedForNextRenewal ?? null) : null,
  });

  return [
    ...renewable.data.map((r) => map(r, true)),
    ...nonrenewable.data.map((r) => map(r, false)),
  ];
}

export const getPhoneRentals = cachedFetcher("textverified-rentals", TTL.external, fetchRentals);

/**
 * Account balance. GET /api/pub/v2/account/me ->
 * {"username": "...", "currentBalance": 14.46} (verified live 2026-09-02).
 * Read-only — top-ups happen on TextVerified's own billing page.
 */
export interface TextVerifiedBalance {
  balance: number | null;
  detail: string;
}

async function fetchBalance(): Promise<TextVerifiedBalance> {
  try {
    const token = await authToken();
    const res = await fetch(`${BASE}/api/pub/v2/account/me`, {
      headers: { Authorization: `Bearer ${token}` },
      // TextVerified auth is slow (observed >10s), so this window is generous.
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return { balance: null, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { currentBalance?: number };
    return typeof body.currentBalance === "number"
      ? { balance: body.currentBalance, detail: "ok" }
      : { balance: null, detail: "no balance in response" };
  } catch {
    return { balance: null, detail: "TextVerified unreachable" };
  }
}

export const getTextVerifiedBalance = cachedFetcher(
  "textverified-balance",
  TTL.external,
  fetchBalance,
);
