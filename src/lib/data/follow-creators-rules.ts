/**
 * Shapes and small rules for Creators to follow, kept apart from the server
 * reads in follow-creators.ts so the page's client code can import them.
 */

import type { AccountId } from "@/lib/data/account-id";

/** The plan's limit on follows per account per day, robot included (Y5). */
export const DAILY_FOLLOW_LIMIT = 4;

export type CreatorPlatform = "tiktok" | "instagram";
export const CREATOR_PLATFORMS: CreatorPlatform[] = ["tiktok", "instagram"];

export interface FollowCreator {
  id: number;
  platform: CreatorPlatform;
  handle: string;
  displayName: string | null;
  followers: number;
  /** A signed link to her photo in the `creator-photos` bucket, good for an
   *  hour; null when none was copied (the card shows her initial). */
  photoUrl: string | null;
}

export interface FollowAccount {
  id: AccountId;
  username: string;
  platform: CreatorPlatform;
  deviceId: number;
  deviceName: string;
  /** Follows today, New York day: by hand on this page, and by the robot. */
  handToday: number;
  robotToday: number;
}

export interface CreatorFollow {
  creatorId: number;
  accountId: AccountId;
}

export interface FollowBoard {
  creators: FollowCreator[];
  accounts: FollowAccount[];
  follows: CreatorFollow[];
}

/** The profile page. Tapped on a phone with the app installed, iOS opens it in
 *  the app; on a Mac it opens in the browser. */
export function creatorProfileUrl(platform: CreatorPlatform, handle: string): string {
  return platform === "tiktok"
    ? `https://www.tiktok.com/@${encodeURIComponent(handle)}`
    : `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}
