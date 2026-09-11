import { PROXYCHEAP_PROXIES_TAG, TTL, cachedFetcher } from "@/lib/data/cache";

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

export const getProxySubscriptions = cachedFetcher(PROXYCHEAP_PROXIES_TAG, TTL.external, fetchProxies);

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

/**
 * One subscription, read live, including its credentials.
 *
 * Deliberately separate from `getProxySubscriptions` and never cached: the
 * username and password are the only secrets in this file, and the list
 * payload is handed to the browser. Keeping them on a call the replace route
 * makes at the moment of the write means they are never serialised into a
 * cache entry or a client bundle.
 *
 * Verified live 2026-09-12: GET /proxies/{id} answers with the same record
 * shape as the list endpoint.
 */
export interface ProxyCredentials {
  id: number;
  status: string;
  server: string;
  port: number;
  username: string;
  password: string;
}

export async function fetchProxyCredentials(id: number): Promise<ProxyCredentials | null> {
  const res = await fetch(`https://api.proxy-cheap.com/proxies/${id}`, {
    headers: {
      "X-Api-Key": process.env.PROXYCHEAP_API_KEY!,
      "X-Api-Secret": process.env.PROXYCHEAP_API_SECRET!,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`proxy-cheap HTTP ${res.status}`);
  const p = (await res.json()) as RawProxy & {
    authentication?: { username?: string; password?: string };
  };
  const server = p.connection?.connectIp ?? p.connection?.publicIp ?? "";
  const port = p.connection?.socks5Port ?? p.connection?.httpPort ?? null;
  const username = p.authentication?.username ?? "";
  const password = p.authentication?.password ?? "";
  // A proxy with no endpoint or no credentials cannot be attached to a phone;
  // treat it as unusable rather than handing GeeLark a half-formed config.
  if (!server || !port || !username || !password) return null;
  return { id: p.id, status: p.status, server, port, username, password };
}
