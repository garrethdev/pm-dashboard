import { TTL, cachedFetcher } from "@/lib/data/cache";

/**
 * GeeLark wallet balance (read-only). The balance also feeds the topbar pulse
 * pill (see pulse.ts); this dedicated fetcher backs the homepage wallet card,
 * which links out to GeeLark's own top-up page — we never move funds ourselves.
 */
export interface WalletInfo {
  /** USD balance, or null when the check failed. */
  balance: number | null;
  status: "ok" | "low" | "error";
  detail: string;
}

/** Below this (USD) the wallet card turns red — mirrors the pulse threshold. */
export const WALLET_LOW = 20;

async function fetchWallet(): Promise<WalletInfo> {
  try {
    const res = await fetch("https://openapi.geelark.com/open/v1/pay/wallet", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GEELARK_BEARER_TOKEN}`,
        traceId: crypto.randomUUID(),
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const body = (await res.json()) as { code: number; data?: { balance: number } };
    if (body.code !== 0 || !body.data) {
      return { balance: null, status: "error", detail: "Balance check failed" };
    }
    const bal = body.data.balance;
    return {
      balance: bal,
      status: bal < WALLET_LOW ? "low" : "ok",
      detail: bal < WALLET_LOW ? "Low balance" : "Healthy",
    };
  } catch {
    return { balance: null, status: "error", detail: "GeeLark unreachable" };
  }
}

export const getWallet = cachedFetcher("geelark-wallet", TTL.external, fetchWallet);
