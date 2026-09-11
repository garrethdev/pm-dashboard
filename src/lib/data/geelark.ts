import { GEELARK_PHONES_TAG, TTL, cachedFetcher } from "@/lib/data/cache";

/**
 * GeeLark OpenAPI — phone list. Parser built from the observed response of
 * POST /open/v1/phone/list on 2026-08-31 (envelope {traceId, code, msg, data},
 * data = {total, page, pageSize, items}).
 */
export interface GeelarkPhone {
  id: string;
  serialName: string; // "Profile 73" — joins accounts.geelark_profile
  groupName: string | null;
  status: number;
  proxy: { type: string; server: string; port: number } | null;
  phoneNumber: string | null; // equipmentInfo.phoneNumber, e.g. "+12832259220"
}

interface RawPhoneItem {
  id: string;
  serialName: string;
  status: number;
  group?: { name?: string } | null;
  proxy?: { type?: string; server?: string; port?: number } | null;
  equipmentInfo?: { phoneNumber?: string } | null;
}

/**
 * A GeeLark call that came back with a non-zero code, carrying that code.
 *
 * The code is the only part worth acting on: a caller has to be able to tell
 * "could not reach the proxy" from "no such phone" without matching on message
 * text, and the replace route has to say which of its two writes failed.
 */
export class GeelarkError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = "GeelarkError";
  }
}

/** Exported so the proxy-replace write path can reach the same envelope
 *  handling rather than re-implementing GeeLark's `code !== 0` convention. */
export async function callGeelark<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`https://openapi.geelark.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GEELARK_BEARER_TOKEN}`,
      traceId: crypto.randomUUID(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`geelark HTTP ${res.status}`);
  const envelope = (await res.json()) as { code: number; msg: string; data: T };
  if (envelope.code !== 0) throw new GeelarkError(envelope.code, envelope.msg);
  return envelope.data;
}

/** Uncached read. The replace route needs the phone's real `id` and its
 *  current proxy at the moment of the write, not a copy up to 15 min old. */
export async function fetchAllPhones(): Promise<GeelarkPhone[]> {
  const phones: GeelarkPhone[] = [];
  let page = 1;
  for (;;) {
    const data = await callGeelark<{ total: number; items: RawPhoneItem[] }>(
      "/open/v1/phone/list",
      { page, pageSize: 100 },
    );
    for (const item of data.items ?? []) {
      phones.push({
        id: item.id,
        serialName: item.serialName,
        groupName: item.group?.name ?? null,
        status: item.status,
        proxy:
          item.proxy?.server && item.proxy.port
            ? {
                type: item.proxy.type ?? "socks5",
                server: item.proxy.server,
                port: item.proxy.port,
              }
            : null,
        phoneNumber: item.equipmentInfo?.phoneNumber ?? null,
      });
    }
    if (phones.length >= data.total || !data.items?.length) break;
    page += 1;
  }
  return phones;
}

export const getGeelarkPhones = cachedFetcher(GEELARK_PHONES_TAG, TTL.external, fetchAllPhones);
