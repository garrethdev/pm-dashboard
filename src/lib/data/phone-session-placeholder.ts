import type { MissingRecording, PhoneSession } from "@/lib/data/phone-sessions";
import type { FrameInfo } from "@/lib/data/phone-session-rules";

/**
 * PLACEHOLDER DATA FOR DRAWING THE SESSIONS PAGE — NOT LIVE DATA.
 *
 * No session has been recorded yet (the Air's recorder is phase 2 of PF-26),
 * so `?demo=` on /sessions and /sessions/[id] draws the page with invented
 * sessions, the way the phone-farm screens were judged before their data
 * existed. The shapes are exactly what the live reads hand back. Frames in
 * the demo have no pictures; the tiles are drawn blank.
 */

const day = (d: number, h: number, m: number) => new Date(Date.UTC(2026, 9, d, h, m)).toISOString();

export const DEMO_SESSIONS: PhoneSession[] = [
  {
    id: 3,
    deviceId: 1,
    deviceName: "Phone 1",
    startedAt: day(21, 15, 2),
    endedAt: day(21, 15, 21),
    status: "stored",
    expectedFrames: 212,
    frameCount: 212,
    storedAt: day(22, 7, 0),
    matchedPost: { id: 91, contentType: "rich_life", doneAt: day(21, 15, 19), username: "maya_journey8", platform: "instagram" },
    reviewedAt: null,
    reviewModel: null,
    reviewSummary: null,
    review: null,
  },
  {
    id: 2,
    deviceId: 2,
    deviceName: "Phone 2",
    startedAt: day(20, 14, 40),
    endedAt: day(20, 15, 4),
    status: "stored",
    expectedFrames: 287,
    frameCount: 287,
    storedAt: day(21, 7, 0),
    matchedPost: { id: 88, contentType: "divorce_recovery", doneAt: day(20, 15, 1), username: "elena.afterhours", platform: "tiktok" },
    reviewedAt: day(21, 9, 12),
    reviewModel: "anthropic/claude-sonnet-4.6",
    reviewSummary:
      "The worker opened TikTok on the expected account, picked the carousel from the camera roll, pasted the caption and posted. Between frames 140 and 180 the screen sat on the Instagram home feed of an account not on this phone for about four minutes.",
    review: {
      summary:
        "The worker opened TikTok on the expected account, picked the carousel from the camera roll, pasted the caption and posted. Between frames 140 and 180 the screen sat on the Instagram home feed of an account not on this phone for about four minutes.",
      postSeen: true,
      timeline: [
        { frame: 3, note: "TikTok opened on elena.afterhours." },
        { frame: 42, note: "Camera roll open, carousel slides selected." },
        { frame: 97, note: "Caption pasted into the post screen." },
        { frame: 121, note: "Post sent; the profile shows the new post." },
        { frame: 140, note: "Instagram opened, a different account's home feed." },
        { frame: 180, note: "Back to the home screen." },
      ],
      anomalies: [
        { frame: 140, severity: "medium", what: "About four minutes on an Instagram account that is not on this phone. Personal use on a farm phone links the accounts." },
        { frame: 97, severity: "low", what: "The caption was pasted without the hashtags the hand-out usually carries; the post screen shows text only." },
      ],
    },
  },
  {
    id: 1,
    deviceId: 1,
    deviceName: "Phone 1",
    startedAt: day(19, 16, 10),
    endedAt: day(19, 16, 24),
    status: "stored",
    expectedFrames: 164,
    frameCount: 164,
    storedAt: day(20, 7, 0),
    matchedPost: null,
    reviewedAt: day(20, 10, 3),
    reviewModel: "anthropic/claude-sonnet-4.6",
    reviewSummary: "A clean session: the worker checked notifications on both accounts, replied to two comments and closed the apps. No post was made and none was expected.",
    review: {
      summary: "A clean session: the worker checked notifications on both accounts, replied to two comments and closed the apps. No post was made and none was expected.",
      postSeen: false,
      timeline: [
        { frame: 2, note: "Instagram notifications on maya_journey8." },
        { frame: 60, note: "Two comment replies typed and sent." },
        { frame: 150, note: "Apps closed, home screen." },
      ],
      anomalies: [],
    },
  },
];

export const DEMO_MISSING: MissingRecording[] = [
  {
    deliveryId: 84,
    deviceId: 2,
    deviceName: "Phone 2",
    username: "elena.afterhours",
    platform: "tiktok",
    contentType: "viral_theories",
    doneAt: day(18, 15, 30),
    reason: "not_plugged_in",
  },
  {
    deliveryId: 86,
    deviceId: 1,
    deviceName: "Phone 1",
    username: "maya_journey8",
    platform: "instagram",
    contentType: "rich_life",
    doneAt: day(17, 14, 55),
    reason: "recorder_missed",
  },
];

/** Blank frames for the demo detail page: one every five seconds or so. */
export function demoFrames(session: PhoneSession): FrameInfo[] {
  const total = Math.min(session.frameCount, 60);
  const span = (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000;
  return Array.from({ length: total }, (_, i) => ({
    path: `demo/${session.id}/${i + 1}`,
    number: i + 1,
    elapsedSec: Math.round((i * span) / Math.max(1, total - 1)),
  }));
}
