import type { PhoneProxyRow } from "@/lib/data/proxies-phones";

/**
 * PLACEHOLDER DATA FOR THE P6 DESIGN REVIEW — NOT LIVE DATA.
 *
 * Design ticket P6 in `docs/PHONE-FARM-DESIGN-TICKETS.md`: the Physical
 * version of Proxies & numbers, listing real phones rather than Geelark
 * profiles. Drawn with `?demo=1` in Physical. Invented phones, invented
 * addresses, invented numbers; nothing here is read from proxy-cheap or
 * TextVerified.
 *
 * The numbers are recorded ON THE PHONE (Garreth, 2026-09-23), not on the
 * accounts, so a phone row carries its own list.
 *
 * The shape is the live one from `proxies-phones.ts`, so the page draws either
 * without knowing which it was handed.
 */

/** An instant `days` from now, so the countdowns read the same whatever day
 *  the review happens on. */
function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function proxiesPhonePlaceholder(): PhoneProxyRow[] {
  const rows: PhoneProxyRow[] = [
    {
      // The state the ticket exists for: a real phone's proxy about to lapse,
      // with auto-renew off.
      deviceId: 1,
      name: "iPhone 1",
      model: "iPhone 12",
      isActive: true,
      accounts: [
        { handle: "@character2.daily", platform: "instagram" },
        { handle: "@character2.daily", platform: "facebook" },
        { handle: "@character4.notes", platform: "tiktok" },
      ],
      proxyHost: "45.87.212.14",
      proxyPort: 8000,
      subscription: { id: 1, expiresAt: inDays(2), daysLeft: 2, autoExtend: false },
      numbers: [
        {
          number: "+15552013344",
          rental: { renewable: true, includedForRenewal: true, cycleEndsAt: inDays(12), daysLeft: 12 },
        },
        {
          number: "+15552017781",
          rental: { renewable: true, includedForRenewal: false, cycleEndsAt: inDays(3), daysLeft: 3 },
        },
        {
          number: "+15552019902",
          rental: { renewable: true, includedForRenewal: true, cycleEndsAt: inDays(26), daysLeft: 26 },
        },
      ],
    },
    {
      deviceId: 2,
      name: "iPhone 2",
      model: "iPhone 12",
      isActive: true,
      accounts: [
        { handle: "@character5.asmr", platform: "instagram" },
        { handle: "@character5.asmr", platform: "facebook" },
        { handle: "@character2.clips", platform: "tiktok" },
      ],
      proxyHost: "45.87.212.31",
      proxyPort: 8000,
      subscription: { id: 2, expiresAt: inDays(6), daysLeft: 6, autoExtend: true },
      numbers: [
        {
          number: "+15552024410",
          rental: { renewable: true, includedForRenewal: true, cycleEndsAt: inDays(19), daysLeft: 19 },
        },
        {
          // Recorded on the account, but no rental carries it.
          number: "+15552028873",
          rental: null,
        },
      ],
    },
    {
      deviceId: 3,
      name: "iPhone 3",
      model: "iPhone 13",
      isActive: true,
      accounts: [
        { handle: "@character4.lab", platform: "instagram" },
        { handle: "@character4.lab", platform: "facebook" },
      ],
      proxyHost: "45.87.212.58",
      proxyPort: 8000,
      subscription: { id: 3, expiresAt: inDays(41), daysLeft: 41, autoExtend: true },
      numbers: [
        {
          number: "+15552031156",
          rental: { renewable: false, includedForRenewal: null, cycleEndsAt: inDays(9), daysLeft: 9 },
        },
      ],
    },
    {
      // Switched off; its proxy is still being paid for.
      deviceId: 4,
      name: "iPhone 4",
      model: "iPhone 13",
      isActive: false,
      accounts: [{ handle: "@character5.routine", platform: "tiktok" }],
      proxyHost: "91.203.44.7",
      proxyPort: 1080,
      // Typed on the phone, but proxy-cheap has no such proxy.
      subscription: null,
      numbers: [
        {
          number: "+15552045529",
          rental: { renewable: true, includedForRenewal: true, cycleEndsAt: inDays(15), daysLeft: 15 },
        },
      ],
    },
    {
      // Registered this morning: nothing recorded yet.
      deviceId: 5,
      name: "iPhone 5",
      model: "iPhone 13",
      isActive: true,
      accounts: [],
      proxyHost: null,
      proxyPort: null,
      subscription: null,
      numbers: [],
    },
  ];
  // Each number is an account's own (P14), so the invented numbers go to the
  // phone's accounts in order; an account past the last number has none.
  return rows.map((row) => ({
    ...row,
    numbers: row.numbers.map((n, i) => ({ ...n, account: row.accounts[i] })),
  }));
}
