import { GeelarkError, callGeelark } from "@/lib/data/geelark";

/**
 * The two GeeLark writes behind Replace proxy.
 *
 * GeeLark attaches a proxy to a phone in one of two ways, and its own
 * `phone/detail/update` schema is what says so: either a `proxyId` pointing at
 * an entry in the account's proxy library, or a `proxyConfig` typed straight
 * onto the profile. The phone list API returns the *resolved* endpoint either
 * way and carries no proxyId, so the two are indistinguishable once set — which
 * is how Profiles 8, 28 and 29 ended up on proxies that were never in the
 * library (found 2026-09-12, since added).
 *
 * This path always takes the library route: add first, then attach by id. That
 * keeps every proxy in use visible in GeeLark's Proxy tab, so the audit that
 * found that drift can never come up short again.
 */

interface AddProxyResult {
  totalAmount: number;
  successAmount: number;
  failAmount: number;
  successDetails?: { index: number; id: string }[];
  failDetails?: { index: number; code: number; msg: string }[];
}

export interface ProxyConfig {
  scheme: "socks5" | "http" | "https";
  server: string;
  port: number;
  username: string;
  password: string;
}

interface LibraryProxy {
  id: string;
  server: string;
  port: number;
}

/** Page the whole library and return the entry on this endpoint, if any. */
async function findInLibrary(server: string, port: number): Promise<string | null> {
  // pageSize is capped at 100 — 500 is rejected outright — so this pages
  // rather than asking for the lot.
  for (let page = 1, seen = 0; ; page += 1) {
    const data = await callGeelark<{ total: number; list: LibraryProxy[] }>("/open/v1/proxy/list", {
      page,
      pageSize: 100,
    });
    const list = data.list ?? [];
    const hit = list.find((p) => p.server === server && p.port === port);
    if (hit) return hit.id;
    seen += list.length;
    if (!list.length || seen >= data.total) return null;
  }
}

/**
 * Add one proxy to the library and return its GeeLark id.
 *
 * Safe to call for a proxy that is already there — but not for the reason the
 * docs give. They say duplicates "yield identical proxy IDs"; what actually
 * comes back (verified live 2026-09-12) is `code: 0, msg: "success"` at the top
 * level with `successAmount: 0` and a per-item failure 45007 "proxy already
 * exists", and **no id at all**. Trusting the documented behaviour would have
 * failed every swap onto a spare that was already in the library, which is most
 * of them. So a 45007 is resolved by looking the endpoint up instead.
 *
 * Note the shape of that response: the envelope says success while the only
 * item in it failed. Any per-item result from this API has to be read from
 * `failDetails`, never from `code`.
 */
export async function addProxyToLibrary(proxy: ProxyConfig): Promise<string> {
  const data = await callGeelark<AddProxyResult>("/open/v1/proxy/add", { list: [proxy] });

  const id = data.successDetails?.[0]?.id;
  if (id) return id;

  const fail = data.failDetails?.[0];
  if (fail?.code === 45007) {
    const existing = await findInLibrary(proxy.server, proxy.port);
    if (existing) return existing;
    // Already exists but is not in the list: it belongs to another team or is
    // otherwise out of reach, and attaching by id is not possible.
    throw new GeelarkError(45007, "proxy already exists but was not returned");
  }

  // 45004 ("check proxy failed") is the one that matters operationally: it
  // means GeeLark could not reach the proxy, so attaching it would have left
  // the phone with no working connection. Surface its own words.
  // A per-item failure arrives inside a success envelope, so it is re-thrown as
  // a GeelarkError to reach callers as any other coded failure would.
  throw new GeelarkError(fail?.code ?? 0, fail?.msg ?? "no proxy id returned");
}

/**
 * Point a phone at a library proxy.
 *
 * Only `id` and `proxyId` are sent. The endpoint accepts name, remark, group
 * and tags too, and every field left out is left alone — passing them would
 * risk overwriting a profile's name or group on what is meant to be a proxy
 * swap.
 */
export async function setPhoneProxy(phoneId: string, proxyId: string): Promise<void> {
  await callGeelark<unknown>("/open/v1/phone/detail/update", { id: phoneId, proxyId });
}

/**
 * GeeLark's error codes in words an operator can act on.
 *
 * The raw text ("check proxy failed") is written for whoever built the API, and
 * it reached the screen verbatim until 2026-09-12. What someone replacing a
 * proxy needs to know is which thing to go and fix.
 */
export function explainGeelarkError(err: unknown): string {
  const code = err instanceof GeelarkError ? err.code : null;
  switch (code) {
    case 45004:
      return "GeeLark could not connect to that proxy. Check the credentials, or the proxy may be down.";
    case 45003:
      return "GeeLark will not accept a proxy in that location.";
    case 45008:
      return "GeeLark will not accept that kind of proxy.";
    case 45007:
      return "GeeLark already has that proxy but will not hand it back.";
    case 42001:
      return "GeeLark no longer has a phone for this profile.";
    default:
      return err instanceof Error && err.message ? err.message : "GeeLark refused the change.";
  }
}
