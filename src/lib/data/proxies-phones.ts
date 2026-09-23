import { getDevices } from "@/lib/data/devices";
import { proxyForDisplay } from "@/lib/data/device-rules";
import { getProxySubscriptions } from "@/lib/data/proxycheap";
import { getPhoneRentals } from "@/lib/data/textverified";
import type { Platform } from "@/lib/platform";

/**
 * Proxies & numbers for the real phones — design ticket P6, approved
 * 2026-09-23.
 *
 * The Cloud page is built from Geelark's phone list, so a real phone's proxy
 * and numbers appeared nowhere. This is the same join with the phone as the
 * row: the proxy typed on the phone's page matched to a proxy-cheap
 * subscription on address and port, and each account's number matched to a
 * TextVerified rental on its last ten digits — the two joins the Cloud page
 * uses. The numbers were first recorded on the phone (P6); since P14 (Garreth,
 * 2026-09-23) each account holds its own, and the phone is only the row.
 */

export interface PhoneProxySubscription {
  id: number;
  expiresAt: string;
  daysLeft: number;
  autoExtend: boolean;
}

export interface PhoneNumberRow {
  number: string;
  /** The account the number belongs to (P14). */
  account?: PhoneProxyAccount;
  /** null when the number matches no rental — nothing to renew. */
  rental: {
    renewable: boolean;
    includedForRenewal: boolean | null;
    cycleEndsAt: string | null;
    daysLeft: number | null;
  } | null;
}

export interface PhoneProxyAccount {
  handle: string;
  platform: Platform;
}

export interface PhoneProxyRow {
  deviceId: number;
  name: string;
  model: string | null;
  isActive: boolean;
  /** The accounts on this phone. One phone has one proxy, so these are the
   *  accounts sharing it (Garreth, 2026-09-23: list the accounts, not the
   *  characters). */
  accounts: PhoneProxyAccount[];
  /** What was typed on the phone's own page; null if nothing yet. */
  proxyHost: string | null;
  proxyPort: number | null;
  /** null with a proxy set = typed, but proxy-cheap does not know it. */
  subscription: PhoneProxySubscription | null;
  numbers: PhoneNumberRow[];
}

export interface PhoneProxyData {
  rows: PhoneProxyRow[];
  fetchedAt: string;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function last10(num: string): string | null {
  const digits = num.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export async function getPhoneProxyData(): Promise<PhoneProxyData> {
  const [devices, subs, rentals] = await Promise.all([
    getDevices(),
    getProxySubscriptions(),
    getPhoneRentals(),
  ]);

  const subByEndpoint = new Map(subs.data.map((s) => [`${s.ip}:${s.port}`, s]));
  const rentalByNumber = new Map(rentals.data.map((r) => [r.number.slice(-10), r]));

  const rows = devices.data.map<PhoneProxyRow>((d) => {
    // Host and port only: the field may hold the full line with its password.
    const shown = proxyForDisplay(d.proxy);
    const [host, port] = shown ? shown.split(":") : [];
    const sub = shown ? subByEndpoint.get(shown) : undefined;

    return {
      deviceId: d.id,
      name: d.name,
      model: d.model,
      isActive: d.isActive,
      accounts: d.accounts
        .filter((a) => a.isActive)
        .map((a) => ({
          handle: a.username ? `@${a.username}` : (a.profile ?? `Account ${a.id}`),
          platform: a.platform,
        })),
      proxyHost: host || null,
      proxyPort: port && /^\d+$/.test(port) ? Number(port) : null,
      subscription: sub
        ? {
            id: sub.id,
            expiresAt: sub.expiresAt,
            daysLeft: daysUntil(sub.expiresAt) ?? 0,
            autoExtend: sub.autoExtend,
          }
        : null,
      numbers: d.accounts
        .filter((a) => a.isActive && a.phoneNumber)
        .map((a) => {
        const number = a.phoneNumber!;
        const key = last10(number);
        const rental = key ? rentalByNumber.get(key) : undefined;
        return {
          number,
          account: {
            handle: a.username ? `@${a.username}` : (a.profile ?? `Account ${a.id}`),
            platform: a.platform,
          },
          rental: rental
            ? {
                renewable: rental.renewable,
                includedForRenewal: rental.includedForRenewal,
                cycleEndsAt: rental.cycleEndsAt,
                daysLeft: daysUntil(rental.cycleEndsAt),
              }
            : null,
        };
      }),
    };
  });

  return {
    rows,
    fetchedAt: [devices.fetchedAt, subs.fetchedAt, rentals.fetchedAt].sort()[0]!,
  };
}
