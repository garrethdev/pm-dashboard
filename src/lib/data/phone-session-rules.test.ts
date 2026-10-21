import { describe, expect, it } from "vitest";
import {
  elapsedLabel,
  frameInfo,
  framePath,
  matchDelivery,
  postsWithoutRecording,
  sampleEvenly,
  sessionCovers,
  spanMinutes,
} from "@/lib/data/phone-session-rules";

const session = { deviceId: 1, startedAt: "2026-10-21T14:00:00Z", endedAt: "2026-10-21T14:20:00Z" };
const done = (id: number, doneAt: string | null, deviceId: number | null = 1, status = "posted") => ({
  id,
  deviceId,
  status,
  doneAt,
});

describe("sessionCovers", () => {
  it("takes a post marked done during the frames", () => {
    expect(sessionCovers(session, done(1, "2026-10-21T14:10:00Z"))).toBe(true);
  });

  it("allows five minutes before the first frame and thirty after the last", () => {
    expect(sessionCovers(session, done(1, "2026-10-21T13:55:00Z"))).toBe(true);
    expect(sessionCovers(session, done(1, "2026-10-21T13:54:59Z"))).toBe(false);
    expect(sessionCovers(session, done(1, "2026-10-21T14:50:00Z"))).toBe(true);
    expect(sessionCovers(session, done(1, "2026-10-21T14:50:01Z"))).toBe(false);
  });

  it("never matches another phone or a post with no done time", () => {
    expect(sessionCovers(session, done(1, "2026-10-21T14:10:00Z", 2))).toBe(false);
    expect(sessionCovers(session, done(1, null))).toBe(false);
  });
});

describe("matchDelivery", () => {
  it("picks the posted hand-out marked done nearest the session's end", () => {
    const picked = matchDelivery(session, [
      done(1, "2026-10-21T14:02:00Z"),
      done(2, "2026-10-21T14:25:00Z"),
      done(3, "2026-10-21T14:10:00Z", 1, "failed"),
      done(4, "2026-10-21T14:19:00Z", 2),
    ]);
    expect(picked?.id).toBe(2);
  });

  it("is null when nothing was marked done in the window", () => {
    expect(matchDelivery(session, [done(1, "2026-10-21T16:00:00Z")])).toBeNull();
  });
});

describe("postsWithoutRecording", () => {
  const plugs = [{ deviceId: 1, pluggedInAt: "2026-10-21T13:50:00Z", unpluggedAt: "2026-10-21T14:30:00Z" }];

  it("leaves out posts a session covers", () => {
    expect(postsWithoutRecording([done(1, "2026-10-21T14:10:00Z")], [session], plugs)).toEqual([]);
  });

  it("says the recorder missed a post the phone was plugged in for", () => {
    const out = postsWithoutRecording([done(1, "2026-10-21T14:10:00Z")], [], plugs);
    expect(out).toHaveLength(1);
    expect(out[0].reason).toBe("recorder_missed");
  });

  it("says the phone was not plugged in when no span covers the post", () => {
    const out = postsWithoutRecording([done(1, "2026-10-21T18:00:00Z")], [], plugs);
    expect(out[0].reason).toBe("not_plugged_in");
  });

  it("treats an open plug-in span as still plugged in", () => {
    const open = [{ deviceId: 1, pluggedInAt: "2026-10-21T13:50:00Z", unpluggedAt: null }];
    expect(postsWithoutRecording([done(1, "2026-10-21T20:00:00Z")], [], open)[0].reason).toBe("recorder_missed");
  });

  it("skips posts with no phone, no done time, or not posted", () => {
    expect(
      postsWithoutRecording(
        [done(1, "2026-10-21T14:10:00Z", null), done(2, null), done(3, "2026-10-21T14:10:00Z", 1, "skipped")],
        [],
        [],
      ),
    ).toEqual([]);
  });
});

describe("sampleEvenly", () => {
  it("keeps every frame when they fit", () => {
    expect(sampleEvenly(3, 40)).toEqual([0, 1, 2]);
  });

  it("spreads the picks from the first frame to the last", () => {
    const picks = sampleEvenly(300, 40);
    expect(picks).toHaveLength(40);
    expect(picks[0]).toBe(0);
    expect(picks[picks.length - 1]).toBe(299);
    expect([...picks].sort((a, b) => a - b)).toEqual(picks);
  });

  it("handles nothing and one", () => {
    expect(sampleEvenly(0, 40)).toEqual([]);
    expect(sampleEvenly(10, 1)).toEqual([0]);
  });
});

describe("frame paths", () => {
  it("round-trips the number and the elapsed seconds", () => {
    const path = framePath(12, 0, 192.4, "image/jpeg");
    expect(path).toBe("sessions/12/0001-t000192.jpg");
    expect(frameInfo(path)).toEqual({ path, number: 1, elapsedSec: 192 });
  });

  it("falls back to jpg for an unknown type and rejects stray files", () => {
    expect(framePath(1, 4, 0, "text/plain")).toBe("sessions/1/0005-t000000.jpg");
    expect(frameInfo("sessions/1/.emptyFolderPlaceholder")).toBeNull();
  });
});

describe("labels", () => {
  it("formats elapsed time and span minutes", () => {
    expect(elapsedLabel(192)).toBe("3:12");
    expect(elapsedLabel(5)).toBe("0:05");
    expect(elapsedLabel(3785)).toBe("1:03:05");
    expect(spanMinutes(session.startedAt, session.endedAt)).toBe(20);
    expect(spanMinutes(session.endedAt, session.startedAt)).toBe(0);
  });
});
