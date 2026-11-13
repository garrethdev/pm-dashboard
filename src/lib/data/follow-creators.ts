/**
 * Creators to follow (Garreth, 2026-11-13): the Warmup Upgrade Plan's step Y6.
 *
 * Yurie follows small creators by hand on the farm phones: a few thousand
 * followers or fewer, women sharing their own weight-loss / GLP-1 / midlife
 * journey, who reply to comments. The list is `follow_creators` (filled from
 * ScrapeCreators, see the migration); `creator_follows` records which of our
 * accounts has followed which creator.
 *
 * Why record it at all: so the follows spread across our accounts rather than
 * every account following the same handful, and so the page can show an
 * account's follows today against the plan's limit of 4 a day (Y5), which
 * counts the robot's follows too. The robot's come from `warmup_reports`.
 *
 * Both tables are service-role only, so this runs server-side. Not cached: the
 * page is written to while it is open.
 */

import { ACCOUNT_FK_COL, ACCOUNT_ID_COL, type AccountId } from "@/lib/data/account-id";
import { signStorageUrls } from "@/lib/data/storage-sign";
import { sbFetch, startOfDayET } from "@/lib/data/warmup-sessions";

/** Copies of the creators' profile photos (private; shown through signed links). */
const PHOTO_BUCKET = "creator-photos";

import {
  type CreatorPlatform,
  type FollowBoard,
} from "@/lib/data/follow-creators-rules";

export * from "@/lib/data/follow-creators-rules";

async function read<T>(path: string, what: string): Promise<T> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export async function getFollowBoard(now: Date = new Date()): Promise<FollowBoard> {
  const since = encodeURIComponent(startOfDayET(now).toISOString());

  const [creators, accounts, devices, follows, robot] = await Promise.all([
    read<
      { id: number; platform: CreatorPlatform; handle: string; display_name: string | null; followers: number; photo_path: string | null }[]
    >(
      "follow_creators?select=id,platform,handle,display_name,followers,photo_path&retired_at=is.null&order=followers.asc,id.asc",
      "the creators",
    ),
    // Our accounts on a phone, TikTok and Instagram only: there is no Facebook
    // list. Explicit columns: `accounts` carries passwords.
    read<{ id: string; username: string; platform: string; device_id: number }[]>(
      `accounts?select=${ACCOUNT_ID_COL},username,platform,device_id&device_id=not.is.null&is_active=eq.true&banned_at=is.null&platform=in.(tiktok,instagram)&order=device_id.asc,platform.asc,username.asc`,
      "the accounts",
    ),
    read<{ id: number; name: string }[]>("devices?select=id,name", "the phones"),
    read<{ creator_id: number; account_id: string; followed_at: string }[]>(
      `creator_follows?select=creator_id,${ACCOUNT_FK_COL},followed_at&order=id.asc`,
      "the follows",
    ),
    read<{ account_id: string; follows: number }[]>(
      `warmup_reports?select=${ACCOUNT_FK_COL},follows&started_at=gte.${since}&follows=gt.0`,
      "the robot's follows",
    ),
  ]);

  const photos = await signStorageUrls(
    PHOTO_BUCKET,
    creators.flatMap((c) => (c.photo_path ? [c.photo_path] : [])),
    3600,
  );

  const deviceName = new Map(devices.map((d) => [d.id, d.name]));
  const start = startOfDayET(now).getTime();
  const handToday = new Map<string, number>();
  for (const f of follows) {
    if (new Date(f.followed_at).getTime() >= start) {
      handToday.set(f.account_id, (handToday.get(f.account_id) ?? 0) + 1);
    }
  }
  const robotToday = new Map<string, number>();
  for (const r of robot) robotToday.set(r.account_id, (robotToday.get(r.account_id) ?? 0) + r.follows);

  return {
    creators: creators.map((c) => ({
      id: c.id,
      platform: c.platform,
      handle: c.handle,
      displayName: c.display_name,
      followers: c.followers,
      photoUrl: c.photo_path ? (photos[c.photo_path] ?? null) : null,
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      username: a.username,
      platform: a.platform as CreatorPlatform,
      deviceId: a.device_id,
      deviceName: deviceName.get(a.device_id) ?? `Phone ${a.device_id}`,
      handToday: handToday.get(a.id) ?? 0,
      robotToday: robotToday.get(a.id) ?? 0,
    })),
    follows: follows.map((f) => ({ creatorId: f.creator_id, accountId: f.account_id })),
  };
}

/**
 * Record that one of our accounts followed a creator. A second press for the
 * same pair is a no-op (the pair is unique), so a double tap on a slow phone
 * does not count twice. Refuses a creator and an account on different apps.
 */
export async function recordFollow(creatorId: number, accountId: AccountId): Promise<void> {
  const [creator] = await read<{ platform: string }[]>(`follow_creators?select=platform&id=eq.${creatorId}`, "the creator");
  const [account] = await read<{ platform: string }[]>(`accounts?select=platform&id=eq.${accountId}`, "the account");
  if (!creator || !account) throw new FollowRefusal("No such creator or account");
  if (creator.platform !== account.platform) throw new FollowRefusal("That creator is on a different app from that account");

  const res = await sbFetch("creator_follows?on_conflict=creator_id,account_id", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ creator_id: creatorId, account_id: accountId }),
  });
  if (!res.ok) throw new Error(`Couldn't save the follow (HTTP ${res.status})`);
}

/** Take back a follow ticked by mistake. */
export async function removeFollow(creatorId: number, accountId: AccountId): Promise<void> {
  const res = await sbFetch(`creator_follows?creator_id=eq.${creatorId}&account_id=eq.${accountId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Couldn't take back the follow (HTTP ${res.status})`);
}

export class FollowRefusal extends Error {}
