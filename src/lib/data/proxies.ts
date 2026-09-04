import { getGeelarkPhones } from "@/lib/data/geelark";
import { getPhoneRentals, type PhoneRental } from "@/lib/data/textverified";
import { getProxySubscriptions, type ProxySubscription } from "@/lib/data/proxycheap";

/**
 * Proxies & phones assembly (plan §7): GeeLark phone list is the truth for
 * *assignment*; proxy-cheap for subscription/expiry; TextVerified for phone
 * rentals. Joins observed live on 2026-08-31:
 *   GeeLark proxy.server:port  ⟷  proxy-cheap connection.connectIp:socks5Port
 *   GeeLark equipmentInfo.phoneNumber (last 10 digits)  ⟷  rental.number
 * Character comes from Supabase `accounts` and degrades to null when that
 * upstream is unavailable — never blocks the live-API data.
 */
export interface ProxyPhoneRow {
  profile: string;
  character: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  subscription: {
    id: number;
    status: string;
    expiresAt: string;
    daysLeft: number;
    autoExtend: boolean;
    isp: string | null;
  } | null; // null with proxyHost set = proxy not found in proxy-cheap (bought elsewhere/released)
  phoneNumber: string | null;
  rental: {
    id: string;
    state: string;
    renewable: boolean;
    cycleEndsAt: string | null;
    daysLeft: number | null;
    includedForRenewal: boolean | null;
  } | null;
}

export interface ProxyPhoneData {
  rows: ProxyPhoneRow[];
  orphanSubscriptions: (ProxySubscription & { daysLeft: number })[]; // paying for nothing
  unmatchedRentals: PhoneRental[]; // rentals not tied to any phone
  charactersAvailable: boolean; // false while Supabase is unreachable
  fetchedAt: string;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function last10(num: string | null): string | null {
  const digits = (num ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-10) : null;
}

/** Best-effort character lookup — tolerates Supabase being down. */
async function fetchCharacters(): Promise<Map<string, string> | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/accounts?select=geelark_profile,character&character=like.Character*`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { geelark_profile: string; character: string }[];
    return new Map(rows.map((r) => [r.geelark_profile, r.character]));
  } catch {
    return null;
  }
}

export async function getProxyPhoneData(): Promise<ProxyPhoneData> {
  const [phones, subs, rentals, characters] = await Promise.all([
    getGeelarkPhones(),
    getProxySubscriptions(),
    getPhoneRentals(),
    fetchCharacters(),
  ]);

  const subByEndpoint = new Map(subs.data.map((s) => [`${s.ip}:${s.port}`, s]));
  const rentalByNumber = new Map(rentals.data.map((r) => [r.number.slice(-10), r]));

  const usedSubs = new Set<number>();
  const usedRentals = new Set<string>();

  const rows: ProxyPhoneRow[] = phones.data.map((phone) => {
    const endpoint = phone.proxy ? `${phone.proxy.server}:${phone.proxy.port}` : null;
    const sub = endpoint ? (subByEndpoint.get(endpoint) ?? null) : null;
    if (sub) usedSubs.add(sub.id);

    const numberKey = last10(phone.phoneNumber);
    const rental = numberKey ? (rentalByNumber.get(numberKey) ?? null) : null;
    if (rental) usedRentals.add(rental.id);

    return {
      profile: phone.serialName,
      character: characters?.get(phone.serialName) ?? null,
      proxyHost: phone.proxy?.server ?? null,
      proxyPort: phone.proxy?.port ?? null,
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            expiresAt: sub.expiresAt,
            daysLeft: daysUntil(sub.expiresAt) ?? 0,
            autoExtend: sub.autoExtend,
            isp: sub.isp,
          }
        : null,
      phoneNumber: phone.phoneNumber,
      rental: rental
        ? {
            id: rental.id,
            state: rental.state,
            renewable: rental.renewable,
            cycleEndsAt: rental.cycleEndsAt,
            daysLeft: daysUntil(rental.cycleEndsAt),
            includedForRenewal: rental.includedForRenewal,
          }
        : null,
    };
  });

  // Sort: soonest proxy expiry first; rows without a subscription (orphan
  // phone-side) surface at the top since they need eyes too.
  rows.sort((a, b) => {
    const da = a.subscription?.daysLeft ?? (a.proxyHost ? -1 : 999);
    const db = b.subscription?.daysLeft ?? (b.proxyHost ? -1 : 999);
    return da - db;
  });

  const fetchedAt = [phones.fetchedAt, subs.fetchedAt, rentals.fetchedAt].sort()[0];

  return {
    rows,
    orphanSubscriptions: subs.data
      .filter((s) => !usedSubs.has(s.id))
      .map((s) => ({ ...s, daysLeft: daysUntil(s.expiresAt) ?? 0 })),
    unmatchedRentals: rentals.data.filter((r) => !usedRentals.has(r.id)),
    charactersAvailable: characters !== null,
    fetchedAt,
  };
}
