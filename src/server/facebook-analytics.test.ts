import { describe, expect, it } from "vitest";
import { modeFor, parseFacebookLink, reelToRow, weekOf } from "./facebook-analytics";

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
