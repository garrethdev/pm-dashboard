import { describe, expect, it } from "vitest";
import { isTrending, parseMetricool, parseReviews, parseSpotifyTracks, pickClip, songKey, songName, videosPerDay } from "./music-trends-rules";

describe("Metricool's weekly list", () => {
  // Markup as served on 2026-11-18.
  const html = `<h2>Trending TikTok Songs This Week: Nov 16th, 2026</h2>
<h3 id="h-10-v-cut-ghetto-baby-boom" class="wp-block-heading">10) <a href="https://www.tiktok.com/music/V-Cut-7472402932984317953">V-Cut &#8211; Ghetto Baby Boom</a></h3>
<p>text</p><h3 id="h-4" class="wp-block-heading">4) <a href="https://www.tiktok.com/music/Take-Me-To-The-Moon-7644041584786426654">Take Me (To The Moon) &#8211; Ian Asher &amp; D A N N Y</a></h3>
<h3 class="wp-block-heading">How to use trending songs</h3>`;
  it("reads the week, each song and its TikTok sound id", () => {
    const { week, songs } = parseMetricool(html);
    expect(week).toBe("Nov 16th, 2026");
    expect(songs).toEqual([
      { artist: "Ghetto Baby Boom", title: "V-Cut", source: "metricool", clipId: "7472402932984317953" },
      { artist: "Ian Asher & D A N N Y", title: "Take Me (To The Moon)", source: "metricool", clipId: "7644041584786426654" },
    ]);
  });
  it("names a song by its main artist", () => {
    expect(songName("Ian Asher & D A N N Y", "Take Me (To The Moon)")).toBe("Ian Asher - Take Me (To The Moon)");
  });
});

describe("song keys", () => {
  it("treat featured artists, case and punctuation as the same song", () => {
    expect(songKey("Kehlani", "Folded (feat. Someone)")).toBe(songKey("kehlani", "Folded"));
    expect(songKey("Beyoncé", "CUFF IT")).toBe(songKey("Beyoncé, Someone", "Cuff It"));
  });
});

describe("Spotify playlist pages", () => {
  it("skip the tracks Spotify hides", () => {
    const songs = parseSpotifyTracks([
      { __typename: "RestrictedContent" },
      { __typename: "Track", name: "Pink Blush", artists: [{ profile: { name: "Dolly Babe" } }] },
    ]);
    expect(songs).toEqual([{ artist: "Dolly Babe", title: "Pink Blush", source: "spotify", clipId: null }]);
  });
});

describe("finding a song's TikTok sound", () => {
  // Shape of a real keyword search ("Pink Blush Dolly Babe", 2026-11-18).
  const musics = [
    { id_str: "7669898982478318366", title: "original sound - pamelasuereed", author: "Pamela Sue Reed", is_original_sound: true },
    { id_str: "7654996784984754193", title: "Pink Blush", author: "SURYA GHAUL PRANATA", is_original_sound: false },
    { id_str: "7654996784984754193", title: "Pink Blush", author: "SURYA GHAUL PRANATA", is_original_sound: false },
    { id_str: "7689214017718650932", title: "Pink Blush (Remix) [feat. Megan Thee Stallion]", author: "Dolly Babe", is_original_sound: false },
  ];
  it("ignores original sounds and other versions, prefers the right artist", () => {
    expect(pickClip({ artist: "Dolly Babe", title: "Pink Blush" }, musics)?.clipId).toBe("7654996784984754193");
    const withOwn = [...musics, { id_str: "1111111111", title: "Pink Blush", author: "Dolly Babe", is_original_sound: false }];
    expect(pickClip({ artist: "Dolly Babe", title: "Pink Blush" }, withOwn)?.clipId).toBe("1111111111");
  });
  it("finds nothing when no released sound has the title", () => {
    expect(pickClip({ artist: "Nobody", title: "Unknown Song" }, musics)).toBeNull();
  });
});

describe("is it trending?", () => {
  it("measures new videos a day between weekly checks", () => {
    expect(videosPerDay(100_000, "2026-11-10T12:00:00Z", 114_000, "2026-11-17T12:00:00Z")).toBe(2000);
    expect(videosPerDay(100_000, "2026-11-16T12:00:00Z", 114_000, "2026-11-17T12:00:00Z")).toBeNull();
    expect(videosPerDay(null, null, 114_000, "2026-11-17T12:00:00Z")).toBeNull();
  });
  it("lets measured growth decide, and Metricool's top 10 stand in on a first check", () => {
    expect(isTrending(2000, false, 1000)).toBe(true);
    expect(isTrending(400, true, 1000)).toBe(false);
    expect(isTrending(null, true, 1000)).toBe(true);
    expect(isTrending(null, false, 1000)).toBeNull();
  });
});

describe("the AI's review", () => {
  it("reads keep, tags and tempo, and drops what it cannot read", () => {
    const r = parseReviews('Sure: {"results":[{"key":"a - b","keep":true,"reason":"warm","known":false,"vibe_summary":"Soft.","mood_tags":["Warm","dreamy"],"tempo":"Slow","genre":"R&B","era":"2020s"},{"keep":true}]}');
    expect(r.size).toBe(1);
    expect(r.get("a - b")).toMatchObject({ keep: true, known: false, mood_tags: ["warm", "dreamy"], tempo: "slow" });
    expect(parseReviews("no json").size).toBe(0);
  });
});
