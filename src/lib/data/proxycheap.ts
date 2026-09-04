import { TTL, cachedFetcher } from "@/lib/data/cache";

/**
 * Proxy-Cheap API — subscription list. Parser built from the observed
 * response of GET https://api.proxy-cheap.com/proxies on 2026-08-31
 * ({proxies: [{id, status, connection{connectIp, socks5Port}, expiresAt, ...}]}).
 */
export interface ProxySubscription {
  id: number;
  status: string; // observed: "ACTIVE"
  ip: string;
  port: number | null;
  expiresAt: string;
  autoExtend: boolean;
  networkType: string;
  isp: string | null;
}

interface RawProxy {
  id: number;
  status: string;
  networkType?: string;
  connection?: { connectIp?: string; publicIp?: string; socks5Port?: number; httpPort?: number | null };
  expiresAt?: string;
  autoExtendEnabled?: boolean;
  metadata?: { ispName?: string };
}

async function fetchProxies(): Promise<ProxySubscription[]> {
  const res = await fetch("https://api.proxy-cheap.com/proxies", {
    headers: {
      "X-Api-Key": process.env.PROXYCHEAP_API_KEY!,
      "X-Api-Secret": process.env.PROXYCHEAP_API_SECRET!,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`proxy-cheap HTTP ${res.status}`);
  const body = (await res.json()) as { proxies: RawProxy[] };
  return (body.proxies ?? []).map((p) => ({
    id: p.id,
    status: p.status,
    ip: p.connection?.connectIp ?? p.connection?.publicIp ?? "",
    port: p.connection?.socks5Port ?? p.connection?.httpPort ?? null,
    expiresAt: p.expiresAt ?? "",
    autoExtend: Boolean(p.autoExtendEnabled),
    networkType: p.networkType ?? "",
    isp: p.metadata?.ispName ?? null,
  }));
}

export const getProxySubscriptions = cachedFetcher("proxycheap-proxies", TTL.external, fetchProxies);

/**
 * Account balance. GET /account/balance -> {"balance": 31.37} (verified live
 * 2026-09-02; /balance, /account, /me and /wallet all 404).
 * Read-only — top-ups happen on proxy-cheap's own billing page.
 */
export interface ProxyCheapBalance {
  balance: number | null;
  detail: string;
}

async function fetchBalance(): Promise<ProxyCheapBalance> {
  try {
    const res = await fetch("https://api.proxy-cheap.com/account/balance", {
      headers: {
        "X-Api-Key": process.env.PROXYCHEAP_API_KEY!,
        "X-Api-Secret": process.env.PROXYCHEAP_API_SECRET!,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return { balance: null, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { balance?: number };
    return typeof body.balance === "number"
      ? { balance: body.balance, detail: "ok" }
      : { balance: null, detail: "no balance in response" };
  } catch {
    return { balance: null, detail: "proxy-cheap unreachable" };
  }
}

export const getProxyCheapBalance = cachedFetcher(
  "proxycheap-balance",
  TTL.external,
  fetchBalance,
);
