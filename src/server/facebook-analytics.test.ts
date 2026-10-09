import { describe, expect, it } from "vitest";
import { modeFor, parseFacebookLink, photoToRow, reelToRow, weekOf } from "./facebook-analytics";

describe("parseFacebookLink", () => {
  it("reads a share link as something to follow", () => {
    expect(parseFacebookLink("https://www.facebook.com/share/r/1FUYTPonU8/?mibextid=wwXIfr")).toEqual({
      kind: "share",
      url: "https://www.facebook.com/share/r/1FUYTPonU8/?mibextid=wwXIfr",
    });
  });
  it("reads where a share link lands as the post id", () => {
    expect(
      parseFacebookLink(
        "https://www.facebook.com/story.php?story_fbid=122115845505296536&id=61588896089516&rdid=x",
      ),
    ).toEqual({ kind: "post", id: "122115845505296536" });
  });
  it("reads a reel link as the video id", () => {
    expect(parseFacebookLink("https://www.facebook.com/reel/1613227306467864/")).toEqual({
      kind: "video",
      id: "1613227306467864",
    });
    expect(parseFacebookLink("https://m.facebook.com/reel/1613227306467864")).toEqual({
      kind: "video",
      id: "1613227306467864",
    });
  });
  it("reads a photo post's scrambled id from its link or where a share lands", () => {
    expect(parseFacebookLink("https://www.facebook.com/NASA/posts/pfbid0iFfHfK3eDq2SEjPdQkny")).toEqual({
      kind: "pfbid",
      id: "pfbid0iFfHfK3eDq2SEjPdQkny",
    });
    expect(
      parseFacebookLink("https://www.facebook.com/permalink.php?story_fbid=pfbid02AbC9xyz&id=61588896089516"),
    ).toEqual({ kind: "pfbid", id: "pfbid02AbC9xyz" });
  });
  it("refuses anything that is not a Facebook link", () => {
    expect(parseFacebookLink("https://www.instagram.com/reel/DeKX9WdIC4M/")).toBeNull();
    expect(parseFacebookLink("not a link")).toBeNull();
    expect(parseFacebookLink(null)).toBeNull();
  });
});

describe("modeFor", () => {
  it("reads in full on TikTok's engine days and lightly on its gap days", () => {
    // 13:45 UTC, when the schedule fires: Sun 10-04 ... Sat 10-10, New York.
    const at = (d: string) => modeFor(new Date(`${d}T13:45:00Z`));
    expect(["2026-10-04", "2026-10-05", "2026-10-07", "2026-10-09"].map(at)).toEqual(["full", "full", "full", "full"]);
    expect(["2026-10-06", "2026-10-08", "2026-10-10"].map(at)).toEqual(["light", "light", "light"]);
  });
});

describe("weekOf", () => {
  it("is the Monday of the week in New York", () => {
    expect(weekOf("2026-10-06T17:58:32.000Z")).toBe("2026-10-05");
    // Monday 02:00 UTC is still Sunday evening in New York.
    expect(weekOf("2026-10-05T02:00:00.000Z")).toBe("2026-09-28");
  });
});

describe("reelToRow", () => {
  it("keeps the views and drops the expiring video link", () => {
    const row = reelToRow(
      "61588896089516",
      {
        post_id: "122115845505296536",
        video_id: "1613227306467864",
        url: "https://www.facebook.com/reel/1613227306467864",
        creation_time: "2026-10-06T17:58:32.000Z",
        view_count: 13,
        description: "Dough. Oil. Stillness.",
      },
      "2026-10-07T13:00:00.000Z",
    );
    expect(row).toMatchObject({ post_id: "122115845505296536", views: 13, format: "video", week_of: "2026-10-05" });
    expect(JSON.stringify(row?.raw_payload)).not.toContain("fbcdn");
  });
  it("skips a reel with no post id", () => {
    expect(reelToRow("x", { video_id: "1" }, "2026-10-07T13:00:00.000Z")).toBeNull();
  });
});

describe("photoToRow", () => {
  const now = "2026-10-09T13:00:00.000Z";
  // Shapes as the posts list returned them on 2026-10-09.
  const carousel = {
    id: "1651314249697278",
    text: "Welcome home!",
    url: "https://www.facebook.com/NASA/posts/pfbid0iFfHfK3eDq2SEjPdQkny",
    videoDetails: {},
    images: ["https://scontent.xx.fbcdn.net/a.jpg", "https://scontent.xx.fbcdn.net/b.jpg"],
    reactionCount: 19584,
    reaction_counts: { like: 19000, love: 584 },
    commentCount: 571,
    creation_time: "2026-10-08T19:55:01.000Z",
  };
  it("keeps a carousel's likes and comments and leaves views empty, not 0", () => {
    const row = photoToRow("NASA", carousel, now);
    expect(row).toMatchObject({
      post_id: "1651314249697278",
      format: "carousel",
      views: null,
      likes: 19584,
      comments: 571,
      total_engagement: 20155,
      week_of: "2026-10-05",
    });
    expect(JSON.stringify(row?.raw_payload)).not.toContain("fbcdn");
  });
  it("calls a single photo a photo", () => {
    expect(photoToRow("NASA", { ...carousel, images: ["https://scontent.xx.fbcdn.net/a.jpg"] }, now)?.format).toBe(
      "photo",
    );
  });
  it("leaves reels to the reels list, and skips posts with no photos", () => {
    const reel = {
      ...carousel,
      url: "https://www.facebook.com/reel/3913006552173650/",
      videoDetails: { id: "3913006552173650" },
    };
    expect(photoToRow("x", reel, now)).toBeNull();
    expect(photoToRow("x", { ...carousel, images: undefined }, now)).toBeNull();
    expect(photoToRow("x", { ...carousel, id: undefined }, now)).toBeNull();
  });
});
