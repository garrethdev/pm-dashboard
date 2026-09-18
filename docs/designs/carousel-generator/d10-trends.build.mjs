#!/usr/bin/env node
/*
 * D10 · Trends — the library's carousels as a feed to scroll, search and save
 * from, with the daily study digest and the knowledge base behind it.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D10). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen.
 *
 * Round two (Garreth, 2026-09-17): the page became feed-and-search centric.
 * Three sections, chosen from a rail of buttons on the left of the page (a
 * floating bar at the foot of the screen on the phone), and a search bar
 * centred over the feed on every one of them:
 *
 *   Feed            the default. Carousels the library scraped from other
 *                   creators, never our own, one under another the way a
 *                   social feed reads, best-scored first. Each is who posted
 *                   it, the slides, the numbers, Copy to Studio and Save,
 *                   and the hook
 *   Digests         as approved on 2026-09-16: the digests newest first down
 *                   a narrow column, the open one beside them, its rules and
 *                   the carousels it read
 *   Knowledge       as approved: pending rules with Accept and Reject, then
 *                   the accepted ones, filtered by type and confidence
 *
 * One search box finds creators and carousels alike. Nothing happens until
 * Enter (a hybrid search is a round trip that can take seconds); the results
 * then replace the feed in place, accounts that match above the carousels,
 * and Clear brings the feed back. An account opens as that creator's
 * carousels.
 *
 * Garreth's first review of round two (2026-09-17) set the shape:
 *  - **The card is Instagram's feed post**, on both sizes: a header row with
 *    the platform mark, the handle and the date, a muted second line for the
 *    topic tags, and the one lit button — Use as reference — at the right
 *    where Follow sits; the image at 4:5 with dots under it; an icon row with
 *    Open source at the left and Save at the right; the numbers; the hook as
 *    the caption. Posts sit in a centred column with a divider between them,
 *    no card box.
 *  - **No chip row.** No filter by type, no Saved chip: the feed is one list.
 *    The honest label "Trending in the library" survives as a small caption
 *    over the first post. Save on a post stays; where a person finds what
 *    they saved is an open question for Garreth (recorded in the ticket).
 *  - **The sections are a rail on the left**, not underline tabs, and on the
 *    phone a floating bar at the bottom of the screen.
 *  - **The search bar is centred over the feed**; on the phone it sits beside
 *    the title on the same row.
 *
 * Garreth's second review (2026-09-17) tightened it:
 *  - **Saved has a home.** A fourth section, Saved, on the rail and the
 *    phone's bar: the saved posts in the feed's layout, newest saved first.
 *    On the desktop a Recent saves panel sits to the right of the feed with
 *    the last five saves as horizontal cards (thumbnail at the left, the
 *    handle, views and likes) and a View all saves button. The phone has no
 *    panel.
 *  - **No share button on a post.** The icon row is the numbers at the left
 *    and, together at the right, **Copy to Studio** (the lit button, renamed
 *    from Use as reference) and Save. The handle and the caption sit right
 *    under it.
 *  - **One search box, as wide as the posts, no scope switch.** One query
 *    searches creators and carousels together; accounts that match show
 *    above the carousel results.
 *  - **No "Trending in the library" line, and no counts** on the rail or the
 *    phone's bar.
 *
 * Garreth's third review (2026-09-17):
 *  - **Only the posts scroll.** The title and the search bar, the rail and
 *    the Recent saves panel stay put; the column of posts is the one thing
 *    that moves (the phone's bar already did).
 *  - **More air under the search bar**, and the posts and the bar a little
 *    wider (500px).
 *  - **Copy to Studio is not the accent.** A grey outline, no fill, the
 *    text and the icon in the ordinary text colour. Nothing on the feed is
 *    lit; the accent stays with Analyse on the Digests section.
 *  - The column of posts is centred between the rail and the panel, so the
 *    gap on each side of the posts is the same.
 *
 * Garreth's fourth review (2026-09-17):
 *  - **The slides swipe sideways on the desktop too**: the slide area is a
 *    track that snaps slide to slide, so a trackpad swipe pages it the way
 *    a thumb does on the phone. The dots and the arrows still page it.
 *  - **View Post**, a quiet outline button at the top right of every post,
 *    opposite the handle, opens the post on its platform.
 *  - **"Knowledge base" is now "Knowledge"** on the rail and the bar.
 *  - **Carousel search results are a grid**, three tiles across, each the
 *    slide that matched with a small carousel mark, the way Instagram's
 *    search lays posts out; accounts that match still sit above it in a
 *    list. Pressing a tile opens that post alone in the column, with the
 *    way back to the results.
 *  - Then: the Recent saves panel tightened, with a rule under its title,
 *    and the Clear button dropped from the results line (the X on the
 *    search bar clears). And the feed's scroller spans the whole section, so
 *    a wheel over the empty space either side of the posts scrolls it.
 *
 * Round three (Garreth, 2026-09-18), after the developer handover's frontend
 * addendum of 2026-09-17 was read against the page. Dark first; light follows
 * his approval (R3_LIGHT in build()).
 *  - **The search bar gains a search-type picker and a filter button.** The
 *    picker sits inside the bar at its right (Meaning, Exact words, How it's
 *    built, How it looks, Comments: the handover's five channels in plain
 *    words); the filter button sits just outside it and opens a panel of a
 *    short set of the handover's filters (topic, hook style, visual style,
 *    views, standout posts only) with Clear all and Apply. On the phone the
 *    panel is a sheet and carries the search type too. This reverses "no
 *    scope pills, no chips" from the second review of round two.
 *  - **A post opens in a details window**, not alone in the column: slides at
 *    the left, swipeable, an X at the upper right; at the right who posted
 *    it and two tabs. Details is the numbers, when it was posted, the
 *    platform, the caption. Analysis is the words on each slide and the
 *    model's reading, shown at once when the library holds them, and a
 *    Transcribe and analyse button when it does not, which fills the tab in
 *    as the slides are read and keeps the result on the carousel. The one
 *    window opens from a results tile, from View Details on a post, and from
 *    a Recent saves row. It replaces the "tile opened alone" board.
 *  - **Useful and not useful** are a thumb up and a thumb down, on every post
 *    and in the window.
 *  - **On a post, View Details takes Save's place**; Save lives in the window.
 *    The numbers move to a line of their own under the buttons, the way a
 *    social post reads.
 *  - From the handover: a search on its way and a search that timed out each
 *    have a board; a number the library does not hold is left off a post and
 *    reads Unknown in the window, never 0; a slide with no words says so; and
 *    a full page of results reads "The 25 best matches", never a total.
 *
 * Decisions carried from earlier in round two:
 *  - Save is quiet (and, from the third review, so is Copy to Studio).
 *  - **Recreate this is now called Use as reference**, on the feed and on a
 *    digest's carousels alike: same action, same destination (D6's reference
 *    variant), so one name.
 *  - **"Trending in the library" is the honest label.** Trending in v1 is a
 *    ranking of what the library holds (score, then views), not what is rising
 *    on TikTok this week: the catalogue carries no post dates yet.
 *  - **Carousels only.** Videos stay filtered out of the feed as they are of a
 *    digest (Garreth, 2026-09-16 and again 2026-09-17).
 *  - **A slide whose link has died says "Image gone" and the post stays**, with
 *    its text and its buttons, as the developer handover asks.
 *  - Analyse stays the only accent on the Digests section, and only on the
 *    newest digest nothing has been run on; Accept and Reject stay on the
 *    Knowledge base; a state is words before it is a colour (all 2026-09-16).
 *
 * The Studio that Copy to Studio opens is D6's own screen, down to the "Not
 * analysed in Trends" pill on its dashed frame. One board of it sits on this
 * canvas so the hand-off can be seen without opening D6's.
 *
 * Sample content only: invented handles whose links go nowhere, invented
 * hooks and numbers, D1's invented carousel types, and the same reference
 * decks D6 keeps (it names them "as Trends (D10) would keep them"), so a
 * person moving between the two screens sees the same titles. Photos are bank
 * shots from the Supabase image store, downsampled, named d10-*.
 *
 * Run directly, it writes D10's review artboards and canvas.json:
 *   Main.dc.html            desktop 1440×900, the feed, top of it
 *   Paged.dc.html           desktop, a post on its third slide, arrows showing, saved
 *   ImageGone.dc.html       desktop, a slide whose link has died
 *   More.dc.html            desktop, taller than a screen: the next twenty loading
 *   End.dc.html             desktop, taller than a screen: the end of the library
 *   Search.dc.html          desktop, carousels found for a search
 *   Accounts.dc.html        desktop, accounts found for a search
 *   Creator.dc.html         desktop, one creator's carousels
 *   NoMatches.dc.html       desktop, a search that found nothing
 *   Studio.dc.html          desktop, D6's Studio where Copy to Studio lands
 *   Saved.dc.html           desktop, the Saved section, newest saved first
 *   NothingSaved.dc.html    desktop, the feed with nothing saved yet
 *   PhoneSaved.dc.html      phone, the Saved section
 *   Digests.dc.html         desktop, the newest digest, not analysed
 *   Analysed.dc.html        desktop, an analysed digest, every digest analysed
 *   Queued.dc.html          desktop, two links still waiting, Analyse again
 *   Failed.dc.html          desktop, the analysis failed, Retry
 *   FirstRun.dc.html        desktop, no digests yet
 *   Knowledge.dc.html       desktop, pending rules with Accept and Reject
 *   NothingPending.dc.html  desktop, nothing pending
 *   PhoneFeed.dc.html       phone 390×844, the feed
 *   PhoneSearch.dc.html     phone, carousels found for a search
 *   PhoneDigest.dc.html     phone, an analysed digest
 *   PhoneKnowledge.dc.html  phone, the knowledge base
 * Imported, `trendsScreen()` is the screen prototype.build.mjs opens.
 *
 *   node docs/designs/carousel-generator/d10-trends.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";
import { studioScreen } from "./d6-studio.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-trends";

const D10I = {
  spark: icon("Sparkle", 14),
  caretDown: icon("CaretDown", 14, "bold"),
  check: icon("Check", 14, "bold"),
  checkSm: icon("Check", 12, "bold"),
  x: icon("X", 12, "bold"),
  xSm: icon("X", 14, "bold"),
  retry: icon("ArrowsClockwise", 12, "bold"),
  clock: icon("Clock", 12),
  warn: icon("WarningCircle", 12),
  tiktok: icon("TiktokLogo", 14),
  instagram: icon("InstagramLogo", 14),
  tiktokLg: icon("TiktokLogo", 16),
  instagramLg: icon("InstagramLogo", 16),
  trend: icon("TrendUp", 24),
  quotes: icon("Quotes", 12),
  search: icon("MagnifyingGlass", 14, "bold"),
  bookmark: icon("BookmarkSimple", 22, "regular"),
  bookmarkOn: icon("BookmarkSimple", 22, "fill"),
  studio: icon("PaintBrushBroad", 14),
  cards: icon("Cards", 14),
  savedRail: icon("BookmarkSimple", 16),
  savedRailLg: icon("BookmarkSimple", 20),
  prev: icon("CaretLeft", 16, "bold"),
  next: icon("CaretRight", 16, "bold"),
  broken: icon("ImageBroken", 22, "regular"),
  caret: icon("CaretRight", 14, "bold"),
  feed: icon("Rows", 16),
  digests: icon("EnvelopeSimple", 16),
  knowledge: icon("BookOpen", 16),
  feedLg: icon("Rows", 20),
  digestsLg: icon("EnvelopeSimple", 20),
  knowledgeLg: icon("BookOpen", 20),
  /* Round three (2026-09-18): the filter button, the votes, the details window. */
  filter: icon("SlidersHorizontal", 16, "bold"),
  up: icon("ThumbsUp", 20, "regular"),
  upOn: icon("ThumbsUp", 20, "fill"),
  down: icon("ThumbsDown", 20, "regular"),
  downOn: icon("ThumbsDown", 20, "fill"),
  close: icon("X", 16, "bold"),
  text: icon("TextAa", 24),
  link: icon("ArrowSquareOut", 14),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* D1's invented carousel types, so the rules point at names seen elsewhere. */
const TYPES = [
  { id: "morning", name: "Morning Routine" },
  { id: "myth", name: "Myth vs Fact" },
  { id: "before", name: "Before & After" },
  { id: "day", name: "Day in the Life" },
  { id: "quiet", name: "Quiet Luxury Picks" },
];

/*
 * The feed. Invented handles and hooks; the numbers are made up. The first
 * and last are D6's saved reference decks ("Skincare myths, calm and plain",
 * "Water before coffee"), so the deck a person sends to the Studio from here
 * is a deck the Studio already knows. `date` is null where the catalogue has
 * no post date, which today is most of it: the post then shows no date rather
 * than a guess.
 */
const FEED = [
  {
    id: "f1",
    net: "tiktok",
    handle: "@sample.handle",
    hook: "The skincare myth that keeps winning is the one you already believe",
    views: "24.3k",
    likes: "1.2k",
    saves: "108",
    date: "Sep 12",
    slides: ["vanity", "shower", "journal", "mug", "oats", "serum", "bath"],
    tags: ["Skincare", "Myth first"],
  },
  {
    id: "f2",
    net: "instagram",
    handle: "@another.sample",
    hook: "6am walk, no phone, and what my skin did by Friday",
    views: "118k",
    likes: "9.4k",
    saves: "2.1k",
    date: "Sep 11",
    slides: ["dock", "yoga", "mug", "oats", "journal", "shower", "vanity", "shoes"],
    tags: ["Day in the life", "Routine"],
  },
  {
    id: "f3",
    net: "tiktok",
    handle: "@calm.skin.notes",
    hook: "Nine words on the cover, and the number waits for slide two",
    views: "412k",
    likes: "31k",
    saves: "8.8k",
    date: null,
    slides: ["mug", "journal", "oats", "vanity", "shower"],
    tags: ["Morning routine", "Number on two"],
  },
  {
    id: "f4",
    net: "tiktok",
    handle: "@the.eye.edit",
    hook: "My under-eyes last year against now, and the one thing I stopped doing",
    views: "1.2M",
    likes: "96k",
    saves: "27k",
    date: null,
    slides: ["serum", "vanity", "bath", "shower", "journal", "mug"],
    tags: ["Eye care", "Before and after"],
    caption:
      "My under-eyes last year against now, and the one thing I stopped doing. It was never the serum. Eight weeks, same shelf, one habit gone. Routine in the next post. #eyecare #undereyes #skincareroutine",
  },
  {
    id: "f5",
    net: "instagram",
    handle: "@quiet.shelf",
    hook: "Five things on the shelf that cost less than the serum",
    views: "58k",
    likes: "4.1k",
    saves: null,
    date: null,
    slides: ["shoes", "vanity", "journal", "dock", "oats"],
    tags: ["Quiet luxury", "List"],
  },
  {
    id: "f6",
    net: "tiktok",
    handle: "@third.sample",
    hook: "Water before coffee, for thirty days",
    views: "9.8k",
    likes: "640",
    saves: "41",
    date: "Sep 2",
    slides: ["mug", "oats", "vanity", "shower", "dock"],
    tags: ["Morning routine"],
  },
];

/* What a carousel search finds: which posts, and the slide each one matched on. */
const SEARCH = {
  q: "under-eye serum",
  total: 14,
  hits: [
    { id: "f4", slide: 3 },
    { id: "f1", slide: 6 },
    { id: "f5", slide: 2 },
    { id: "f3", slide: 1 },
    { id: "f2", slide: 5 },
    { id: "f6", slide: 3 },
  ],
};
const NO_MATCH_Q = "peptide gummies";

/* A search that also matches creators: the accounts show above the carousels
   it found. Invented handles. */
const ACCOUNTS = {
  q: "ari",
  rows: [
    { id: "c1", net: "tiktok", handle: "@arielle.skin", decks: 38, top: "17.9M" },
    { id: "c2", net: "instagram", handle: "@aria.mornings", decks: 12, top: "412k" },
    { id: "c3", net: "tiktok", handle: "@marina.glow", decks: 5, top: "96k" },
  ],
  total: 12,
  hits: [
    { id: "f3", slide: 1 },
    { id: "f5", slide: 2 },
  ],
};
/* One creator's carousels: the feed's posts under that handle. */
const CREATOR = { handle: "@arielle.skin", net: "tiktok", decks: 38, cards: ["f3", "f4", "f1"] };

/*
 * Round three (Garreth, 2026-09-18). How a search reads the library: the
 * handover's five channels, in plain words. Meaning is the default.
 */
const CHANNELS = [
  { id: "meaning", label: "Meaning" },
  { id: "literal", label: "Exact words" },
  { id: "construction", label: "How it\u2019s built" },
  { id: "visual", label: "How it looks" },
  { id: "comments", label: "Comments" },
];

/*
 * The filter panel, redrawn against the live library (Garreth, 2026-09-18).
 * Three filters, each a dropdown that starts on Any and takes one value:
 *   Topic   the one filter search_carousel_library has built in (p_topic, one
 *           value, matched against the search documents' topics). The names
 *           are the library's own seven common topics; the analysis picks
 *           from a fixed list, so they do not drift
 *   Hook    reference_analysis.hook_family, its six common values (the field
 *           is free text, 189 values in all, so the list is a fixed short one)
 *   Views   references_unified.views, which every carousel has
 * Visual style is gone (614 values over 835 carousels: a list cannot hold it;
 * "How it looks" searches it in words instead), and so is Standout posts only
 * (4 carousels marked, of 309 scored) until the scoring covers the library.
 */
const FILTERS = [
  { id: "topic", label: "Topic", opts: ["Any topic", "Wellness", "Skincare", "Lifestyle", "Weight loss", "Eye care", "Peptides", "GLP-1"] },
  { id: "hook", label: "Hook style", opts: ["Any hook", "Outcome preview", "Information gap", "List", "Recognition", "Question", "Contradiction"] },
  { id: "views", label: "Views", opts: ["Any views", "10k and over", "100k and over", "1M and over"] },
];

/*
 * What the library's analysis holds on a post, shaped like the live tables
 * (read 2026-09-18), so the tab is drawn from what is really there:
 *   beats   reference_beats, one a slide: visible_copy (the words, empty on
 *           about 300 of 6,461 slides, and the screen then says so rather than
 *           inventing copy), narrative_role (on every slide) and
 *           visual_description (on nearly every one)
 *   tags    reference_analysis's short values: topic, angle, hook_family,
 *           emotional_tone, visual_style. They are stored as code words
 *           ("outcome_preview"); the screen shows them in plain words
 *   notes   its sentences: opener_treatment, proof_placement, cta_structure
 *   status  its inspection_status: complete (977), partial (167), blocked (24)
 * A row the library has nothing for is left out, never shown blank: topic is
 * missing on about 300 analyses, angle, tone and look on about 330.
 * More of it sits in reference_analysis.inferred (835 carousels): the hook's
 * mechanism, story_structure, the payoff and its slide, the first product and
 * first call-to-action slides, a reusable_pattern (what to keep, and its
 * limits) and an audience_response read from the comments (themes, questions,
 * or a note that the sample was too small). The strength scores are in
 * reference_format_evaluations (309 carousels) and are not drawn. Invented,
 * like the rest.
 */
const ANALYSIS = {
  f4: {
    status: "complete",
    read: "Sep 14",
    beats: [
      { copy: "My under-eyes last year vs now", role: "Setup", visual: "Two close portraits side by side, the same woman a year apart, soft daylight" },
      { copy: "I tried every serum on the shelf", role: "Problem", visual: "Six small bottles lined up on a marble shelf" },
      { copy: "The under-eye serum was never the problem", role: "Turn", visual: "Two amber dropper bottles on a folded white towel beside a jade stone" },
      { copy: "", role: "Proof", visual: "A close portrait with no caption, looking straight at the camera" },
      { copy: "I stopped rubbing my eyes dry after the shower", role: "Payoff", visual: "A hand pressing a towel to a cheek, steam on the mirror behind" },
      { copy: "Eight weeks. Same serum. Follow for the routine", role: "Call to action", visual: "A notebook open on a desk, a pen across it" },
    ],
    tags: [
      { k: "Topic", v: "Eye care" },
      { k: "Angle", v: "Before and after" },
      { k: "Hook", v: "Outcome preview" },
      { k: "Story", v: "Problem, turn, payoff" },
      { k: "Tone", v: "Confessional" },
      { k: "Look", v: "Close portrait with text overlay" },
      { k: "Product", v: "First shown on slide 3" },
    ],
    notes: [
      { k: "Why it hooks", v: "The cover shows the result before it says anything, so the reader stays to find out what changed." },
      { k: "Opener", v: "Two portraits a year apart under a plain caption that promises a change and holds back what caused it." },
      { k: "Payoff", v: "Slide 5. The one habit she dropped, named in a single line." },
      { k: "Proof", v: "Her own before and after photos. Source imagery observed; the outcome is not independently checked." },
      { k: "Call to action", v: "Slide 6. Asks for a follow and points to the routine in the next post." },
    ],
    keep: ["A result on the cover, the cause held back", "One idea a slide, in a caption bar low on the photo", "The fix is a habit dropped, not a product bought", "The ask comes last, after the payoff"],
    limits: ["Needs a real before and after that reads at a glance", "Works for one change; a list of five would lose the turn"],
    themes: ["Asking which serum", "Doubt that a habit alone did it", "Sharing their own under-eye routine"],
    questions: ["How long before you saw a difference?", "Do you still use the serum?"],
  },
};
/* The newer run (phase0-multiformat-v1, 309 carousels) records less: the
   hook, the story and the call to action, and none of topic, angle, tone,
   look, opener or proof. The tab then simply has fewer rows. */
const ANALYSIS_THIN = { tags: ["Hook", "Story"], notes: ["Call to action"] };
/* A part-read deck (167 of them): every row of the analysis is there, because
   the model read what it was given; what is short is the slides it could
   fetch. So the label says Partial and the transcription says how many. */
const ANALYSIS_PART = { slides: 4 };
/* In the prototype any post can be opened, not only the one the boards open,
   so a post with no analysis written out above borrows this one: its own
   topic and hook tags, and the rest general enough to sit under any deck.
   Invented, like the rest. No review board draws it: the boards that show a
   finished analysis all open f4. */
const ANALYSIS_ANY = {
  tags: [
    { k: "Angle", v: "Personal story" },
    { k: "Story", v: "Setup, turn, payoff" },
    { k: "Tone", v: "Plain and direct" },
    { k: "Look", v: "Photo with a caption bar" },
  ],
  notes: [
    { k: "Why it hooks", v: "The cover makes a claim the reader half believes already, so they stay to see it argued." },
    { k: "Opener", v: "One photo and one line that names the subject and holds back the answer." },
    { k: "Payoff", v: "Near the end. One line that says what changed." },
    { k: "Proof", v: "Her own photos. Source imagery observed; the outcome is not independently checked." },
    { k: "Call to action", v: "The last slide. Asks for a save." },
  ],
  keep: ["A claim on the cover, the answer held back", "One idea a slide, in a caption bar low on the photo", "The ask comes last, after the payoff"],
  limits: ["Leans on photos that read at a glance", "Works for one idea; a list would lose the turn"],
  themes: ["Asking what she uses", "Sharing their own routine"],
  questions: ["How long did it take?"],
};
const ANALYSIS_POOL = [
  { copy: "Here is what nobody tells you", role: "Setup", visual: "A person at a bathroom mirror, products along the counter" },
  { copy: "I did this for thirty days", role: "Problem", visual: "A hand holding a small bottle up to the light" },
  { copy: "", role: "Proof", visual: "A flat lay of a towel, a mug and a notebook" },
  { copy: "The part that surprised me", role: "Turn", visual: "A close portrait in window light" },
  { copy: "What I would do again", role: "Payoff", visual: "A shelf of products, one pulled forward" },
  { copy: "Save this for later", role: "Call to action", visual: "A notebook page with a short list" },
];

/*
 * The digest body. Invented: the links go nowhere and the numbers are made up.
 * `link: true` marks a line the analysis would pull out — every TikTok and
 * Instagram address in the body (F12 step 2). One line is deliberately long,
 * to see what the reading column does with a sentence that will not fit.
 */
const BODY = [
  { text: "Good morning. Eleven posts worth a look from the last day." },
  {
    text:
      "Skincare myths keep winning when the myth itself is the hook rather than the fix, and the one that went furthest yesterday opened on a line most people believe before it corrected anything at all.",
  },
  { text: "tiktok.com/@sample.handle/video/7412008451", link: true },
  { text: "Two more did the same with sleep and with sunscreen." },
  { text: "instagram.com/p/C9sampleAbc12/", link: true },
  { text: "tiktok.com/@another.sample/video/7411884003", link: true },
  {
    text:
      "Morning routines are flat this week except where a number lands on slide two rather than slide one. The three that did are all above 40k.",
  },
  { text: "tiktok.com/@third.sample/video/7411640887", link: true },
  { text: "Nothing new in the before-and-after lane; the top three are reposts of last month's." },
];

/*
 * The digests, newest first. `decks` counts the carousels in the body, not its
 * links: the videos are filtered out (Garreth, 2026-09-16), so counting links
 * would promise posts the screen never shows.
 * `state` is what the second line in the list says:
 *   new       nothing has been run on it yet — the one Analyse sits on
 *   queued    analysed, but links it cited are still with the outside worker
 *   failed    the analysis call failed
 *   done      analysed, nothing outstanding
 */
const DIGESTS = [
  { id: "g16", date: "Sep 16", when: "Sep 16, 6:02am", decks: 3, state: "new" },
  { id: "g15", date: "Sep 15", when: "Sep 15, 6:04am", decks: 4, state: "queued", queued: 2, analysed: "6:31am" },
  { id: "g14", date: "Sep 14", when: "Sep 14, 6:01am", decks: 3, state: "done", analysed: "9:14am" },
  { id: "g13", date: "Sep 13", when: "Sep 13, 6:03am", decks: 2, state: "failed" },
  { id: "g12", date: "Sep 12", when: "Sep 12, 6:02am", decks: 5, state: "done", analysed: "6:28am" },
  { id: "g11", date: "Sep 11", when: "Sep 11, 6:00am", decks: 3, state: "done", analysed: "6:25am" },
  { id: "g10", date: "Sep 10", when: "Sep 10, 6:05am", decks: 4, state: "done", analysed: "6:33am" },
];

/*
 * What an analysis proposes: the rule, the lines from the digest it rests on,
 * a confidence, and the carousel types it applies to. Invented, in the plain
 * voice the knowledge base already uses.
 */
const RULES = [
  {
    id: "r1",
    text: "Open on the belief, not on the correction.",
    evidence: [
      "the one that went furthest yesterday opened on a line most people believe",
      "Two more did the same with sleep and with sunscreen.",
    ],
    conf: 0.86,
    types: ["myth", "before"],
    from: "Sep 16",
  },
  {
    id: "r2",
    text: "Put the first number on slide two, never slide one.",
    evidence: ["except where a number lands on slide two rather than slide one", "The three that did are all above 40k."],
    conf: 0.71,
    types: ["morning", "day"],
    from: "Sep 16",
  },
  {
    id: "r3",
    text: "A reposted before-and-after does not carry a second time.",
    evidence: ["the top three are reposts of last month's"],
    conf: 0.42,
    types: ["before"],
    from: "Sep 16",
  },
];

/* A fourth rule, proposed by an earlier digest and still waiting. */
const OLDER_RULE = {
  id: "r0",
  text: "Keep the hook to nine words or fewer.",
  evidence: ["every deck over nine words on the cover fell below its lane's median"],
  conf: 0.79,
  types: ["morning", "myth", "before", "day", "quiet"],
  from: "Sep 12",
};

/* Rules already accepted. The count is the live table's size; the rows are invented. */
const ACCEPTED = [
  { id: "a1", text: "One idea a slide, and the slide says which one.", conf: 0.94, types: ["morning", "myth", "before", "day", "quiet"], from: "Sep 9", on: "Sep 9" },
  { id: "a2", text: "A face on the cover beats a product on the cover.", conf: 0.88, types: ["morning", "day"], from: "Sep 6", on: "Sep 7" },
  { id: "a3", text: "Name the peptide once, and not on the first slide.", conf: 0.83, types: ["myth", "before"], from: "Sep 4", on: "Sep 4" },
  { id: "a4", text: "End on what to do next, not on what was proved.", conf: 0.8, types: ["myth", "day"], from: "Aug 30", on: "Aug 31" },
];
const ACCEPTED_TOTAL = 121;

/*
 * The carousels a digest's analysis drew on.
 *
 * **Videos are ignored** (Garreth, 2026-09-16): this app makes carousels, so a
 * digest's video links are filtered out rather than shown. The body still
 * carries them, because the body is the email that arrived — which is why the
 * digest's own count is of carousels, not of links.
 *
 * The titles and figures are D6's saved reference decks, which its own file
 * calls "as Trends (D10) would keep them", so the deck a person sends to the
 * Studio here is the deck they meet there. A carousel still with the outside
 * worker has no slides yet, and says when it went into the queue.
 */
const POSTS = [
  {
    id: "p1",
    net: "tiktok",
    handle: "@sample.handle",
    title: "Skincare myths, calm and plain",
    meta: "7 slides · 24.3k · Sep 12",
    slides: ["vanity", "shower", "journal", "mug", "oats"],
  },
  {
    id: "p2",
    net: "instagram",
    handle: "@another.sample",
    title: "Sunrise walk, day in the life",
    meta: "8 slides · 118k · Sep 11",
    slides: ["dock", "yoga", "mug", "oats", "journal"],
  },
  {
    id: "p3",
    net: "tiktok",
    handle: "@third.sample",
    title: "Water before coffee",
    meta: "5 slides · 0 · Sep 2",
    slides: ["mug", "oats", "vanity", "shower", "dock"],
  },
];

/* Two of the same links, still with the outside worker (the Queued board). */
const QUEUED_POSTS = [
  { id: "q1", net: "tiktok", url: "tiktok.com/@another.sample/video/7411884003", since: "6:07am" },
  { id: "q2", net: "instagram", url: "instagram.com/p/C9sampleAbc12/", since: "6:07am" },
];

const CONFS = [
  { id: "any", label: "Any confidence", min: 0 },
  { id: "high", label: "High, 0.80 and over", min: 0.8 },
  { id: "mid", label: "Medium, 0.50 to 0.79", min: 0.5, max: 0.8 },
  { id: "low", label: "Low, under 0.50", min: 0, max: 0.5 },
];

/* The photos the feed and the reference strips use, and the ones D6's Studio board needs. */
const SLIDE_IMAGES = ["mug", "journal", "yoga", "oats", "shower", "dock", "vanity", "serum", "bath", "shoes"];
const D6_SLIDES = new Set(["mug", "journal", "yoga", "oats", "shower", "dock", "vanity"]);
const LIB_IMAGES = ["window", "mirror", "outdoor", "kitchen"];

export function copyTrendsImages(OUT) {
  /* D6's photos under D10's names, the way D11 renames them, so this ticket
     owns every image key on a canvas it shares with D9; three of D8's small
     library shots join them so the feed does not repeat itself. Only the
     slides and library covers: round two's layered-template photos belong to
     the Figma moment, which no board here shows, and a canvas is a shared 16 MB. */
  for (const id of SLIDE_IMAGES) {
    const src = D6_SLIDES.has(id) ? `d6-slide-${id}.jpg` : `d8-img-${id}.jpg`;
    fs.copyFileSync(path.join(HERE, "assets", src), path.join(OUT, `d10-slide-${id}.jpg`));
  }
  for (const id of LIB_IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d6-lib-${id}.jpg`), path.join(OUT, `d10-lib-${id}.jpg`));
}

/* ── Styles ────────────────────────────────────────────────────────────── */

/* The feed column's width, and the search bar's: Instagram's is 470; 500
   after Garreth's third review (2026-09-17). */
/* The phone's details sheet is pulled by its grab bar or its row of tabs. */
const SHEET_PULL = ` onPointerDown="{{sheetDown}}" onPointerMove="{{sheetMove}}" onPointerUp="{{sheetEnd}}" onPointerCancel="{{sheetEnd}}"`;
/* Where the sheet rests, as margin-top: under the slides, and up over them. */
const SHEET_REST = -16;
const SHEET_RAISED = -416;
const COL = 500;
/* The Recent saves panel's width; the column of posts is centred between the
   rail and the panel, so the two gaps match (Garreth, 2026-09-17). */
const PANEL = 300;
const RAIL = 200;

function css(phone, tall) {
  const P = phone;
  return `
/* ── D10 page ── */
/* A review board that has to show more than a screen is taller than one, the
   way D7's Overview is: the shell's fixed height is lifted and the artboard is
   cut to match. */
${tall ? `.app${S} { height: ${tall}px; }` : ""}
/* Green and amber, as D8 reads them from the app; red is the kit's --danger. */
:root { --ok: #4ade80; --warn: #fbbf24; }
.app.is-light { --ok: #166534; --warn: #92400e; }

/* The page fills the screen so the two columns of Digests end on the same
   line, the way D7's side-by-side sections do. */
/* Only the posts scroll (Garreth, 2026-09-17): the page is pinned to the
   screen, and the column of posts is its own scroller, so the title, the
   search bar, the rail and the Recent saves panel stay where they are. */
${S} .main { display: flex; flex-direction: column; min-height: 0; overflow: hidden; ${P ? "padding: 16px 16px 0;" : ""} }
${S} .page { flex: 1; min-height: 0; gap: ${P ? 14 : 28}px; }

/* The header: the title at the left and the search bar centred over the feed
   (Garreth, 2026-09-17); on the phone the bar sits beside the title. */
${S} .t10head { position: relative; display: flex; align-items: center; gap: 12px; min-height: 36px; }

/* The search bar: search-input.tsx's shape (a rounded field on the raised
   surface, the search mark at its left), as wide as the posts (Garreth,
   2026-09-17). One box for creators and carousels alike; the placeholder
   carries the format, there is no instruction text. */
/* Round three (Garreth, 2026-09-18): the bar keeps its place and gains two
   things. How the search reads the library sits inside the bar at its right
   (on the phone it is the first group of the filter sheet, the bar being too
   short for it), and the filter button sits just outside it, so the bar
   itself stays as wide as the posts. */
${S} .sbw10 { ${P ? "display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;" : `position: absolute; z-index: 5; left: calc(50% - ${(PANEL - RAIL) / 2}px); top: 50%; width: ${COL}px; transform: translate(-50%, -50%);`} }
${S} .sb10 { display: flex; align-items: center; gap: 8px; ${P ? "flex: 1; min-width: 0;" : "width: 100%;"} border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 7px 10px 7px 14px; }
${S} .sb10 .ic { display: flex; flex-shrink: 0; color: var(--text-muted); }
${S} .sb10 input { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; }
${S} .sb10 input::placeholder { color: var(--text-muted); }
${S} .sb10 .clr { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; border-radius: 999px; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .sb10 .clr:hover { color: var(--text-primary); }

${S} .sbch { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; margin: -2px 0; padding: 4px 6px 4px 12px; border-left: 1px solid var(--border); font-size: 13px; line-height: 18px; font-weight: 500; color: var(--text-muted); white-space: nowrap; transition: color 150ms var(--ease); }
${S} .sbch:hover, ${S} .sbch[aria-expanded="true"] { color: var(--text-primary); }
${S} .sbch .ddcaret { display: flex; transition: transform 150ms var(--ease); }
${S} .sbch[aria-expanded="true"] .ddcaret { transform: rotate(180deg); }
${S} .chpop { top: calc(100% + 8px); right: 0; width: 200px; }
/* The filter button: a quiet round button, with how many filters are on. */
${S} .fbt10 { position: ${P ? "relative" : "absolute"}; ${P ? "" : "left: calc(100% + 8px); top: 50%; transform: translateY(-50%);"} display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted);
  transition: color 150ms var(--ease), border-color 150ms var(--ease); }
${S} .fbt10:hover, ${S} .fbt10[aria-expanded="true"], ${S} .fbt10.has { color: var(--text-primary); }
${S} .fbt10[aria-expanded="true"] { border-color: color-mix(in srgb, var(--text-primary) 30%, var(--border)); }
${S} .fbt10 .fn10 { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; border-radius: 999px; padding: 0 4px; font-size: 10px; line-height: 16px; font-weight: 600; text-align: center; color: var(--bg); background: var(--text-primary); }

/* The filter panel: under the bar and as wide as it on the desktop, a sheet
   from the foot of the screen on the phone. Nothing in it is lit: a chosen
   chip is the rail's glass, and Apply is the ordinary text colour, filled. */
${S} .fp10 { ${P ? "position: absolute; left: 0; right: 0; bottom: 0; z-index: 66; max-height: 86%; overflow-y: auto; border-radius: 24px 24px 0 0; padding: 20px 16px 16px;" : `position: absolute; top: calc(100% + 10px); left: 0; width: ${COL}px; z-index: 40; border-radius: 20px; padding: 18px;`} display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--border);
  /* Darker than the app's glass (Garreth, 2026-09-18): the panel sits over
     photos, and at the glass's 60% its labels lost their contrast. Nearly
     solid, with the blur kept for the little that still shows through. */
  background: color-mix(in srgb, var(--card) 94%, transparent); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); }
/* Light mode has no blur, so anything short of solid shows the results
   through the panel: there it is the card colour outright, with the app's
   own light shadow. */
.is-light${S} .fp10 { background: var(--card); box-shadow: var(--sb-shadow); }
.is-light${S} .dsheet { box-shadow: 0 -6px 18px rgba(27, 29, 33, 0.12); }
.is-light${S} .dmodal { box-shadow: 0 24px 80px rgba(27, 29, 33, 0.25); }
${S} .fpg { display: flex; flex-direction: column; gap: 8px; }
/* A filter is a row: what it is at the left, its dropdown at the right
   (Garreth, 2026-09-18: a dropdown that starts on Any, not a row of pills).
   The dropdown is D9's, the one Knowledge's confidence filter uses. */
${S} .fprow { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; line-height: 20px; }
${S} .fprow .dd10 .btn2 { min-width: 176px; justify-content: space-between; ${P ? "padding: 9px 14px;" : ""} }
${S} .fprow .dd10 .btn2.has { color: var(--text-primary); border-color: color-mix(in srgb, var(--text-primary) 35%, var(--border)); }
${S} .fprow .pop10 { width: 220px; background: var(--card-raised); -webkit-backdrop-filter: none; backdrop-filter: none; }
/* The filters a search ran with, over its results (Garreth, 2026-09-18):
   one chip each, its X taking that filter off and running the search again. */
${S} .fused { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin: -6px 0 16px; }
${S} .fchip.fx { gap: 6px; padding-right: 9px; }
${S} .fchip.fx svg { opacity: 0.7; }
${S} .fchip.fx:hover svg { opacity: 1; }
${S} .fused .lnk10 { margin-left: 4px; }
/* No new carousels: a small line over the last ones seen, and the quiet
   button that brings new ones in when there are some (Garreth, 2026-09-18). */
${S} .fnew { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .fnew .ic { display: flex; }
/* The end of what is new: the line that says so, and the way on into the
   ones already seen (Garreth, 2026-09-18). */
${S} .folder { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0 32px; }
${S} .folder .fnew { margin-bottom: 0; }
${S} .fpl { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .fpc { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .fchip { position: relative; display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid var(--border); padding: ${P ? 7 : 5}px 12px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap;
  transition: color 150ms var(--ease), border-color 150ms var(--ease), background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .fchip:hover { color: var(--text-primary); }
${S} .fchip:active { transform: scale(0.97); }
${S} .fchip.on { color: var(--text-primary); border-color: color-mix(in srgb, var(--text-primary) 45%, var(--border)); background: var(--glass); }
${S} .fpsw { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; line-height: 20px; }
${S} .sw10 { position: relative; width: 36px; height: 20px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-sunken); transition: background-color 150ms var(--ease); }
${S} .sw10::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 999px; background: var(--text-muted); transition: transform 160ms var(--ease-out-strong), background-color 150ms var(--ease); }
${S} .sw10.on { background: var(--text-primary); border-color: var(--text-primary); }
${S} .sw10.on::after { transform: translateX(16px); background: var(--bg); }
${S} .fpf { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border); }
${S} .lnk10 { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .lnk10:hover { color: var(--text-primary); }
${S} .solid10 { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 8px 20px; font-size: 13px; line-height: 16px; font-weight: 600; color: var(--bg); background: var(--text-primary); transition: opacity 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .solid10:hover { opacity: 0.9; }
${S} .solid10:active { transform: scale(0.97); }

/* The body: the rail of sections on the left, the section beside it. */
${S} .tbody { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; }
/* The rail: the app's own sidebar rows (sidebar.tsx), one per section, with
   the counts that the tabs used to carry. */
${S} .rail10 { position: absolute; left: 0; top: 0; z-index: 2; display: flex; flex-direction: column; gap: 2px; width: ${RAIL}px; }
${S} .rrow { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 16px; border: 1px solid transparent; padding: 6px 8px; font-size: 14px; line-height: 20px; color: var(--text-muted);
  transition: color 200ms var(--ease), background-color 200ms var(--ease); }
${S} .rrow:hover { background: var(--card); color: var(--text-primary); }
${S} .rrow.on { font-weight: 500; color: var(--text-primary); background: var(--glass); border-color: var(--glass-border); box-shadow: var(--glass-highlight); }
${S} .rrow .ri { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 10px; transition: background-color 200ms var(--ease), color 200ms var(--ease); }
${S} .rrow.on .ri { background: var(--text-primary); color: var(--bg); }
/* Digests and the knowledge base sit beside the rail; the feed is a centred
   column on the page, clear of it. */
${S} .panel10 { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow-y: auto; ${P ? "margin: 0 -16px; padding: 0 16px 96px;" : `padding-left: ${RAIL + 20}px;`} }

/* The phone's floating bar: the same three sections at the foot of the
   screen, the app's own overlay surface (Garreth, 2026-09-17). */
${S} .fnav10 { position: absolute; left: 50%; bottom: 16px; z-index: 30; display: flex; gap: 4px; transform: translateX(-50%); border-radius: 999px; padding: 6px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); }
.is-light${S} .fnav10 { border: 1px solid var(--border); box-shadow: var(--sb-shadow); }
${S} .fn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; width: 84px; border-radius: 999px; padding: 6px 0 5px; font-size: 11px; line-height: 14px; font-weight: 500; color: var(--text-muted);
  transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .fn.on { color: var(--text-primary); background: var(--glass); box-shadow: inset 0 0 0 1px var(--glass-border); }

/* ── Feed ── */
/* The scroller spans the whole section, with the posts centred inside it by
   padding rather than margins, so a wheel over the empty space either side
   of the posts scrolls the feed too (Garreth, 2026-09-17). */
${S} .fwrap { display: flex; flex-direction: column; align-items: center; flex: 1; min-height: 0; overflow-y: auto; ${P ? "margin: 0 -16px; padding: 0 16px 96px; scroll-snap-type: y proximity;" : `padding: 0 ${PANEL}px 0 ${RAIL}px;`} }
${S} .fcol { display: flex; flex-direction: column; width: ${P ? "100%" : `${COL}px`}; max-width: 100%; }
/* What a search found, in words. */
${S} .fres { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; margin-bottom: 16px; font-size: 14px; line-height: 20px; }
${S} .fres b { font-weight: 500; }
${S} .fres .n { color: var(--text-muted); }

/* One post, Instagram's feed layout (Garreth, 2026-09-17): header, image,
   dots, the icon row, the numbers, the caption. A divider between posts,
   no card box. */
${S} .fcard { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 0 0 ${P ? 16 : 20}px; margin-bottom: ${P ? 16 : 20}px; border-bottom: 1px solid var(--border); ${P ? "margin-left: -16px; margin-right: -16px; scroll-snap-align: start;" : ""} }
${S} .fcol { padding-bottom: ${P ? 0 : 24}px; }
${S} .fcard:last-of-type { border-bottom: 0; margin-bottom: 0; }
${S} .fhead { display: flex; align-items: center; gap: 10px; ${P ? "padding: 0 16px;" : ""} }
${S} .fav { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); }
${S} .fwho { display: flex; flex: 1; flex-direction: column; gap: 1px; min-width: 0; }
${S} .fwho .l1 { display: flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 14px; line-height: 18px; font-weight: 600; }
${S} .fwho .l1 b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .fwho .l1 .dt { flex-shrink: 0; font-weight: 400; color: var(--text-muted); }
${S} .fwho .l2 { font-size: 12px; line-height: 16px; color: var(--text-muted); text-wrap: pretty; }
${S} .fwho .l2 .m { color: var(--accent); }
/* The image, at the 4:5 a carousel slide is; the other slides stacked under
   it, so paging is a fade rather than a reload. */
${S} .fview { position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${P ? 0 : 4}px; background: var(--card-sunken); }
/* The slides are a track that snaps slide to slide, so a swipe pages it on
   the desktop as on the phone (Garreth, 2026-09-17). */
${S} .ftrack { display: flex; width: 100%; height: 100%; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; }
${S} .fsl { display: flex; flex: 0 0 100%; height: 100%; align-items: center; justify-content: center; scroll-snap-align: start; background-color: var(--card-sunken); background-size: cover; background-position: center; }
/* A slide whose link has died: a muted frame that says so, and nothing else
   about the post changes (the developer handover's rule). */
${S} .gone { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-muted); }
${S} .gone b { font-size: 13px; line-height: 18px; font-weight: 500; }
${S} .fcount { position: absolute; top: 10px; right: 10px; z-index: 2; border-radius: 999px; padding: 2px 8px; font-size: 11px; line-height: 16px; font-weight: 500; color: #fff; background: rgba(0, 0, 0, 0.45); }
/* Left and right, shown on hover (and on the board that shows paging). */
${S} .farrow { position: absolute; top: 50%; z-index: 2; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px; transform: translateY(-50%); color: var(--text-primary);
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); opacity: 0; transition: opacity 150ms var(--ease); }
${S} .farrow--l { left: 10px; } ${S} .farrow--r { right: 10px; }
${S} .fview:hover .farrow, ${S} .farrow.show { opacity: 1; }
${SLIDE_IMAGES.map((id) => `${S} .ps-${id} { background-image: url("./d10-slide-${id}.jpg"); }`).join("\n")}
/* The dots under the image, the one showing in the accent. */
${S} .fdots { display: flex; justify-content: center; gap: 4px; }
${S} .fdot { position: relative; width: 6px; height: 6px; border-radius: 999px; background: var(--text-muted); opacity: 0.35; transition: opacity 150ms var(--ease), background-color 150ms var(--ease); }
${S} .fdot.on { background: var(--accent); opacity: 1; }
/* The numbers at the left; Copy to Studio and Save together at the right
   (Garreth, 2026-09-17). */
${S} .fact { display: flex; align-items: center; gap: 6px; ${P ? "padding: 0 16px;" : ""} }
${S} .fact .sp { flex: 1; }
/* Copy to Studio and View Post are not the accent (Garreth, 2026-09-17): a
   grey outline, no fill, the text and the icon in the ordinary text colour. */
${S} .ghost10 { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); padding: 7px 14px; font-size: 13px; line-height: 16px; font-weight: 500; color: var(--text-primary); white-space: nowrap;
  transition: border-color 150ms var(--ease), background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .ghost10:hover { border-color: color-mix(in srgb, var(--text-primary) 30%, var(--border)); background: var(--card); }
${S} .ghost10:active { transform: scale(0.97); }
${S} .fact .fbtn:first-child { margin-left: -8px; }
${S} .fact .fbtn + .fbtn { margin-left: -6px; }
${S} .fnums { ${P ? "padding: 0 16px;" : ""} }
${S} .fbtn { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 999px; color: var(--text-primary); transition: background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .fbtn:hover { background: var(--card); }
${S} .fbtn:active { transform: scale(0.94); }
${S} .fmeta { min-width: 0; font-size: 13px; line-height: 18px; font-weight: 500; ${P ? "" : "overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"} }
/* Accounts a search found sit above its carousels, with room between. */
${S} .fcol > .c10 { margin-bottom: 20px; }
${S} .fcap { margin: 0; font-size: 14px; line-height: 20px; text-wrap: pretty; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; ${P ? "padding: 0 16px;" : ""} }
${S} .fcap b { font-weight: 600; margin-right: 6px; }

/* Recent saves, to the right of the feed on the desktop (Garreth,
   2026-09-17): the last five, each a horizontal card with the thumbnail at
   the left, and the way to all of them. */
${S} .saved10 { position: absolute; right: 0; top: 0; z-index: 2; width: ${PANEL}px; }
/* Tighter, with a rule under the title (Garreth, 2026-09-17). */
${S} .svh { margin: 0 0 6px; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; line-height: 20px; font-weight: 600; }
${S} .svrow { display: flex; align-items: center; gap: 10px; width: 100%; padding: 5px 14px; transition: background-color 150ms var(--ease); }
${S} .svrow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
${S} .svth { width: 40px; aspect-ratio: 4 / 5; flex-shrink: 0; border-radius: 6px; background-color: var(--card-sunken); background-size: cover; background-position: center; }
${S} .svt { display: flex; flex: 1; flex-direction: column; gap: 1px; min-width: 0; }
${S} .svt b { font-size: 13px; line-height: 18px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .svt span { font-size: 12px; line-height: 16px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .svnone { padding: 2px 14px 10px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .svall { display: flex; justify-content: center; margin: 6px 14px 12px; }

/* Carousel search results as a grid, three across, the slide that matched
   in each tile with a small carousel mark (Garreth, 2026-09-17). */
${S} .grid10 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: ${P ? 2 : 4}px; ${P ? "margin: 0 -16px;" : ""} }
${S} .gt { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${P ? 0 : 4}px; background-color: var(--card-sunken); background-size: cover; background-position: center; transition: opacity 150ms var(--ease); }
${S} .gt:hover { opacity: 0.85; }
${S} .gt .gm { position: absolute; top: 8px; right: 8px; display: flex; color: #fff; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6)); }
${S} .gt .gq { position: absolute; left: 8px; bottom: 8px; border-radius: 999px; padding: 2px 8px; font-size: 11px; line-height: 16px; font-weight: 500; color: #fff; background: rgba(0, 0, 0, 0.45); }

/* A search on its way: the tiles it will fill, breathing. */
${S} .gt.is-skel { background: var(--card); animation: t10pulse 1.4s var(--ease) infinite; }
${S} .gt.is-skel:hover { opacity: 1; }
@keyframes t10pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
${S} .fres .busy { display: inline-flex; align-items: center; gap: 8px; }

/* ── The details window (Garreth, 2026-09-18) ──
   One window for a post wherever it is opened from: a tile in the results,
   View Details on a post, a row of Recent saves. The slides at the left,
   swipeable; at the right who posted it, two tabs, and the actions along the
   foot. On the phone it fills the screen, slides first. */
/* Above the shell's page glow (z 60), which would otherwise wash over the
   window, and under the prototype note (z 70). */
${S} .dscrim { position: absolute; inset: 0; z-index: 65; display: flex; align-items: center; justify-content: center; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); }
${S} .dmodal { position: relative; display: flex; ${P ? "flex-direction: column; width: 100%; height: 100%;" : "width: 1040px; height: 720px; border-radius: 24px; border: 1px solid var(--border); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);"} overflow: hidden; background: var(--card); }
${S} .dleft { position: relative; ${P ? "width: 100%;" : "height: 100%;"} aspect-ratio: 4 / 5; flex-shrink: 0; background: var(--card-sunken); }
${S} .dleft .fview { height: 100%; border-radius: 0; }
${S} .dleft .fdots { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 2; }
${S} .dleft .fdot { background: #fff; }
${S} .dleft .fdot.on { background: #fff; opacity: 1; }
/* On the phone the right side's parts join the window's own column, so the
   header, with its X, sits above the slides. */
${S} .dright { ${P ? "display: contents;" : "display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; border-left: 1px solid var(--border);"} }
${S} .dhd { display: flex; align-items: center; gap: 10px; padding: ${P ? "10px 12px 10px 16px" : "16px 16px 16px 20px"}; ${P ? "order: -1; border-bottom: 1px solid var(--border);" : ""} }
${S} .dx { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 999px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .dx:hover { color: var(--text-primary); background: var(--card-raised); }
/* The tabs and what they hold are one sheet. On the desktop it simply fills
   the right side. On the phone (Garreth, 2026-09-19) the slides stay where
   they are, pinned under the header, and the sheet rides up over them as the
   reader scrolls, until only a strip of the slide shows; scrolling back down
   lets it go again. The grab bar at its top does the same on a press. */
${S} .dsheet { position: relative; display: flex; flex: 1; flex-direction: column; min-height: 0; ${P ? `z-index: 3; margin-top: ${SHEET_REST}px; border-radius: 20px 20px 0 0; background: var(--card); box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35); transition: margin-top 320ms var(--ease-out-strong);` : ""} }
${P ? `${S} .dsheet.is-up { margin-top: ${SHEET_RAISED}px; }
/* The bar looks as it did; what takes the finger is taller, and reaches up over the foot of the slide. Neither
   it nor the tabs scroll, so the browser leaves a drag on them to the sheet. */
${S} .dgrab { position: relative; display: flex; justify-content: center; width: 100%; padding: 8px 0 2px; cursor: grab; touch-action: none; }
${S} .dgrab::after { content: ""; position: absolute; inset: -14px 0 0; }
${S} .dtabs { touch-action: none; }
${S} .dgrab span { width: 36px; height: 4px; border-radius: 999px; background: var(--border); }
${S} .dleft .fdots { bottom: 26px; }
@media (prefers-reduced-motion: reduce) { ${S} .dsheet { transition: none; } }` : ""}
/* The tabs: the app's underline tabs, the chosen one in the text colour. */
${S} .dtabs { display: flex; gap: 20px; padding: 0 ${P ? 16 : 20}px; border-bottom: 1px solid var(--border); }
${S} .dtab { position: relative; padding: 10px 0; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .dtab:hover { color: var(--text-primary); }
${S} .dtab.on { color: var(--text-primary); }
${S} .dtab.on::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px; background: var(--text-primary); }
${S} .dbody { display: flex; flex: 1; flex-direction: column; gap: 18px; min-height: 0; overflow-y: auto; padding: ${P ? "16px 16px 20px" : "20px"}; }
/* The numbers: three cells, each what it is and what it reads. A number the
   library does not hold says Unknown, never 0 (the handover's rule). */
${S} .dstats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
${S} .dstat { display: flex; flex-direction: column; gap: 2px; border-radius: 14px; background: var(--card-raised); padding: 10px 12px; }
${S} .dstat span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .dstat b { font-size: 17px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
${S} .dstat b.unk { font-size: 14px; font-weight: 500; color: var(--text-muted); }
${S} .drows { display: flex; flex-direction: column; }
${S} .drow { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 9px 0; border-top: 1px solid var(--border); font-size: 13px; line-height: 20px; }
${S} .drow:first-child { border-top: 0; padding-top: 0; }
${S} .drow span { flex-shrink: 0; color: var(--text-muted); }
${S} .drow b { min-width: 0; font-weight: 500; text-align: right; text-wrap: pretty; }
${S} .drow b.unk { font-weight: 400; color: var(--text-muted); }
${S} .dcap { margin: 0; font-size: 14px; line-height: 21px; text-wrap: pretty; }
${S} .dcap b { font-weight: 600; margin-right: 6px; }
${S} .dsh { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; }
${S} .dsh .n { font-size: 12px; font-weight: 400; color: var(--text-muted); }
${S} .dsec { display: flex; flex-direction: column; gap: 10px; }
/* The words on each slide, in the deck's order. */
${S} .dline { display: flex; gap: 12px; padding: 8px 0; border-top: 1px solid var(--border); font-size: 13.5px; line-height: 20px; }
${S} .dline:first-of-type { border-top: 0; padding-top: 0; }
${S} .dline .no { width: 56px; flex-shrink: 0; font-size: 12px; color: var(--text-muted); }
${S} .dline .tx { min-width: 0; text-wrap: pretty; }
${S} .dline .tx .none { color: var(--text-muted); }
${S} .dline .tx .op { display: block; font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* Under the words, what the slide shows; at the right, its job in the story. */
${S} .dline .tx { flex: 1; }
${S} .dline .tx .vis { display: block; margin-top: 2px; font-size: 12.5px; line-height: 18px; color: var(--text-muted); text-wrap: pretty; }
${S} .dline .role { align-self: flex-start; }
${S} .dline .no.wide { width: 96px; }
${S} .dsh .n { display: inline-flex; align-items: center; gap: 8px; }
/* The Analysis tab is groups that open and close (Garreth, 2026-09-19), so
   it opens tidy: the summary open, the rest shut. A header is its name and
   nothing else (Garreth, 2026-09-19: no counts, no unnecessary text). More
   than one can be open at once. */
${S} .danh { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .dbody:has(.dacc) { gap: 10px; }
${S} .dacc { border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); }
${S} .dacch { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; font-size: 13px; line-height: 20px; text-align: left; border-radius: 16px; transition: background-color 150ms var(--ease); }
${S} .dacch:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
${S} .dacch .t { flex: 1; font-weight: 600; }
${S} .dacch .n { font-size: 12px; color: var(--text-muted); }
${S} .dacch .ddcaret { display: flex; color: var(--text-muted); transition: transform 150ms var(--ease); }
${S} .dacc.on .dacch .ddcaret { transform: rotate(180deg); }
${S} .daccb { display: flex; flex-direction: column; gap: 10px; padding: 2px 14px 14px; }
${S} .daccb .dtags { border-bottom: 0; padding-bottom: 0; margin-bottom: 0; }
${S} .daccb .dline:first-child { border-top: 0; padding-top: 0; }
/* The short values, two across: what each is, over its tag. */
${S} .dtags { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; padding-bottom: 14px; margin-bottom: 4px; border-bottom: 1px solid var(--border); }
${S} .dtag { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
${S} .dtag > span:first-child { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .dtag .pill { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
/* A review board of the tab scrolled down: the first section is off the top. */

/* What to keep, and what to watch for; what the comments said. */
${S} .dlist { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 13.5px; line-height: 20px; }
${S} .dlist li { position: relative; padding-left: 14px; text-wrap: pretty; }
${S} .dlist li::before { content: ""; position: absolute; left: 0; top: 8px; width: 4px; height: 4px; border-radius: 999px; background: var(--text-muted); }
${S} .dsub { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .dpills { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .dmuted { margin: 0; font-size: 13px; line-height: 20px; color: var(--text-muted); }
/* The analysis's own state: words first, the colour only agrees. */
${S} .pill.is-wait { color: var(--warn); }
${S} .pill.is-bad { color: var(--danger); }
${S} .dnone { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 220px; border-radius: 20px; border: 1px dashed var(--border); padding: 28px 20px; text-align: center; }
${S} .dnone .ic { display: flex; color: var(--text-muted); }
${S} .dnone p { margin: 0; font-size: 14px; line-height: 20px; color: var(--text-muted); }
/* The actions along the foot: the votes and Save at the left, the two ways
   on at the right. All quiet. */
${S} .dft { display: flex; align-items: center; gap: 6px; padding: ${P ? "10px 12px 14px" : "12px 16px"}; border-top: 1px solid var(--border); }
${S} .dft .sp { flex: 1; }
${S} .dft .fbtn + .fbtn { margin-left: -4px; }

/* The next twenty on their way, and the end of the library. */
${S} .fmore { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 120px; border-radius: 24px; border: 1px dashed var(--border); font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .fmore b { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: var(--text-muted); }
${S} .fend { padding: 8px 0 24px; text-align: center; font-size: 13px; line-height: 20px; color: var(--text-muted); }

/* Cards, as everywhere else in the generator. */
${S} .c10 { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }

/* Accounts found: a list, each one the handle and what the library holds of it. */
${S} .crow { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 12px 20px; border-top: 1px solid var(--border); transition: background-color 150ms var(--ease); }
${S} .crow:first-child { border-top: 0; border-radius: 23px 23px 0 0; }
${S} .crow:last-child { border-radius: 0 0 23px 23px; }
${S} .crow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
${S} .crow .cw { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
${S} .crow .cw .l1 { display: flex; align-items: center; gap: 8px; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .crow .cw .l1 .net { display: flex; color: var(--text-muted); }
${S} .crow .cw .l2 { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .crow .go { display: flex; color: var(--text-muted); }

/* ── Digests ── */
${S} .dg { display: ${P ? "flex" : "grid"}; ${P ? "flex-direction: column;" : "grid-template-columns: 236px minmax(0, 1fr);"} gap: ${P ? 14 : 20}px; flex: 1; min-height: 0; }
${S} .dglist { overflow-y: auto; }
${S} .dgrow { position: relative; display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px;
  transition: background-color 150ms var(--ease); }
${S} .dgrow:first-child { border-top: 0; border-radius: 23px 23px 0 0; }
${S} .dgrow:last-child { border-radius: 0 0 23px 23px; }
${S} .dgrow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
/* The open one: the accounts table's selected-filter treatment, a tint rather
   than a fill, so the only filled accent on the screen stays Analyse. */
${S} .dgrow.on { background: var(--accent-soft); }
${S} .dgrow.on .dgd { color: var(--accent); }
${S} .dgd { font-weight: 500; }
${S} .dgs { font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* A state is words first; the colour only agrees with them. */
${S} .dgs.is-new { color: var(--accent); }
${S} .dgs.is-wait { color: var(--warn); }
${S} .dgs.is-bad { color: var(--danger); }

${S} .dgmain { overflow-y: auto; }
${S} .dgpad { display: flex; flex-direction: column; gap: ${P ? 16 : 20}px; padding: ${P ? 16 : 24}px; }
${S} .dghead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
${S} .dght { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
${S} .dght h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
${S} .dght span { font-size: 13px; line-height: 18px; color: var(--text-muted); }

/* The body, readable in place: the app's sunken surface, its own scroll. */
${S} .dgbody { display: flex; flex-direction: column; gap: 10px; max-height: ${P ? 200 : 232}px; overflow-y: auto; border-radius: 16px; background: var(--card-sunken); border: 1px solid var(--border); padding: ${P ? 14 : 18}px; }
${S} .dgbody p { margin: 0; font-size: 13.5px; line-height: 21px; color: var(--text-muted); text-wrap: pretty; overflow-wrap: anywhere; }
${S} .dgbody p.is-link { color: var(--accent); }

/* Working, after Analyse: what it is doing, in the order F12 does it. */
${S} .work10 { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); padding: 12px 16px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .work10 b { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; color: var(--accent); }

/* A failed analysis: the error where the result would be, and Retry. */
${S} .fail10 { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; border-radius: 16px; border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border)); background: color-mix(in srgb, var(--danger) 7%, transparent); padding: 12px 16px; font-size: 13px; line-height: 20px; color: var(--danger); }
${S} .fail10 .ft { display: inline-flex; align-items: center; gap: 6px; }

${S} .sec10 { display: flex; flex-direction: column; gap: 12px; }
${S} .sh10 { display: flex; align-items: baseline; gap: 8px; margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; }
${S} .sh10 .n { font-size: 12px; font-weight: 500; color: var(--text-muted); }

/* A proposed rule: what it says, what it rests on, and where it applies. */
${S} .rule10 { display: flex; flex-direction: column; gap: 10px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); padding: ${P ? 14 : 16}px; }
${S} .rtop { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
${S} .rtext { font-size: 14.5px; line-height: 21px; font-weight: 500; text-wrap: pretty; }
${S} .rev { display: flex; flex-direction: column; gap: 6px; border-radius: 12px; background: var(--card-sunken); padding: 10px 12px; }
${S} .rev span { display: flex; gap: 8px; font-size: 12.5px; line-height: 18px; color: var(--text-muted); text-wrap: pretty; }
${S} .rev span .q { display: flex; flex-shrink: 0; padding-top: 3px; opacity: 0.6; }
${S} .rmeta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
${S} .pill--accent { color: var(--accent); }
${S} .pill--quiet { background: none; box-shadow: inset 0 0 0 1px var(--border); }

/* A referenced post: who it is, what it did, and its slides. */
${S} .post10 { display: flex; flex-direction: column; gap: 12px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); padding: ${P ? 14 : 16}px; }
${S} .phead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 12px; }
${S} .pwho { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
${S} .pwho .l1 { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .pwho .l1 .net { display: flex; flex-shrink: 0; color: var(--text-muted); }
${S} .pwho .l1 b { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .pwho .l2 { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .pstrip { display: flex; gap: 8px; overflow-x: auto; }
/* The slides themselves, at the 4:5 a carousel slide is. */
${S} .pslide { width: ${P ? 56 : 64}px; aspect-ratio: 4 / 5; flex-shrink: 0; border-radius: 8px; background-color: var(--card-sunken); background-size: cover; background-position: center; }
/* Waiting on the outside worker: no slides to show, and the time it went in. */
${S} .pqueue { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; border-radius: 16px; border: 1px dashed var(--border); padding: ${P ? 12 : 14}px 16px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .pqueue .u { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .pqueue .w { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; color: var(--warn); }

/* ── Knowledge base ── */
${S} .kb { display: flex; flex-direction: column; gap: ${P ? 14 : 16}px; flex: 1; min-height: 0; }
${S} .kbf { display: flex; align-items: ${P ? "stretch" : "center"}; gap: 12px; ${P ? "flex-direction: column;" : ""} }
${S} .chips10 { display: flex; ${P ? "" : "flex-wrap: wrap; flex: 1;"} align-items: center; gap: 8px; min-width: 0; }
${S} .chip10 { position: relative; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; max-width: 220px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised);
  padding: 5px 13px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap;
  transition: color 150ms var(--ease), border-color 150ms var(--ease), background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .chip10:hover { color: var(--text-primary); }
${S} .chip10:active { transform: scale(0.97); }
${S} .chip10.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
${S} .chip10 span { overflow: hidden; text-overflow: ellipsis; }

/* The confidence dropdown: D9's, same popover and timings. */
${S} .dd10 { position: relative; flex-shrink: 0; }
${S} .dd10 .btn2 { ${P ? "width: 100%; justify-content: space-between; padding: 12px 16px;" : ""} }
${S} .ddcaret { display: flex; transition: transform 150ms var(--ease); }
${S} .dd10.on .ddcaret { transform: rotate(180deg); }
${S} .catch10 { position: absolute; inset: 0; z-index: 30; display: none; }
${S} .catch10.on { display: block; }
${S} .pop10 { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; width: 240px; transform-origin: top right; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.97) translateY(-4px);
  transition: opacity 120ms var(--ease-out-strong), transform 120ms var(--ease-out-strong), visibility 0s 120ms; }
${S} .pop10.on { opacity: 1; visibility: visible; pointer-events: auto; transform: none; transition: opacity 180ms var(--ease-out-strong), transform 180ms var(--ease-out-strong); }
${S} .opt10 { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 12px; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 20px; color: var(--text-muted);
  transition: background-color 150ms var(--ease), color 150ms var(--ease); }
${S} .opt10:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-primary); }
${S} .opt10.on { color: var(--text-primary); font-weight: 500; }
${S} .optcheck10 { display: flex; width: 16px; justify-content: center; color: var(--text-primary); }

${S} .kbscroll { display: flex; flex-direction: column; gap: 16px; flex: 1; min-height: 0; overflow-y: auto; }
${S} .kgrid { display: grid; grid-template-columns: minmax(0, 1fr) 232px 88px 172px; align-items: center; column-gap: 16px; }
${S} .khead { padding: 16px 24px 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .krow { width: 100%; min-height: 60px; padding: 12px 24px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px; }
${S} .krow:last-child { border-radius: 0 0 23px 23px; }
${S} .kt { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
${S} .kt b { font-weight: 500; text-wrap: pretty; }
${S} .kt span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .ktypes { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
${S} .kact { display: flex; justify-content: flex-start; gap: 8px; }
/* Accept says yes and Reject says no; neither deletes anything (F13), so
   neither is a hold and neither is lit. */
${S} .kbtn { position: relative; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 6px 12px;
  font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap;
  transition: color 150ms var(--ease), border-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .kbtn:hover { color: var(--text-primary); }
${S} .kbtn.is-yes:hover { border-color: color-mix(in srgb, var(--ok) 55%, var(--border)); color: var(--ok); }
${S} .kbtn:active { transform: scale(0.97); }

/* Empty: no digests yet, and nothing pending. Both fill the rest of the
   screen rather than sitting in a short box (D9's rule, Garreth 2026-09-16). */
${S} .es10 { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: ${P ? 240 : 320}px; border-radius: 24px; border: 1px dashed var(--border);
  padding: 32px 24px; text-align: center; }
${S} .es10 .ic { display: flex; color: var(--text-muted); }
${S} .es10 p { max-width: 420px; margin: 0; font-size: 14px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; }
/* Nothing pending, nothing found: the block says so and stops, under the
   search line that led there. An empty state only fills the screen when it
   is the only thing on it. */
${S} .es10--inline { flex: 0 0 auto; min-height: ${P ? 150 : 176}px; }
${
  P
    ? `
/* Phone: the column of posts snaps post to post, the way a feed does; the
   title and the bar stay put above it. */
/* Phone: the digests become a row of dates that scrolls sideways inside
   itself, the way the app's own filter pills do and D9's type pills now do,
   rather than a column eating a third of the screen before the digest shows. */
${S} .dglist { flex-direction: row; gap: 8px; overflow-x: auto; overflow-y: visible; border: 0; background: none; box-shadow: none; border-radius: 0; margin: 0 -16px; padding: 0 16px 2px; }
${S} .dgrow { flex-shrink: 0; width: auto; border: 1px solid var(--border); border-radius: 16px; background: var(--card); padding: 8px 14px; }
/* Each date is one chip: its two lines stay on one line each, so the row
   scrolls sideways instead of growing ragged and tall. */
${S} .dgd, ${S} .dgs { white-space: nowrap; }
${S} .dgrow:first-child, ${S} .dgrow:last-child { border-radius: 16px; }
${S} .dgrow.on { border-color: var(--accent); }
${S} .dgmain { flex: 1; min-height: 0; }
${S} .chips10 { overflow-x: auto; padding-bottom: 2px; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
${S} .chip10 { padding: 7px 13px; }
${S} .khead { display: none; }
${S} .krow { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; }
${S} .kmeta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
/* 44px touch targets: the pill keeps its size, the hit area grows (D2). */
${S} .chip10::after, ${S} .kbtn::after, ${S} .fbtn::after, ${S} .fdot::after, ${S} .fchip::after { content: ""; position: absolute; inset: -6px; }
/* Two buttons and two votes share a 390px row: the buttons tighten. */
${S} .fact .ghost10 { padding: 7px 12px; gap: 6px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .chip10, ${S} .dgrow, ${S} .rrow, ${S} .fn, ${S} .opt10, ${S} .kbtn, ${S} .ddcaret, ${S} .fsl, ${S} .fdot, ${S} .farrow, ${S} .fbtn, ${S} .svrow, ${S} .ghost10, ${S} .gt, ${S} .fchip, ${S} .sw10, ${S} .sw10::after, ${S} .dtab, ${S} .dx, ${S} .fbt10, ${S} .sbch { transition: none; }
  ${S} .gt.is-skel { animation: none; }
  ${S} .pop10 { transition: opacity 120ms linear, visibility 0s 120ms; transform: none; }
  ${S} .pop10.on { transition: opacity 150ms linear; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

/*
 * The platform's mark. It has to be written into the template, not handed over
 * as a value: a {{hole}} renders as text, so an icon passed through one shows
 * its own SVG source on the screen (found by Garreth, 2026-09-16).
 */
const net = (row, lg = false) =>
  `<span class="net">` +
  `<sc-if value="{{${row}.isTiktok}}" hint-placeholder-val="{{ true }}">${lg ? D10I.tiktokLg : D10I.tiktok}</sc-if>` +
  `<sc-if value="{{${row}.isInsta}}" hint-placeholder-val="{{ false }}">${lg ? D10I.instagramLg : D10I.instagram}</sc-if>` +
  `</span>`;

/* The search bar, in the header on every section: one box for creators and
   carousels alike. */
const chOptions = () => `
                  <sc-for list="{{chOpts}}" as="c" hint-placeholder-count="5">
                    <button type="button" class="opt10 {{c.cls}}" role="option" aria-selected="{{c.selected}}" onClick="{{c.pick}}">{{c.label}}<span class="optcheck10"><sc-if value="{{c.isSelected}}" hint-placeholder-val="{{ false }}">${D10I.check}</sc-if></span></button>
                  </sc-for>`;

/* The filter panel: under the bar on the desktop, a sheet on the phone, where
   it also carries how the search reads the library. */
const filterPanel = (phone) => `
              <section class="fp10" role="dialog" aria-label="Filters">
                ${
                  phone
                    ? `<div class="fpg"><span class="fpl">Search by</span><div class="fpc">
                  <sc-for list="{{chOpts}}" as="c" hint-placeholder-count="5">
                    <button type="button" class="fchip {{c.cls}}" aria-pressed="{{c.selected}}" onClick="{{c.pick}}">{{c.label}}</button>
                  </sc-for></div></div>`
                    : ""
                }
                <sc-for list="{{fGroups}}" as="g" hint-placeholder-count="3">
                  <div class="fprow">
                    <span>{{g.label}}</span>
                    <div class="dd10 {{g.ddCls}}">
                      <button type="button" class="btn2 {{g.btnCls}}" aria-haspopup="listbox" aria-expanded="{{g.expanded}}" aria-label="{{g.aria}}" onClick="{{g.toggle}}">{{g.value}}<span class="ddcaret">${D10I.caretDown}</span></button>
                      <div class="pop10 {{g.ddCls}}" role="listbox" aria-label="{{g.label}}">
                        <sc-for list="{{g.opts}}" as="o" hint-placeholder-count="7">
                          <button type="button" class="opt10 {{o.cls}}" role="option" aria-selected="{{o.pressed}}" onClick="{{o.pick}}">{{o.label}}<span class="optcheck10"><sc-if value="{{o.on}}" hint-placeholder-val="{{ false }}">${D10I.check}</sc-if></span></button>
                        </sc-for>
                      </div>
                    </div>
                  </div>
                </sc-for>
                <div class="fpf">
                  <button type="button" class="lnk10" onClick="{{clearFilters}}">Clear all</button>
                  <button type="button" class="solid10" onClick="{{applyFilters}}">Apply</button>
                </div>
              </section>`;

const filterButton = () => `
              <button type="button" class="fbt10 {{filterBtnCls}}" title="Filters" aria-label="{{filterBtnLabel}}" aria-haspopup="dialog" aria-expanded="{{filtersExpanded}}" onClick="{{toggleFilters}}">${D10I.filter}<sc-if value="{{hasFilters}}" hint-placeholder-val="{{ false }}"><span class="fn10 tnum">{{filterCount}}</span></sc-if></button>`;

const searchBar = (phone) => `
            <div class="sbw10">
              <div class="sb10" role="search">
                <span class="ic">${D10I.search}</span>
                <input type="search" value="{{qValue}}" placeholder="{{${phone ? "qShort" : "qPlaceholder"}}}" aria-label="{{qPlaceholder}}" onKeyDown="{{qKey}}">
                <sc-if value="{{showClear}}" hint-placeholder-val="{{ false }}">
                  <button type="button" class="clr" title="Clear" aria-label="Clear the search" onClick="{{clear}}">${D10I.xSm}</button>
                </sc-if>
                ${phone ? "" : `<button type="button" class="sbch" aria-haspopup="listbox" aria-expanded="{{chExpanded}}" aria-label="{{chAria}}" onClick="{{toggleCh}}">{{chLabel}}<span class="ddcaret">${D10I.caretDown}</span></button>`}
              </div>
              ${filterButton()}
              ${phone ? "" : `<div class="pop10 chpop {{chCls}}" role="listbox" aria-label="Search by">${chOptions()}
              </div>
              <sc-if value="{{showFilters}}" hint-placeholder-val="{{ false }}">${filterPanel(false)}
              </sc-if>`}
            </div>`;

/* The sections: a rail on the desktop, a floating bar on the phone. */
const RAIL_ROWS = [
  { id: "feed", label: "Feed", icon: D10I.feed, iconLg: D10I.feedLg },
  { id: "digests", label: "Digests", icon: D10I.digests, iconLg: D10I.digestsLg },
  { id: "knowledge", label: "Knowledge", icon: D10I.knowledge, iconLg: D10I.knowledgeLg },
  { id: "saved", label: "Saved", icon: D10I.savedRail, iconLg: D10I.savedRailLg },
];
const rail = () => `
            <nav class="rail10" aria-label="Trends">
              ${RAIL_ROWS.map(
                (r) =>
                  `<button type="button" class="rrow {{t10railCls.${r.id}}}" aria-current="{{t10railCur.${r.id}}}" onClick="{{tabGo.${r.id}}}"><span class="ri">${r.icon}</span><span>${r.label}</span></button>`,
              ).join("\n              ")}
            </nav>`;
const floatingNav = () => `
    <nav class="fnav10" aria-label="Trends">
      ${RAIL_ROWS.map(
        (r) =>
          `<button type="button" class="fn {{t10railCls.${r.id}}}" aria-current="{{t10railCur.${r.id}}}" onClick="{{tabGo.${r.id}}}">${r.iconLg}<span>${r.label}</span></button>`,
      ).join("\n      ")}
    </nav>`;

/* Useful and not useful, as a thumb up and a thumb down (Garreth,
   2026-09-18): on every post and in the details window. Pressing one fills
   it; pressing it again takes the vote back. */
const votes = (row) =>
  `<button type="button" class="fbtn" title="Useful" aria-label="Useful" aria-pressed="{{${row}.upOn}}" onClick="{{${row}.up}}"><sc-if value="{{${row}.notUp}}" hint-placeholder-val="{{ true }}">${D10I.up}</sc-if><sc-if value="{{${row}.isUp}}" hint-placeholder-val="{{ false }}">${D10I.upOn}</sc-if></button>` +
  `<button type="button" class="fbtn" title="Not useful" aria-label="Not useful" aria-pressed="{{${row}.downOn}}" onClick="{{${row}.down}}"><sc-if value="{{${row}.notDown}}" hint-placeholder-val="{{ true }}">${D10I.down}</sc-if><sc-if value="{{${row}.isDown}}" hint-placeholder-val="{{ false }}">${D10I.downOn}</sc-if></button>`;

/* One post in the feed, Instagram's layout on both sizes. */
const feedCard = () => `
                <article class="fcard" aria-label="{{f.label}}">
                  <div class="fhead">
                    <span class="fav" aria-hidden="true">${net("f", true)}</span>
                    <span class="fwho">
                      <span class="l1"><b title="{{f.handle}}">{{f.handle}}</b><sc-if value="{{f.hasDate}}" hint-placeholder-val="{{ true }}"><span class="dt tnum">· {{f.date}}</span></sc-if></span>
                      <span class="l2">{{f.tagsLine}}<sc-if value="{{f.hasMatch}}" hint-placeholder-val="{{ false }}"><span class="m tnum"> · {{f.matchText}}</span></sc-if></span>
                    </span>
                    <button type="button" class="ghost10" onClick="{{f.view}}">View Post</button>
                  </div>
                  <div class="fview">
                    <div class="ftrack" aria-label="Slides, swipe sideways">
                      <sc-for list="{{f.track}}" as="sl" hint-placeholder-count="7">
                        <span class="fsl {{sl.cls}}" aria-hidden="true">
                          <sc-if value="{{sl.gone}}" hint-placeholder-val="{{ false }}"><span class="gone">${D10I.broken}<b>Image gone</b></span></sc-if>
                        </span>
                      </sc-for>
                    </div>
                    <span class="fcount tnum">{{f.counter}}</span>
                    <button type="button" class="farrow farrow--l {{f.arrowCls}}" aria-label="Previous slide" onClick="{{f.prev}}">${D10I.prev}</button>
                    <button type="button" class="farrow farrow--r {{f.arrowCls}}" aria-label="Next slide" onClick="{{f.next}}">${D10I.next}</button>
                  </div>
                  <div class="fdots" role="group" aria-label="Slides">
                    <sc-for list="{{f.slides}}" as="sl" hint-placeholder-count="7">
                      <button type="button" class="fdot {{sl.dotCls}}" aria-label="{{sl.label}}" aria-pressed="{{sl.pressed}}" onClick="{{sl.pick}}"></button>
                    </sc-for>
                  </div>
                  <div class="fact">
                    ${votes("f")}
                    <span class="sp"></span>
                    <button type="button" class="ghost10" onClick="{{f.use}}">${D10I.studio}Copy to Studio</button>
                    <button type="button" class="ghost10" onClick="{{f.details}}">View Details</button>
                  </div>
                  <sc-if value="{{f.hasMeta}}" hint-placeholder-val="{{ true }}"><span class="fmeta fnums tnum">{{f.meta}}</span></sc-if>
                  <p class="fcap"><b>{{f.handle}}</b>{{f.hook}}</p>
                </article>`;

/*
 * The details window (Garreth, 2026-09-18): the post's slides at the left, and
 * at the right who posted it, Details and Analysis as two tabs, and along the
 * foot the votes, Save, View Post and Copy to Studio. The X at the upper right
 * closes it, back to wherever it was opened from.
 */
const detailsWindow = (phone) => `
  <sc-if value="{{showDet}}" hint-placeholder-val="{{ false }}">
    <div class="dscrim">
      <section class="dmodal" role="dialog" aria-modal="true" aria-label="{{det.label}}">
        <div class="dleft">
          <div class="fview">
            <div class="ftrack" aria-label="Slides, swipe sideways">
              <sc-for list="{{det.track}}" as="sl" hint-placeholder-count="6">
                <span class="fsl {{sl.cls}}" aria-hidden="true">
                  <sc-if value="{{sl.gone}}" hint-placeholder-val="{{ false }}"><span class="gone">${D10I.broken}<b>Image gone</b></span></sc-if>
                </span>
              </sc-for>
            </div>
            <span class="fcount tnum">{{det.counter}}</span>
            <button type="button" class="farrow farrow--l show" aria-label="Previous slide" onClick="{{det.prev}}">${D10I.prev}</button>
            <button type="button" class="farrow farrow--r show" aria-label="Next slide" onClick="{{det.next}}">${D10I.next}</button>
          </div>
          <div class="fdots" role="group" aria-label="Slides">
            <sc-for list="{{det.slides}}" as="sl" hint-placeholder-count="6">
              <button type="button" class="fdot {{sl.dotCls}}" aria-label="{{sl.label}}" aria-pressed="{{sl.pressed}}" onClick="{{sl.pick}}"></button>
            </sc-for>
          </div>
        </div>
        <div class="dright">
          <header class="dhd">
            <span class="fav" aria-hidden="true">${net("det", true)}</span>
            <span class="fwho">
              <span class="l1"><b title="{{det.handle}}">{{det.handle}}</b></span>
              <span class="l2">{{det.tagsLine}}<sc-if value="{{det.hasMatch}}" hint-placeholder-val="{{ false }}"><span class="m tnum"> · {{det.matchText}}</span></sc-if></span>
            </span>
            <button type="button" class="dx" title="Close" aria-label="Close" onClick="{{closeDet}}">${D10I.close}</button>
          </header>
          <div class="dsheet {{sheetCls}}"${phone ? ` id="t10-sheet"` : ""}>
          ${phone ? `<button type="button" class="dgrab" aria-label="{{sheetLabel}}" aria-expanded="{{sheetUp}}" onClick="{{sheetToggle}}"${SHEET_PULL}><span></span></button>` : ""}
          <div class="dtabs" role="tablist"${phone ? SHEET_PULL : ""}>
            <button type="button" class="dtab {{dtabCls.details}}" role="tab" aria-selected="{{dtabSel.details}}" onClick="{{dtabGo.details}}">Details</button>
            <button type="button" class="dtab {{dtabCls.analysis}}" role="tab" aria-selected="{{dtabSel.analysis}}" onClick="{{dtabGo.analysis}}">Analysis</button>
            <button type="button" class="dtab {{dtabCls.words}}" role="tab" aria-selected="{{dtabSel.words}}" onClick="{{dtabGo.words}}">Transcription</button>
          </div>
          <sc-if value="{{isDetails}}" hint-placeholder-val="{{ true }}">
            <div class="dbody" role="tabpanel" aria-label="Details">
              <div class="dstats">
                <sc-for list="{{det.stats}}" as="n" hint-placeholder-count="3">
                  <span class="dstat"><span>{{n.k}}</span><b class="tnum {{n.cls}}">{{n.v}}</b></span>
                </sc-for>
              </div>
              <div class="drows">
                <sc-for list="{{det.rows}}" as="r" hint-placeholder-count="3">
                  <div class="drow"><span>{{r.k}}</span><b class="tnum {{r.cls}}">{{r.v}}</b></div>
                </sc-for>
              </div>
              <p class="dcap"><b>{{det.handle}}</b>{{det.caption}}</p>
            </div>
          </sc-if>
          <sc-if value="{{isRead}}" hint-placeholder-val="{{ false }}">
            <div class="dbody" role="tabpanel" aria-label="{{readLabel}}">
              <sc-if value="{{anReadyWords}}" hint-placeholder-val="{{ false }}">
                <div class="danh"><span class="n tnum">{{anCoverage}}</span></div>
                <div>
                  <sc-for list="{{anLines}}" as="l" hint-placeholder-count="6">
                      <div class="dline"><span class="no tnum">{{l.no}}</span><span class="tx"><sc-if value="{{l.opening}}" hint-placeholder-val="{{ false }}"><span class="op">Opening slide</span></sc-if><span class="{{l.cls}}">{{l.text}}</span><sc-if value="{{l.hasVisual}}" hint-placeholder-val="{{ true }}"><span class="vis">{{l.visual}}</span></sc-if></span><sc-if value="{{l.hasRole}}" hint-placeholder-val="{{ true }}"><span class="pill pill--quiet role">{{l.role}}</span></sc-if></div>
                  </sc-for>
                </div>
              </sc-if>
              <sc-if value="{{anReadyAnalysis}}" hint-placeholder-val="{{ true }}">
                <div class="danh"><span class="pill {{anStatusCls}}">{{anStatus}}</span><span class="n">{{anBy}}</span></div>
                <div class="dacc {{acc.summary.cls}}">
                  <button type="button" class="dacch" aria-expanded="{{acc.summary.expanded}}" onClick="{{acc.summary.toggle}}"><span class="t">Summary</span><span class="ddcaret">${D10I.caretDown}</span></button>
                  <sc-if value="{{acc.summary.open}}" hint-placeholder-val="{{ false }}">
                    <div class="daccb">
                      <div class="dtags">
                        <sc-for list="{{anTags}}" as="a" hint-placeholder-count="7">
                          <span class="dtag"><span>{{a.k}}</span><span class="pill pill--quiet">{{a.v}}</span></span>
                        </sc-for>
                      </div>
                    </div>
                  </sc-if>
                </div>
                <div class="dacc {{acc.how.cls}}">
                  <button type="button" class="dacch" aria-expanded="{{acc.how.expanded}}" onClick="{{acc.how.toggle}}"><span class="t">How it works</span><span class="ddcaret">${D10I.caretDown}</span></button>
                  <sc-if value="{{acc.how.open}}" hint-placeholder-val="{{ false }}">
                    <div class="daccb">
                      <sc-for list="{{anNotes}}" as="a" hint-placeholder-count="5">
                        <div class="dline"><span class="no wide">{{a.k}}</span><span class="tx">{{a.v}}</span></div>
                      </sc-for>
                    </div>
                  </sc-if>
                </div>
                <sc-if value="{{anHasPattern}}" hint-placeholder-val="{{ true }}">
                <div class="dacc {{acc.pattern.cls}}">
                  <button type="button" class="dacch" aria-expanded="{{acc.pattern.expanded}}" onClick="{{acc.pattern.toggle}}"><span class="t">Reusable pattern</span><span class="ddcaret">${D10I.caretDown}</span></button>
                  <sc-if value="{{acc.pattern.open}}" hint-placeholder-val="{{ false }}">
                    <div class="daccb">
                      <span class="dsub">Keep</span>
                      <ul class="dlist"><sc-for list="{{anKeep}}" as="k" hint-placeholder-count="4"><li>{{k.t}}</li></sc-for></ul>
                      <span class="dsub">Limits</span>
                      <ul class="dlist"><sc-for list="{{anLimits}}" as="k" hint-placeholder-count="2"><li>{{k.t}}</li></sc-for></ul>
                    </div>
                  </sc-if>
                </div>
                </sc-if>
                <sc-if value="{{anHasAudience}}" hint-placeholder-val="{{ true }}">
                <div class="dacc {{acc.audience.cls}}">
                  <button type="button" class="dacch" aria-expanded="{{acc.audience.expanded}}" onClick="{{acc.audience.toggle}}"><span class="t">Audience response</span><span class="ddcaret">${D10I.caretDown}</span></button>
                  <sc-if value="{{acc.audience.open}}" hint-placeholder-val="{{ false }}">
                    <div class="daccb">
                      <sc-if value="{{anAudienceThin}}" hint-placeholder-val="{{ false }}"><p class="dmuted">Too few comments to read</p></sc-if>
                      <sc-if value="{{anAudienceFull}}" hint-placeholder-val="{{ true }}">
                        <div class="dpills"><sc-for list="{{anThemes}}" as="k" hint-placeholder-count="3"><span class="pill pill--quiet">{{k.t}}</span></sc-for></div>
                        <ul class="dlist"><sc-for list="{{anQuestions}}" as="k" hint-placeholder-count="2"><li>{{k.t}}</li></sc-for></ul>
                      </sc-if>
                    </div>
                  </sc-if>
                </div>
                </sc-if>
              </sc-if>
              <sc-if value="{{anNone}}" hint-placeholder-val="{{ false }}">
                <div class="dnone">
                  <span class="ic">${D10I.text}</span>
                  <p>Not transcribed or analysed yet</p>
                  <button type="button" class="ghost10" onClick="{{anRun}}">${D10I.spark}Transcribe and analyse</button>
                </div>
              </sc-if>
              <sc-if value="{{anWorking}}" hint-placeholder-val="{{ false }}">
                <div class="work10" role="status">
                  <b><span class="spin on">${I.busy}</span>{{anWorkNow}}</b>
                  <span>{{anWorkDone}}</span>
                </div>
                <sc-if value="{{isWords}}" hint-placeholder-val="{{ false }}">
                  <div class="danh"><span class="n tnum">{{anCoverage}}</span></div>
                  <div>
                    <sc-for list="{{anLines}}" as="l" hint-placeholder-count="2">
                      <div class="dline"><span class="no tnum">{{l.no}}</span><span class="tx"><sc-if value="{{l.opening}}" hint-placeholder-val="{{ false }}"><span class="op">Opening slide</span></sc-if><span class="{{l.cls}}">{{l.text}}</span><sc-if value="{{l.hasVisual}}" hint-placeholder-val="{{ true }}"><span class="vis">{{l.visual}}</span></sc-if></span><sc-if value="{{l.hasRole}}" hint-placeholder-val="{{ true }}"><span class="pill pill--quiet role">{{l.role}}</span></sc-if></div>
                    </sc-for>
                  </div>
                </sc-if>
              </sc-if>
              <sc-if value="{{anBlocked}}" hint-placeholder-val="{{ false }}">
                <div class="dsec">
                  <h3 class="dsh">Analysis<span class="n"><span class="pill is-bad">Blocked</span></span></h3>
                  <div class="fail10" role="status">
                    <span class="ft">${D10I.warn}{{anBlockedText}}</span>
                    <button type="button" class="btn2" onClick="{{anRun}}">${D10I.retry}Try again</button>
                  </div>
                </div>
              </sc-if>
              <sc-if value="{{anFailed}}" hint-placeholder-val="{{ false }}">
                <div class="fail10" role="status">
                  <span class="ft">${D10I.warn}{{anFailText}}</span>
                  <button type="button" class="btn2" onClick="{{anRun}}">${D10I.retry}Retry</button>
                </div>
              </sc-if>
            </div>
          </sc-if>
          </div>
          <footer class="dft">
            ${votes("det")}
            <button type="button" class="fbtn" title="{{det.saveLabel}}" aria-label="{{det.saveLabel}}" aria-pressed="{{det.savedOn}}" onClick="{{det.save}}"><sc-if value="{{det.unsaved}}" hint-placeholder-val="{{ true }}">${D10I.bookmark}</sc-if><sc-if value="{{det.saved}}" hint-placeholder-val="{{ false }}">${D10I.bookmarkOn}</sc-if></button>
            <span class="sp"></span>
            <button type="button" class="ghost10" onClick="{{det.view}}">${phone ? "" : D10I.link}View Post</button>
            <button type="button" class="ghost10" onClick="{{det.use}}">${D10I.studio}Copy to Studio</button>
          </footer>
        </div>
      </section>
    </div>
  </sc-if>
  ${
    phone
      ? `<sc-if value="{{showFilters}}" hint-placeholder-val="{{ false }}"><div class="dscrim" aria-hidden="true" onClick="{{toggleFilters}}"></div>${filterPanel(true)}</sc-if>`
      : ""
  }`;

const feedPanel = () => `
          <div class="fwrap">
            <div class="fcol">
              <sc-if value="{{showRes}}" hint-placeholder-val="{{ false }}">
                <div class="fres" role="status">
                  <span class="busy"><sc-if value="{{resBusy}}" hint-placeholder-val="{{ false }}"><span class="spin on">${I.busy}</span></sc-if><span><b>{{resText}}</b><sc-if value="{{hasResNote}}" hint-placeholder-val="{{ false }}"><span class="n"> · {{resNote}}</span></sc-if></span></span>
                </div>
              </sc-if>
              <sc-if value="{{showChips}}" hint-placeholder-val="{{ false }}">
                <div class="fused" role="group" aria-label="Filters on this search">
                  <sc-for list="{{usedFilters}}" as="u" hint-placeholder-count="2">
                    <button type="button" class="fchip on fx" aria-label="{{u.aria}}" title="{{u.aria}}" onClick="{{u.remove}}"><span>{{u.label}}</span>${D10I.x}</button>
                  </sc-for>
                  <sc-if value="{{showClearFilters}}" hint-placeholder-val="{{ false }}"><button type="button" class="lnk10" onClick="{{clearFilters}}">Clear all</button></sc-if>
                </div>
              </sc-if>
              <sc-if value="{{showSearchFail}}" hint-placeholder-val="{{ false }}">
                <div class="fail10" role="status">
                  <span class="ft">${D10I.warn}{{searchFailText}}</span>
                  <button type="button" class="btn2" onClick="{{searchRetry}}">${D10I.retry}Retry</button>
                </div>
              </sc-if>
              <sc-if value="{{showCreators}}" hint-placeholder-val="{{ false }}">
                <section class="c10" aria-label="Accounts found">
                  <sc-for list="{{creators}}" as="c" hint-placeholder-count="3">
                    <button type="button" class="crow" onClick="{{c.pick}}">
                      <span class="cw">
                        <span class="l1">${net("c")}<b>{{c.handle}}</b></span>
                        <span class="l2 tnum">{{c.stats}}</span>
                      </span>
                      <span class="go">${D10I.caret}</span>
                    </button>
                  </sc-for>
                </section>
              </sc-if>
              <sc-if value="{{showGrid}}" hint-placeholder-val="{{ false }}">
                <div class="grid10" role="list" aria-label="Carousels found">
                  <sc-for list="{{grid}}" as="g" hint-placeholder-count="6">
                    <button type="button" class="gt {{g.cls}}" role="listitem" aria-label="{{g.label}}" onClick="{{g.open}}"><span class="gm">${D10I.cards}</span><span class="gq tnum">{{g.count}}</span></button>
                  </sc-for>
                </div>
              </sc-if>
              <sc-if value="{{showCaught}}" hint-placeholder-val="{{ false }}">
                <div class="fnew" role="status"><span class="ic">${D10I.check}</span>No new carousels</div>
              </sc-if>
              <sc-if value="{{showNewPosts}}" hint-placeholder-val="{{ false }}">
                <div class="fnew"><button type="button" class="ghost10" onClick="{{loadNew}}">{{newPostsText}}</button></div>
              </sc-if>
              <sc-for list="{{feed}}" as="f" hint-placeholder-count="6">${feedCard()}
              </sc-for>
              <sc-if value="{{showFeedEmpty}}" hint-placeholder-val="{{ false }}">
                <div class="es10 {{feedEmptyCls}}">
                  <span class="ic">${D10I.trend}</span>
                  <p>{{feedEmptyText}}</p>
                </div>
              </sc-if>
              <sc-if value="{{showMore}}" hint-placeholder-val="{{ false }}">
                <div class="fmore" role="status"><b><span class="spin on">${I.busy}</span>Loading more</b></div>
              </sc-if>
              <sc-if value="{{showOlder}}" hint-placeholder-val="{{ false }}">
                <div class="folder" role="status">
                  <span class="fnew"><span class="ic">${D10I.check}</span>No more new carousels</span>
                  <button type="button" class="ghost10" onClick="{{seeOlder}}">See older carousels</button>
                </div>
              </sc-if>
              <sc-if value="{{showEnd}}" hint-placeholder-val="{{ false }}">
                <div class="fend">{{endText}}</div>
              </sc-if>
            </div>
          </div>`;

/* Recent saves, beside the feed on the desktop. */
const savedPanel = () => `
            <aside class="saved10">
              <section class="c10" aria-label="Recent saves">
                <h2 class="svh">Recent saves</h2>
                <sc-for list="{{svRows}}" as="v" hint-placeholder-count="5">
                  <button type="button" class="svrow" onClick="{{v.open}}">
                    <span class="svth {{v.thCls}}" aria-hidden="true"></span>
                    <span class="svt"><b>{{v.handle}}</b><span class="tnum">{{v.stats}}</span></span>
                  </button>
                </sc-for>
                <sc-if value="{{svEmpty}}" hint-placeholder-val="{{ false }}">
                  <p class="svnone">Nothing saved yet</p>
                </sc-if>
                <sc-if value="{{svHasAny}}" hint-placeholder-val="{{ true }}">
                  <div class="svall"><button type="button" class="btn2" onClick="{{svAll}}">View all saves</button></div>
                </sc-if>
              </section>
            </aside>`;

const digestsPanel = (phone) => `
          <div class="dg">
            <section class="c10 dglist" aria-label="Digests">
              <sc-for list="{{digests}}" as="d" hint-placeholder-count="7">
                <button type="button" class="dgrow {{d.cls}}" aria-current="{{d.current}}" onClick="{{d.open}}">
                  <span class="dgd tnum">{{d.date}}</span>
                  <span class="dgs {{d.stateCls}}">{{d.stateText}}</span>
                </button>
              </sc-for>
            </section>
            <section class="c10 dgmain" aria-label="{{openLabel}}">
              <div class="dgpad">
                <div class="dghead">
                  <span class="dght">
                    <h2>{{openSubject}}</h2>
                    <span class="tnum">{{openMeta}}</span>
                  </span>
                  <sc-if value="{{showAnalyse}}" hint-placeholder-val="{{ true }}">
                    <button type="button" class="cta {{analyseCls}}" disabled="{{analyseOff}}" onClick="{{analyse}}"><span class="spin {{analyseSpin}}"><sc-if value="{{analyseIdle}}" hint-placeholder-val="{{ true }}">${D10I.spark}</sc-if><sc-if value="{{analyseBusy}}" hint-placeholder-val="{{ false }}">${I.busy}</sc-if></span>{{analyseLabel}}</button>
                  </sc-if>
                  <sc-if value="{{showAgain}}" hint-placeholder-val="{{ false }}">
                    <button type="button" class="btn2" onClick="{{again}}">${D10I.retry}Analyse again</button>
                  </sc-if>
                </div>
                <div class="dgbody" tabindex="0" role="region" aria-label="{{bodyLabel}}">
                  <sc-for list="{{body}}" as="b" hint-placeholder-count="9">
                    <p class="{{b.cls}}">{{b.text}}</p>
                  </sc-for>
                </div>
                <sc-if value="{{showWork}}" hint-placeholder-val="{{ false }}">
                  <div class="work10" role="status">
                    <b><span class="spin on">${I.busy}</span>{{workNow}}</b>
                    <span>{{workDone}}</span>
                  </div>
                </sc-if>
                <sc-if value="{{showFail}}" hint-placeholder-val="{{ false }}">
                  <div class="fail10" role="status">
                    <span class="ft">${D10I.warn}{{failText}}</span>
                    <button type="button" class="btn2" onClick="{{retry}}">${D10I.retry}Retry</button>
                  </div>
                </sc-if>
                <sc-if value="{{showRules}}" hint-placeholder-val="{{ false }}">
                  <div class="sec10">
                    <h3 class="sh10">Proposed rules<span class="n tnum">{{ruleCount}}</span></h3>
                    <sc-for list="{{rules}}" as="r" hint-placeholder-count="3">
                      <div class="rule10">
                        <div class="rtop">
                          <span class="rtext">{{r.text}}</span>
                          <span class="pill pill--accent">{{r.status}}</span>
                        </div>
                        <div class="rev">
                          <sc-for list="{{r.evidence}}" as="e" hint-placeholder-count="2">
                            <span><span class="q">${D10I.quotes}</span>{{e.line}}</span>
                          </sc-for>
                        </div>
                        <div class="rmeta">
                          <span class="pill tnum">Confidence {{r.conf}}</span>
                          <sc-for list="{{r.types}}" as="t" hint-placeholder-count="2">
                            <span class="pill pill--quiet">{{t.name}}</span>
                          </sc-for>
                        </div>
                      </div>
                    </sc-for>
                  </div>
                </sc-if>
                <sc-if value="{{showPosts}}" hint-placeholder-val="{{ false }}">
                  <div class="sec10">
                    <h3 class="sh10">Carousels it read<span class="n tnum">{{postCount}}</span></h3>
                    <sc-for list="{{posts}}" as="p" hint-placeholder-count="3">
                      <div class="post10">
                        <div class="phead">
                          <span class="pwho">
                            <span class="l1">${net("p")}<b title="{{p.title}}">{{p.title}}</b></span>
                            <span class="l2 tnum">{{p.meta}}</span>
                          </span>
                          <button type="button" class="btn2" onClick="{{p.use}}">${D10I.studio}Copy to Studio</button>
                        </div>
                        <div class="pstrip">
                          <sc-for list="{{p.slides}}" as="sl" hint-placeholder-count="5">
                            <span class="pslide {{sl.cls}}" aria-hidden="true"></span>
                          </sc-for>
                        </div>
                      </div>
                    </sc-for>
                    <sc-for list="{{queuedPosts}}" as="q" hint-placeholder-count="2">
                      <div class="pqueue">
                        ${net("q")}
                        <span class="u">{{q.url}}</span>
                        <span class="w tnum">${D10I.clock}Queued since {{q.since}}</span>
                      </div>
                    </sc-for>
                  </div>
                </sc-if>
              </div>
            </section>
          </div>`;

const knowledgePanel = (phone) => `
          <div class="kb">
            <div class="kbf">
              <div class="chips10" role="group" aria-label="Filter by carousel type">
                <sc-for list="{{kChips}}" as="c" hint-placeholder-count="6">
                  <button type="button" class="chip10 {{c.cls}}" aria-pressed="{{c.pressed}}" title="{{c.name}}" onClick="{{c.pick}}"><span>{{c.name}}</span></button>
                </sc-for>
              </div>
              <div class="dd10 {{ddCls}}">
                <button type="button" class="btn2" aria-haspopup="listbox" aria-expanded="{{ddExpanded}}" onClick="{{toggleConf}}">{{confLabel}}<span class="ddcaret">${D10I.caretDown}</span></button>
                <div class="pop10 {{ddCls}}" role="listbox" aria-label="Confidence" onKeyDown="{{ddKey}}">
                  <sc-for list="{{confOpts}}" as="c" hint-placeholder-count="4">
                    <button type="button" class="opt10 {{c.cls}}" role="option" aria-selected="{{c.selected}}" onClick="{{c.pick}}">{{c.label}}<span class="optcheck10"><sc-if value="{{c.isSelected}}" hint-placeholder-val="{{ false }}">${D10I.check}</sc-if></span></button>
                  </sc-for>
                </div>
              </div>
            </div>
            <div class="kbscroll">
              <sc-if value="{{showPending}}" hint-placeholder-val="{{ true }}">
                <section class="c10" aria-label="Pending rules">
                  ${phone ? "" : `<div class="khead kgrid"><span>Pending</span><span>Applies to</span><span>Confidence</span><span></span></div>`}
                  ${phone ? `<div class="khead">Pending</div>` : ""}
                  <sc-for list="{{pending}}" as="k" hint-placeholder-count="4">
                    <div class="krow ${phone ? "" : "kgrid"}">
                      <span class="kt"><b>{{k.text}}</b><span>{{k.from}}</span></span>
                      ${phone ? `<span class="kmeta"><span class="pill tnum">{{k.conf}}</span>` : `<span class="ktypes">`}
                      <sc-for list="{{k.types}}" as="t" hint-placeholder-count="2">
                        <span class="pill pill--quiet">{{t.name}}</span>
                      </sc-for>
                      </span>
                      ${phone ? "" : `<span class="tnum">{{k.conf}}</span>`}
                      <span class="kact">
                        <button type="button" class="kbtn is-yes" onClick="{{k.accept}}">${D10I.checkSm}Accept</button>
                        <button type="button" class="kbtn" onClick="{{k.reject}}">${D10I.x}Reject</button>
                      </span>
                    </div>
                  </sc-for>
                </section>
              </sc-if>
              <sc-if value="{{showNonePending}}" hint-placeholder-val="{{ false }}">
                <div class="es10 {{nonePendingCls}}">
                  <span class="ic">${D10I.trend}</span>
                  <p>{{nonePendingText}}</p>
                </div>
              </sc-if>
              <sc-if value="{{showAccepted}}" hint-placeholder-val="{{ true }}">
                <section class="c10" aria-label="Accepted rules">
                  ${phone ? "" : `<div class="khead kgrid"><span>Accepted<span class="tabn tnum">{{acceptedCount}}</span></span><span>Applies to</span><span>Confidence</span><span></span></div>`}
                  ${phone ? `<div class="khead">Accepted<span class="tabn tnum">{{acceptedCount}}</span></div>` : ""}
                  <sc-for list="{{accepted}}" as="k" hint-placeholder-count="4">
                    <div class="krow ${phone ? "" : "kgrid"}">
                      <span class="kt"><b>{{k.text}}</b><span>{{k.from}}</span></span>
                      ${phone ? `<span class="kmeta"><span class="pill tnum">{{k.conf}}</span>` : `<span class="ktypes">`}
                      <sc-for list="{{k.types}}" as="t" hint-placeholder-count="2">
                        <span class="pill pill--quiet">{{t.name}}</span>
                      </sc-for>
                      </span>
                      ${phone ? "" : `<span class="tnum">{{k.conf}}</span>`}
                      <span class="kact"></span>
                    </div>
                  </sc-for>
                </section>
              </sc-if>
            </div>
          </div>
          <div class="catch10 {{ddCls}}" aria-hidden="true" onClick="{{closeConf}}"></div>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page">
          <div class="t10head">
            <h1>Trends</h1>
            ${searchBar(phone)}
          </div>
          <div class="tbody">
            ${phone ? "" : rail()}
            <sc-if value="{{is.column}}" hint-placeholder-val="{{ true }}">
              <div role="region" aria-label="{{columnLabel}}" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">${feedPanel()}</div>
            </sc-if>
            ${phone ? "" : `<sc-if value="{{is.feed}}" hint-placeholder-val="{{ true }}">${savedPanel()}</sc-if>`}
            <sc-if value="{{is.digests}}" hint-placeholder-val="{{ false }}">
              <div role="region" aria-label="Digests" class="panel10">
                <sc-if value="{{hasDigests}}" hint-placeholder-val="{{ true }}">${digestsPanel(phone)}</sc-if>
                <sc-if value="{{noDigests}}" hint-placeholder-val="{{ false }}">
                  <div class="es10">
                    <span class="ic">${D10I.trend}</span>
                    <p>{{noDigestsText}}</p>
                  </div>
                </sc-if>
              </div>
            </sc-if>
            <sc-if value="{{is.knowledge}}" hint-placeholder-val="{{ false }}">
              <div role="region" aria-label="Knowledge" class="panel10">${knowledgePanel(phone)}</div>
            </sc-if>
          </div>
        </div>
      </main>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(init) {
  return `
    var FEED = ${JSON.stringify(FEED)};
    var SEARCH = ${JSON.stringify(SEARCH)};
    var NO_MATCH_Q = ${JSON.stringify(NO_MATCH_Q)};
    var ACCOUNTS = ${JSON.stringify(ACCOUNTS)};
    var CREATOR = ${JSON.stringify(CREATOR)};
    var DIGESTS = ${JSON.stringify(DIGESTS)};
    var BODY = ${JSON.stringify(BODY)};
    var RULES = ${JSON.stringify(RULES)};
    var OLDER_RULE = ${JSON.stringify(OLDER_RULE)};
    var ACCEPTED = ${JSON.stringify(ACCEPTED)};
    var ACCEPTED_TOTAL = ${ACCEPTED_TOTAL};
    var POSTS = ${JSON.stringify(POSTS)};
    var QUEUED_POSTS = ${JSON.stringify(QUEUED_POSTS)};
    var TYPES = ${JSON.stringify(TYPES)};
    var CONFS = ${JSON.stringify(CONFS)};
    var CHANNELS = ${JSON.stringify(CHANNELS)};
    var FILTERS = ${JSON.stringify(FILTERS)};
    var ANALYSIS = ${JSON.stringify(ANALYSIS)};
    var ANALYSIS_ANY = ${JSON.stringify(ANALYSIS_ANY)};
    var ANALYSIS_POOL = ${JSON.stringify(ANALYSIS_POOL)};
    var ANALYSIS_PART = ${JSON.stringify(ANALYSIS_PART)};
    var ANALYSIS_THIN = ${JSON.stringify(ANALYSIS_THIN)};

    var firstRun = ${init.empty === "first"};
    /* "Every digest analysed" is the all-clear: the accent leaves the screen
       because there is nothing waiting to be run. */
    var allDone = ${init.allDone === true};
    var working = ${init.working === true};
    var nothingPending = ${init.pending === false};
    /* The feed's own review moments: a slide whose link died, the next page
       on its way, the end of the library, and arrows shown without a hover. */
    var goneOn = ${JSON.stringify(init.gone || null)};
    var moreState = ${JSON.stringify(init.more || null)};
    var arrowsOn = ${init.arrows === true};
    var feedTake = ${init.take || 0};
    /* Round three's review moments: a search on its way or failed, and what
       the library holds on the open post (ready, part, none, working, failed). */
    var searchState = ${JSON.stringify(init.searchState || null)};
    var anState = ${JSON.stringify(init.analysis || "ready")};
    var feedState = ${JSON.stringify(init.feedState || null)};
    var anScrolled = ${init.anScrolled === true};

    var SHEET_REST = ${SHEET_REST};
    var SHEET_RAISED = ${SHEET_RAISED};
    /* Letting go of a pull over the grab bar or a tab also sends that button a click. */
    var justPulled = function () { return !!self.t10pulledAt && Date.now() - self.t10pulledAt < 400; };

    var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };

    /* ── The search bar ── */
    var q = s.t10q || "";
    var creator = s.t10creator || null;
    var searching = !!q && !creator;
    var noMatch = searching && q === NO_MATCH_Q;
    /* The filters that are on, and how the search reads the library. */
    var filt = s.t10f || {};
    var filtCount = 0;
    FILTERS.forEach(function (g) { var v = filt[g.id]; if (v && v !== g.opts[0]) filtCount += 1; });
    var channel = CHANNELS.filter(function (c) { return c.id === s.t10ch; })[0] || CHANNELS[0];
    /* One query finds creators and carousels alike. */
    var found = !searching ? null : q === ACCOUNTS.q ? ACCOUNTS : q === SEARCH.q ? SEARCH : { total: 0, hits: [], rows: [] };
    /* Filters narrow what a search found. */
    if (found && filtCount && found.hits.length) found = { total: 5, hits: found.hits.slice(0, 5), rows: [] };
    var searchBusy = searching && searchState === "loading";
    var searchFailed = searching && searchState === "failed";

    /* ── The feed ── */
    var savedIds = s.t10saved || [];
    var slideAt = s.t10slide || {};

    /* What the column holds: the feed, a search's carousels, or one
       creator's. Videos never reach any of them: the catalogue's format
       filter keeps them out before this screen sees a row. Nothing here is
       ours: the library holds other creators' posts. */
    var tab = s.t10tab || "feed";
    var cards = [];
    var matchOf = {};
    if (creator) {
      cards = CREATOR.cards.map(function (id) { return Object.assign({}, byId(FEED, id), { handle: creator, net: CREATOR.net, id: id + "-c" }); });
    } else if (searching) {
      found.hits.forEach(function (h) { matchOf[h.id] = h.slide; });
      /* The results are a grid; a tile opens that post in the details window. */
      cards = [];
    } else if (tab === "saved") {
      cards = [];
    } else {
      cards = FEED.slice();
    }
    if (feedTake) cards = cards.slice(0, feedTake);

    var votesOf = s.t10votes || {};
    var mkPost = function (f, idx) {
      var baseId = f.id.replace(/-c$/, "");
      var n = f.slides.length;
      var at = slideAt[f.id] != null ? slideAt[f.id] : (matchOf[baseId] ? matchOf[baseId] - 1 : 0);
      if (at < 0) at = 0; if (at >= n) at = n - 1;
      var isSaved = savedIds.indexOf(baseId) >= 0;
      var setSlide = function (i) { var next = Object.assign({}, slideAt); next[f.id] = i; self.setState({ t10slide: next }); };
      return {
        label: f.handle + ", " + f.hook,
        isTiktok: f.net === "tiktok",
        isInsta: f.net === "instagram",
        handle: f.handle,
        hasDate: !!f.date,
        date: f.date || "",
        tagsLine: f.tags.join(" \\u00b7 "),
        hook: f.hook,
        /* A number the library does not hold is left out, never shown as 0. */
        meta: [f.views && f.views + " views", f.likes && f.likes + " likes", f.saves && f.saves + " saves"].filter(Boolean).join(" \\u00b7 "),
        hasMeta: !!(f.views || f.likes || f.saves),
        isUp: votesOf[baseId] === "up", notUp: votesOf[baseId] !== "up", upOn: votesOf[baseId] === "up" ? "true" : "false",
        isDown: votesOf[baseId] === "down", notDown: votesOf[baseId] !== "down", downOn: votesOf[baseId] === "down" ? "true" : "false",
        up: function () { var v = Object.assign({}, votesOf); if (v[baseId] === "up") delete v[baseId]; else v[baseId] = "up"; self.setState({ t10votes: v }); },
        down: function () { var v = Object.assign({}, votesOf); if (v[baseId] === "down") delete v[baseId]; else v[baseId] = "down"; self.setState({ t10votes: v }); },
        details: function () { self.setState({ t10det: f.id, t10dtab: "details" }); },
        caption: f.caption || f.hook,
        stats: [["Views", f.views], ["Likes", f.likes], ["Saves", f.saves]].map(function (p) { return { k: p[0], v: p[1] || "Unknown", cls: p[1] ? "" : "unk" }; }),
        rows: [
          { k: "Posted", v: f.date || "Unknown", cls: f.date ? "" : "unk" },
          { k: "Platform", v: f.net === "tiktok" ? "TikTok" : "Instagram", cls: "" },
          { k: "Slides", v: String(n), cls: "" }
        ],
        counter: (at + 1) + " / " + n,
        arrowCls: arrowsOn && idx === 0 ? "show" : "",
        hasMatch: !!matchOf[baseId],
        matchText: matchOf[baseId] ? "Matches on slide " + matchOf[baseId] : "",
        /* The track starts on the slide showing, so a board can open a post
           on its third slide; the dots keep the deck's own order. */
        track: f.slides.slice(at).concat(f.slides.slice(0, at)).map(function (img, k) {
          var i = (at + k) % n;
          var gone = goneOn === baseId && i === 0;
          return { cls: gone ? "is-gone" : "ps-" + img, gone: gone };
        }),
        slides: f.slides.map(function (img, i) {
          var gone = goneOn === baseId && i === 0;
          return {
            cls: (gone ? "is-gone" : "ps-" + img) + (i === at ? " on" : ""),
            dotCls: i === at ? "on" : "",
            gone: gone,
            label: "Slide " + (i + 1) + " of " + n,
            pressed: i === at ? "true" : "false",
            pick: function () { setSlide(i); }
          };
        }),
        prev: function () { setSlide(at === 0 ? n - 1 : at - 1); },
        next: function () { setSlide(at === n - 1 ? 0 : at + 1); },
        saved: isSaved,
        unsaved: !isSaved,
        savedOn: isSaved ? "true" : "false",
        saveLabel: isSaved ? "Saved" : "Save",
        save: function () {
          var next = isSaved ? savedIds.filter(function (id) { return id !== baseId; }) : [baseId].concat(savedIds);
          self.setState({ t10saved: next });
        },
        view: function () { self.note("Opens the post on " + (f.net === "tiktok" ? "TikTok" : "Instagram") + ", in a new tab"); },
        use: function () {
          ctx.open("studio", { ref: f.hook, refNew: true },
            "Opens the Studio on \\u201c" + f.hook + "\\u201d, to build a template the same way \\u00b7 D6");
        }
      };
    };
    var feed = cards.map(mkPost);

    /* The details window: the open post, built the way a feed post is. */
    var detId = s.t10det || null;
    var detF = detId ? byId(FEED, detId.replace(/-c$/, "")) : null;
    var det = mkPost(detF ? Object.assign({}, detF, { id: detId }) : FEED[0], -1);
    var dtab = s.t10dtab === "analysis" || s.t10dtab === "words" ? s.t10dtab : "details";
    var an = detF ? ANALYSIS[detF.id] || null : null;
    var anLinesAll = (detF ? detF.slides : []).map(function (img, i) {
      var b = an ? an.beats[i] : (i === 0 ? Object.assign({}, ANALYSIS_POOL[0], { copy: detF.hook }) : ANALYSIS_POOL[i % ANALYSIS_POOL.length]);
      b = b || {};
      return { no: "Slide " + (i + 1), opening: i === 0, text: b.copy || "No words on this slide", cls: b.copy ? "" : "none",
        role: b.role || "", hasRole: !!b.role, visual: b.visual || "", hasVisual: !!b.visual };
    });
    /* Part-read and still-working decks show the slides read so far. */
    var anPart = anState === "part";
    var anShown = anState === "working" ? 2 : anPart ? Math.min(ANALYSIS_PART.slides, anLinesAll.length) : anLinesAll.length;
    /* A post with no analysis of its own borrows the general one, under its
       own topic and hook; its slides' words still come from the pool above. */
    if (!an && detF) an = Object.assign({}, ANALYSIS_ANY, {
      tags: [{ k: "Topic", v: detF.tags[0] }, ANALYSIS_ANY.tags[0], { k: "Hook", v: detF.tags[detF.tags.length - 1] }].concat(ANALYSIS_ANY.tags.slice(1))
    });
    var anTags = an ? an.tags : [];
    var anNotes = an ? an.notes : [];
    /* A row the library has nothing for is left out, never shown blank: the
       newer run's analyses carry fewer rows and no pattern or audience read. */
    var anThin = anState === "thin";
    if (anThin) {
      anTags = anTags.filter(function (t) { return ANALYSIS_THIN.tags.indexOf(t.k) >= 0; });
      anNotes = anNotes.filter(function (t) { return ANALYSIS_THIN.notes.indexOf(t.k) >= 0; });
    }
    var asRows = function (list) { return (list || []).map(function (t) { return { t: t }; }); };
    var anKeep = an && !anThin ? asRows(an.keep) : [];
    var anLimits = an && !anThin ? asRows(an.limits) : [];
    /* A part-read deck is usually one whose comments were thin too. */
    var anThemes = an && !anThin && !anPart ? asRows(an.themes) : [];
    var anQuestions = an && !anThin && !anPart ? asRows(an.questions) : [];

    /* The grid: one tile per carousel found, the slide that matched. */
    var grid = (searching && !searchBusy && !searchFailed ? found.hits : []).map(function (h) {
      var f = byId(FEED, h.id);
      return {
        cls: "ps-" + f.slides[h.slide - 1],
        label: f.handle + ", " + f.hook + ", matches on slide " + h.slide,
        count: f.slides.length + " slides",
        open: function () { self.setState({ t10det: h.id, t10dtab: "details", t10slide: {} }); }
      };
    });
    /* Saved is a grid too (Garreth, 2026-09-19), the way search results are:
       each tile the post's cover, newest saved first, opening the details
       window, which is also where a post is unsaved. */
    if (tab === "saved" && !searching && !creator) grid = savedIds.map(function (id) {
      var f = byId(FEED, id);
      return { cls: "ps-" + f.slides[0], label: f.handle + ", " + f.hook, count: f.slides.length + " slides",
        open: function () { self.setState({ t10det: id, t10dtab: "details" }); } };
    });
    /* A search on its way: the tiles it will fill. */
    if (searchBusy) grid = [0, 1, 2, 3, 4, 5].map(function () { return { cls: "is-skel", label: "Loading", count: "", open: function () {} }; });

    /* What the search found, in words. */
    var resText = "", resNote = "", showRes = false;
    var accs = searching && found.rows && !searchBusy && !searchFailed ? found.rows : [];
    if (creator) { showRes = true; resText = CREATOR.decks + " carousels by " + creator; }
    else if (searchBusy) { showRes = true; resText = "Searching for \\u201c" + q + "\\u201d"; }
    else if (searchFailed) { showRes = false; }
    else if (searching) {
      showRes = true;
      if (noMatch) resText = "Nothing matches \\u201c" + q + "\\u201d";
      /* A search returns 25 at most, so a full page is "the 25 best matches",
         never a total the library was not asked for (the handover's rule). */
      else if (found.total >= 25) resText = (accs.length ? accs.length + " accounts and the " : "The ") + "25 best matches for \\u201c" + q + "\\u201d";
      else resText = (accs.length ? accs.length + " accounts and " : "") + found.total + " carousels for \\u201c" + q + "\\u201d";
      resNote = noMatch ? "" : "best match first";
    }

    var creators = accs.map(function (c) {
      return {
        isTiktok: c.net === "tiktok",
        isInsta: c.net === "instagram",
        handle: c.handle,
        stats: c.decks + " carousels \\u00b7 top " + c.top + " views",
        pick: function () { self.setState({ t10creator: c.handle, t10q: "", t10slide: {} }); }
      };
    });

    var feedEmptyText = "";
    if (!feed.length && !creators.length && !grid.length && !searchFailed) {
      if (searching) feedEmptyText = "Nothing in the library matches";
      else if (tab === "saved") feedEmptyText = "Nothing saved yet";
      else feedEmptyText = "No carousels yet";
    }

    /* Recent saves: the last five, newest first, with the way to all of them. */
    var svRows = savedIds.slice(0, 5).map(function (id) {
      var f = byId(FEED, id);
      return {
        handle: f.handle,
        thCls: "ps-" + f.slides[0],
        stats: f.views + " views \\u00b7 " + f.likes + " likes",
        open: function () { self.setState({ t10det: id, t10dtab: "details" }); }
      };
    });

    /* ── Digests ── */
    var list = firstRun ? [] : DIGESTS.map(function (d) {
      return allDone && d.state !== "done" ? Object.assign({}, d, { state: "done", analysed: d.analysed || "6:30am" }) : d;
    });
    var openId = s.t10open || (list[0] ? list[0].id : null);
    var open = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === openId) open = list[i];
    if (!open) open = list[0] || null;

    /* The newest digest nothing has been run on: the one Analyse sits on. */
    var newest = null;
    for (var j = 0; j < list.length; j++) if (list[j].state === "new" && !newest) newest = list[j];

    var deckCount = function (d) { return d.decks === 1 ? "1 carousel" : d.decks + " carousels"; };
    var stateOf = function (d) {
      if (d.state === "new") return { text: deckCount(d) + " · not analysed", cls: "is-new" };
      if (d.state === "queued") return { text: d.queued + " still queued", cls: "is-wait" };
      if (d.state === "failed") return { text: "Analysis failed", cls: "is-bad" };
      return { text: deckCount(d), cls: "" };
    };

    var digests = list.map(function (d) {
      var st = stateOf(d);
      return {
        date: d.date,
        stateText: st.text,
        stateCls: st.cls,
        cls: open && d.id === open.id ? "on" : "",
        current: open && d.id === open.id ? "true" : "false",
        open: function () { self.setState({ t10open: d.id }); }
      };
    });

    /* What the header line says about the open digest: when it arrived, how
       many carousels it holds, and when it was analysed if it was. */
    var meta = !open ? "" : open.when + " · " + deckCount(open) +
      (open.state === "failed" || open.state === "new" ? "" : " · analysed at " + open.analysed);

    var body = BODY.map(function (b) { return { text: b.text, cls: b.link ? "is-link" : "" }; });

    var analysed = !!open && (open.state === "done" || open.state === "queued");
    var typeRows = function (ids) {
      if (ids.length === TYPES.length) return [{ name: "All types" }];
      return ids.map(function (id) {
        var t = TYPES.filter(function (x) { return x.id === id; })[0];
        return { name: t ? t.name : id };
      });
    };

    var rules = (analysed ? RULES : []).map(function (r) {
      return {
        text: r.text,
        status: "Pending",
        conf: r.conf.toFixed(2),
        evidence: r.evidence.map(function (line) { return { line: line }; }),
        types: typeRows(r.types)
      };
    });

    /* Carousels only: a digest's video links are filtered out, because this
       app makes carousels (Garreth, 2026-09-16). */
    var posts = (analysed ? POSTS : []).map(function (p) {
      return {
        isTiktok: p.net === "tiktok",
        isInsta: p.net === "instagram",
        title: p.title,
        meta: p.meta,
        slides: p.slides.map(function (id) { return { cls: "ps-" + id }; }),
        use: function () {
          ctx.open("studio", { ref: p.title, refNew: true },
            "Opens the Studio on \\u201c" + p.title + "\\u201d, to build a template the same way \\u00b7 D6");
        }
      };
    });

    /* Only the queued board shows links still with the outside worker. */
    var queuedPosts = (analysed && open.state === "queued" ? QUEUED_POSTS : []).map(function (q) {
      return { isTiktok: q.net === "tiktok", isInsta: q.net === "instagram", url: q.url, since: q.since };
    });

    /* Analyse, while it runs, says what it is doing in F12's order. */
    var workNow = "Running the pattern pass";
    var workDone = "9 links read · 6 videos ignored · 3 carousels, 2 of them new";

    /* ── Knowledge base ── */
    var pendingAll = nothingPending ? [] : [OLDER_RULE].concat(RULES);
    var kType = s.t10type || "all";
    var conf = CONFS.filter(function (c) { return c.id === s.t10conf; })[0] || CONFS[0];
    var keep = function (r) {
      if (kType !== "all" && r.types.indexOf(kType) < 0) return false;
      if (r.conf < conf.min) return false;
      if (conf.max != null && r.conf >= conf.max) return false;
      return true;
    };
    var kbRow = function (r, on) {
      return {
        text: r.text,
        from: on ? "From " + r.from + "'s digest · accepted " + on : "From " + r.from + "'s digest",
        conf: r.conf.toFixed(2),
        types: typeRows(r.types),
        accept: function () { self.note("Adds the rule to the knowledge base, with the digest it came from"); },
        reject: function () { self.note("Drops the rule; nothing is recorded"); }
      };
    };
    var pending = pendingAll.filter(keep).map(function (r) { return kbRow(r, null); });
    var accepted = ACCEPTED.filter(keep).map(function (r) { return kbRow(r, r.on); });

    var chips = [{ id: "all", name: "All types" }].concat(TYPES).map(function (t) {
      var on = kType === t.id;
      return {
        name: t.name,
        cls: on ? "on" : "",
        pressed: on ? "true" : "false",
        pick: function () { self.setState({ t10type: t.id }); }
      };
    });

    var confOpts = CONFS.map(function (c) {
      var on = conf.id === c.id;
      return {
        label: c.label,
        cls: on ? "on" : "",
        selected: on ? "true" : "false",
        isSelected: on,
        pick: function () { self.setState({ t10conf: c.id, t10dd: false }); }
      };
    });

    var tab0 = s.t10tab || "feed";
    /* Named for this screen: the shell's side menu is railCls, and a screen that hands over the same name
       takes the menu's class away on every screen of the prototype (the phone's drawer never opened). */
    var t10railCls = {}, t10railCur = {}, tabGo = {};
    ["feed", "digests", "knowledge", "saved"].forEach(function (id) {
      t10railCls[id] = tab === id ? "on" : "";
      t10railCur[id] = tab === id ? "page" : "false";
      tabGo[id] = function () { self.setState({ t10tab: id, t10dd: false, t10q: "", t10creator: null, t10filt: false, t10chdd: false }); };
    });
    /* A search's results show in the column whichever section the bar was
       used from; the feed is the column with the Recent saves beside it. */
    var column = (tab === "feed" || tab === "saved" || searching || !!creator) && tab !== "digests" && tab !== "knowledge";

    return {
      is: { feed: tab === "feed", saved: tab === "saved", column: column, digests: tab === "digests", knowledge: tab === "knowledge" },
      columnLabel: tab === "saved" ? "Saved" : "Feed",
      t10railCls: t10railCls,
      t10railCur: t10railCur,
      tabGo: tabGo,
      digestCount: firstRun ? "" : String(list.length),
      pendingCount: pendingAll.length ? String(pendingAll.length) : "",

      /* The search bar. Enter would run the search; the results open in the
         column whichever section the bar was used from. */
      qValue: q,
      qPlaceholder: "Search carousels or creators",
      qShort: "Search",
      /* In the prototype Enter runs the search: the three sample queries bring back the boards' results, and any
         other finds nothing (the round trip is a note on the review canvas, where typing changes nothing). */
      qKey: function (e) {
        if (e.key !== "Enter") return;
        var typed = ((e.target && e.target.value) || "").trim();
        self.note("Searches the library's carousels by words and meaning, and its creators by handle");
        if (typed) self.setState({ t10q: typed, t10creator: null, t10slide: {}, t10filt: false, t10chdd: false });
      },
      showClear: !!q || !!creator,
      clear: function () { self.setState({ t10q: "", t10creator: null, t10tab: "feed", t10slide: {} }); },
      resBusy: searchBusy,
      showSearchFail: searchFailed,
      searchFailText: "The search timed out",
      searchRetry: function () { self.note("Runs the same search again"); },

      /* How the search reads the library, and the filters. */
      chLabel: channel.label,
      chAria: "Search by: " + channel.label,
      chCls: s.t10chdd ? "on" : "",
      chExpanded: s.t10chdd ? "true" : "false",
      toggleCh: function () { self.setState({ t10chdd: !s.t10chdd, t10filt: false }); },
      chOpts: CHANNELS.map(function (c) {
        var on = c.id === channel.id;
        return { label: c.label, cls: on ? "on" : "", selected: on ? "true" : "false", isSelected: on, pick: function () { self.setState({ t10ch: c.id, t10chdd: false }); } };
      }),
      showFilters: !!s.t10filt,
      filtersExpanded: s.t10filt ? "true" : "false",
      toggleFilters: function () { self.setState({ t10filt: !s.t10filt, t10chdd: false }); },
      hasFilters: filtCount > 0,
      filterCount: String(filtCount),
      filterBtnCls: filtCount ? "has" : "",
      filterBtnLabel: filtCount ? "Filters, " + filtCount + " on" : "Filters",
      fGroups: FILTERS.map(function (g) {
        var cur = filt[g.id] || g.opts[0];
        var open = s.t10fdd === g.id;
        return {
          label: g.label,
          value: cur,
          aria: g.label + ": " + cur,
          btnCls: cur !== g.opts[0] ? "has" : "",
          ddCls: open ? "on" : "",
          expanded: open ? "true" : "false",
          toggle: function () { self.setState({ t10fdd: open ? null : g.id }); },
          opts: g.opts.map(function (o) {
            var on = cur === o;
            return { label: o, on: on, cls: on ? "on" : "", pressed: on ? "true" : "false",
              pick: function () { var next = Object.assign({}, filt); next[g.id] = o; self.setState({ t10f: next, t10fdd: null }); } };
          })
        };
      }),
      clearFilters: function () { self.setState({ t10f: {}, t10fdd: null }); },

      /* The feed holds what this person has not seen. With nothing new it
         shows the last ones seen under a small line that says so; when new
         ones land while the page is open, a quiet button brings them in
         rather than moving the posts under the reader. */
      showCaught: feedState === "caught" && tab === "feed" && !searching && !creator,
      showNewPosts: feedState === "new" && tab === "feed" && !searching && !creator,
      newPostsText: "6 new carousels",
      loadNew: function () { self.note("Puts the new carousels at the top of the feed"); },
      applyFilters: function () { self.setState({ t10filt: false }); self.note("Runs the search again with these filters"); },
      /* The filters this search ran with, each one removable. */
      showChips: searching && filtCount > 0,
      usedFilters: FILTERS.filter(function (g) { return filt[g.id] && filt[g.id] !== g.opts[0]; }).map(function (g) {
        return {
          label: filt[g.id],
          aria: "Remove the " + g.label.toLowerCase() + " filter, " + filt[g.id],
          remove: function () {
            var next = Object.assign({}, filt); delete next[g.id];
            self.setState({ t10f: next }); self.note("Runs the search again without that filter");
          }
        };
      }),
      showClearFilters: filtCount > 1,

      /* The phone's sheet: up over the slides, or resting under them. */
      sheetCls: s.t10up ? "is-up" : "",
      sheetUp: s.t10up ? "true" : "false",
      sheetLabel: s.t10up ? "Show the slides" : "Show more",
      /* A pull that has just ended is not also a press. */
      sheetToggle: function () { if (justPulled()) return; self.setState({ t10up: !s.t10up }); },
      /* The pull: the sheet follows the finger between its two rests, moved on the element itself so nothing
         is redrawn under the finger, then settles up or down: a pull of 60px or more goes the way it was
         pulled, a shorter one to whichever rest is nearer. */
      sheetDown: function (e) {
        self.t10pull = { y: e.clientY, from: s.t10up ? SHEET_RAISED : SHEET_REST, at: null };
        /* Hold the pointer from the press, or a quick mouse leaves the row before the pull is known and the
           pull is lost. Hold it on the BUTTON under it, not the row: a mouse's click goes to whatever holds
           the pointer, and held by the row a tab would never switch. */
        var hold = (e.target && e.target.closest && e.target.closest("button")) || e.currentTarget;
        if (hold && hold.setPointerCapture) { try { hold.setPointerCapture(e.pointerId); } catch (x) {} }
      },
      sheetMove: function (e) {
        var d = self.t10pull; if (!d) return;
        var dy = e.clientY - d.y;
        if (d.at === null && Math.abs(dy) < 6) return;
        var el = document.getElementById("t10-sheet"); if (!el) return;
        d.at = Math.max(SHEET_RAISED, Math.min(SHEET_REST, d.from + dy));
        el.style.transition = "none";
        el.style.marginTop = d.at + "px";
      },
      sheetEnd: function (e) {
        var d = self.t10pull; self.t10pull = null;
        if (!d || d.at === null) return;
        var el = document.getElementById("t10-sheet");
        if (el) { el.style.transition = ""; el.style.marginTop = ""; }
        var dy = e.clientY - d.y;
        self.t10pulledAt = Date.now();
        self.setState({ t10up: Math.abs(dy) >= 60 ? dy < 0 : d.at < (SHEET_RAISED + SHEET_REST) / 2 });
      },
      /* The details window. */
      showDet: !!detF,
      det: det,
      closeDet: function () { self.setState({ t10det: null, t10up: false }); },
      dtabCls: { details: dtab === "details" ? "on" : "", analysis: dtab === "analysis" ? "on" : "", words: dtab === "words" ? "on" : "" },
      dtabSel: { details: dtab === "details" ? "true" : "false", analysis: dtab === "analysis" ? "true" : "false", words: dtab === "words" ? "true" : "false" },
      dtabGo: (function () {
        var go = {};
        ["details", "analysis", "words"].forEach(function (id) { go[id] = function () { if (justPulled()) return; self.setState({ t10dtab: id }); }; });
        return go;
      })(),
      isDetails: dtab === "details",
      /* Analysis and Transcription are two tabs over one reading (Garreth,
         2026-09-19): they share its states (nothing yet, on its way, blocked,
         failed), and each shows its own half once it is there. */
      isRead: dtab === "analysis" || dtab === "words",
      isWords: dtab === "words",
      readLabel: dtab === "words" ? "Transcription" : "Analysis",
      anReadyAnalysis: (anState === "ready" || anState === "part" || anState === "thin") && dtab === "analysis",
      anReadyWords: (anState === "ready" || anState === "part" || anState === "thin") && dtab === "words",
      /* The groups: Summary starts open, the others shut. */
      acc: (function () {
        var openNow = s.t10acc || { summary: true };
        var out = {};
        ["summary", "how", "pattern", "audience"].forEach(function (id) {
          var on = !!openNow[id];
          out[id] = { open: on, cls: on ? "on" : "", expanded: on ? "true" : "false",
            toggle: function () { var next = Object.assign({}, openNow); next[id] = !on; self.setState({ t10acc: next }); } };
        });
        return out;
      })(),
      anHasPattern: anKeep.length > 0,
      anKeep: anKeep,
      anLimits: anLimits,
      anHasAudience: !!an && !anThin,
      anAudienceFull: anThemes.length > 0,
      anAudienceThin: !!an && !anThin && anThemes.length === 0,
      anThemes: anThemes,
      anQuestions: anQuestions,
      anNone: anState === "none",
      anWorking: anState === "working",
      anFailed: anState === "failed",
      anBlocked: anState === "blocked",
      anBlockedText: "The slides could not be fetched",
      anLines: anLinesAll.slice(0, anShown),
      anCoverage: anState === "ready" ? "All " + anLinesAll.length + " slides read" : anShown + " of " + anLinesAll.length + " slides read",
      anBy: an && an.read ? "Read by the model \\u00b7 " + an.read : "Read by the model",
      anTags: anTags,
      anNotes: anNotes,
      anStatus: anPart ? "Partial" : "Complete",
      anStatusCls: anPart ? "is-wait" : "",
      anWorkNow: "Reading slide 3 of " + anLinesAll.length,
      anWorkDone: "Saved to this carousel as it goes",
      anFailText: "The analysis failed",
      anRun: function () { self.note("Queues this carousel for the analysis worker and fills the tab in as the slides are read; the result is kept on the carousel"); },
      showGrid: grid.length > 0,
      grid: grid,

      /* The feed, and the saved posts in the same column. */
      svRows: svRows,
      svEmpty: svRows.length === 0,
      svHasAny: svRows.length > 0,
      svAll: function () { self.setState({ t10tab: "saved", t10q: "", t10creator: null }); },
      showRes: showRes,
      resText: resText,
      hasResNote: !!resNote,
      resNote: resNote,
      showCreators: creators.length > 0,
      creators: creators,
      feed: feed,
      showFeedEmpty: !!feedEmptyText,
      feedEmptyCls: searching || creator ? "es10--inline" : "",
      feedEmptyText: feedEmptyText,
      showMore: moreState === "loading" && feed.length > 0,
      showEnd: moreState === "end" && feed.length > 0,
      /* Seen means on the screen for about a second (Garreth, 2026-09-18).
         After the last unseen post the feed says so and offers the ones
         already seen, most recently seen first, in the same pages of twenty;
         "That's every carousel" is the end of those. */
      showOlder: moreState === "older" && feed.length > 0,
      seeOlder: function () { self.note("Carries on into the carousels already seen, most recently seen first"); },
      endText: "That\\u2019s every carousel",

      hasDigests: !firstRun,
      noDigests: firstRun,
      noDigestsText: "No digests yet",

      digests: digests,
      openLabel: open ? "Digest of " + open.date : "Digest",
      openSubject: "Daily Creator Study",
      openMeta: meta,
      bodyLabel: open ? "The digest of " + open.date : "The digest",
      body: body,

      /* Analyse is the accent, and only on the newest digest nothing has been
         run on; while it runs it stays put and goes busy. */
      showAnalyse: !!open && !!newest && open.id === newest.id,
      analyseLabel: working ? "Analysing" : "Analyse",
      analyseIdle: !working,
      analyseBusy: working,
      analyseCls: working ? "is-busy" : "",
      analyseSpin: working ? "on" : "",
      analyseOff: working ? "true" : "false",
      analyse: function () { self.note("Reads the digest's links, queues the new ones, and runs the pattern pass"); },

      /* A digest whose links have since landed can be run again (F12 step 4). */
      showAgain: !!open && open.state === "queued",
      again: function () { self.note("Runs the pattern pass again, now the queued posts have landed"); },

      showWork: working,
      workNow: workNow,
      workDone: workDone,

      showFail: !!open && open.state === "failed",
      failText: "The analysis call failed",
      retry: function () { self.note("Runs the analysis again"); },

      showRules: analysed && rules.length > 0,
      ruleCount: String(rules.length),
      rules: rules,
      showPosts: analysed && (posts.length > 0 || queuedPosts.length > 0),
      postCount: String(posts.length + queuedPosts.length),
      posts: posts,
      queuedPosts: queuedPosts,

      kChips: chips,
      confLabel: conf.label,
      confOpts: confOpts,
      ddCls: s.t10dd ? "on" : "",
      ddExpanded: s.t10dd ? "true" : "false",
      toggleConf: function () { self.setState({ t10dd: !s.t10dd }); },
      closeConf: function () { self.setState({ t10dd: false }); },
      ddKey: function (e) { if (e.key === "Escape") self.setState({ t10dd: false }); },

      showPending: pending.length > 0,
      pending: pending,
      showNonePending: pending.length === 0,
      nonePendingCls: accepted.length ? "es10--inline" : "",
      nonePendingText: pendingAll.length === 0 ? "Nothing pending" : "No pending rules for these filters",
      showAccepted: accepted.length > 0,
      accepted: accepted,
      acceptedCount: String(ACCEPTED_TOTAL)
    };
`;
}

/*
 * The phone's sheet rides up as the reader scrolls what it holds, and comes back down on a pull from the top
 * (Garreth, 2026-09-19). The scrolling part is made again whenever the tab changes, so each new one is given its
 * listeners once. Only the phone's sheet has the id.
 */
const didUpdate = `
    if (st.screen === "trends" && st.t10det && document.getElementById("t10-sheet")) {
      var self10 = this;
      var isUp10 = function () { return !!(self10.state || {}).t10up; };
      var bodies10 = document.querySelectorAll("#t10-sheet .dbody");
      for (var b10 = 0; b10 < bodies10.length; b10++) (function (body) {
        if (body.t10bound) return;
        body.t10bound = true;
        var startY = null;
        body.addEventListener("scroll", function () { if (!isUp10() && body.scrollTop > 4) self10.setState({ t10up: true }); }, { passive: true });
        body.addEventListener("wheel", function (e) {
          if (!isUp10() && e.deltaY > 4) self10.setState({ t10up: true });
          else if (isUp10() && body.scrollTop <= 0 && e.deltaY < -4) self10.setState({ t10up: false });
        }, { passive: true });
        body.addEventListener("touchstart", function (e) { startY = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
        body.addEventListener("touchmove", function (e) {
          if (startY === null || !e.touches[0]) return;
          var dy = e.touches[0].clientY - startY;
          if (!isUp10() && dy < -24) { startY = null; self10.setState({ t10up: true }); }
          else if (isUp10() && body.scrollTop <= 0 && dy > 40) { startY = null; self10.setState({ t10up: false }); }
        }, { passive: true });
      })(bodies10[b10]);
    }
`;

export function trendsScreen({ init = {}, tall = 0 } = {}) {
  const full = {
    tab: "feed", q: "", creator: null, saved: ["f4", "f2", "f6"], slide: {},
    det: null, dtab: "details", acc: { summary: true }, up: false, votes: { f2: "up" }, filt: false, f: {}, fdd: null, ch: "meaning", chdd: false,
    open: null, type: "all", conf: "any", dd: false, empty: null, allDone: false, working: false, pending: true,
    ...init,
  };
  return {
    id: "trends",
    nav: "trends",
    css: (phone) => css(phone, tall),
    markup: (phone) => page(phone),
    /* The phone's floating bar rides over the column, so it is drawn outside
       the page's scroll. */
    colOverlay: (phone) => (phone ? floatingNav() : ""),
    /* The details window covers the whole app, menu included. */
    appOverlay: (phone) => detailsWindow(phone),
    state: {
      t10tab: full.tab,
      t10q: full.q,
      t10creator: full.creator,
      t10det: full.det,
      t10dtab: full.dtab,
      t10acc: full.acc,
      t10up: !!full.up,
      t10votes: full.votes,
      t10filt: !!full.filt,
      t10f: full.f,
      t10fdd: full.fdd,
      t10ch: full.ch,
      t10chdd: !!full.chdd,
      t10saved: full.saved,
      t10slide: full.slide,
      t10open: full.open,
      t10type: full.type,
      t10conf: full.conf,
      t10dd: !!full.dd,
    },
    /* Opened from the menu: the feed, nothing searched. */
    enter: { t10tab: "feed", t10q: "", t10creator: null, t10det: null, t10acc: { summary: true }, t10up: false, t10filt: false, t10fdd: null, t10chdd: false, t10slide: {}, t10open: null, t10type: "all", t10conf: "any", t10dd: false },
    vals: vals(full),
    didUpdate,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

/*
 * Every {{name}} the markup asks for has to be handed over by something; a
 * name nothing supplies renders as nothing at all, silently. D8's net, run on
 * every board here too.
 */
const KEYWORDS = new Set(["true", "false", "null", "undefined"]);

function checkBindings(file, html) {
  const at = html.indexOf("<script data-dc-script");
  const markup = html.slice(0, at);
  const script = html.slice(at);
  const aliases = new Set([...markup.matchAll(/\bas="([^"]+)"/g)].map((m) => m[1]));
  const handed = new Set([...script.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
  const missing = new Set();
  for (const m of markup.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)/g)) {
    const root = m[1];
    if (!KEYWORDS.has(root) && !aliases.has(root) && !handed.has(root)) missing.add(root);
  }
  if (missing.size) {
    const names = [...missing].join(", ");
    throw new Error(`${file}: the markup asks for ${names}, and nothing hands ${missing.size > 1 ? "them" : "it"} over`);
  }
  /* A {{hole}} renders as a TEXT node, so markup handed over as a value shows
     its own source on the screen instead of drawing anything. Garreth found
     three icons doing exactly that on 2026-09-16; this stops the next one.
     Icons belong in the template, written out by `net()` and its like. */
  const asValue = [...script.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:\s*"<(?:svg|span|div|b)\b/gm)].map((m) => m[1]);
  if (asValue.length) {
    throw new Error(`${file}: ${[...new Set(asValue)].join(", ")} hand markup over as a value; a hole renders it as text. Put it in the template instead.`);
  }
}

/* The Studio D6 already designs, with D10's image names: where Copy to
   Studio lands, on a reference the library has no analysis for. */
function studioBoard() {
  const screen = studioScreen({
    init: {
      d6: { stage: "ready", lib: "window", slide: 1, entry: "reference", ref: POSTS[0].title, refNew: true, left: false },
    },
  });
  return { ...screen, css: (phone) => screen.css(phone).replace(/\.\/d6-(slide-|lib-|cut\.|photo-)/g, "./d10-$1") };
}

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyTrendsImages(OUT);

  /* Round three (2026-09-18): the top row. Dark first; the light boards of
     this row are built once Garreth approves the dark ones (R3_LIGHT). */
  const R3 = [
    { file: "Filters.dc.html", title: "D10 · Round 3 · The filter panel open, two filters on · Desktop", init: { q: SEARCH.q, filt: true, f: { topic: "Eye care", views: "100k and over" } } },
    { file: "Filtered.dc.html", title: "D10 · Round 3 · Results with the filters used over them, each with its X · Desktop", init: { q: SEARCH.q, f: { topic: "Eye care", views: "100k and over" } } },
    { file: "FilterTopic.dc.html", title: "D10 · Round 3 · The Topic dropdown open · Desktop", init: { q: SEARCH.q, filt: true, fdd: "topic", f: { topic: "Eye care", views: "100k and over" } } },
    { file: "SearchType.dc.html", title: "D10 · Round 3 · How the search reads the library · Desktop", init: { q: SEARCH.q, chdd: true } },
    { file: "Searching.dc.html", title: "D10 · Round 3 · A search on its way · Desktop", init: { q: SEARCH.q, searchState: "loading" } },
    { file: "SearchFailed.dc.html", title: "D10 · Round 3 · The search timed out: Retry · Desktop", init: { q: SEARCH.q, searchState: "failed" } },
    { file: "Details.dc.html", title: "D10 · Round 3 · The details window, from a tile · Desktop", init: { q: SEARCH.q, det: "f4" } },
    { file: "Analysis.dc.html", title: "D10 · Round 3 · Analysis: transcribed and analysed · Desktop", init: { q: SEARCH.q, det: "f4", dtab: "analysis", votes: { f4: "up" }, saved: ["f4", "f2", "f6"] } },
    { file: "AnalysisMore.dc.html", title: "D10 · Round 3 · Analysis with Reusable pattern and Audience response opened · Desktop", init: { q: SEARCH.q, det: "f4", dtab: "analysis", acc: { pattern: true, audience: true }, votes: { f4: "up" } } },
    { file: "AnalysisWords.dc.html", title: "D10 · Round 3 · The Transcription tab · Desktop", init: { q: SEARCH.q, det: "f4", dtab: "words", votes: { f4: "up" } } },
    { file: "AnalysisPartial.dc.html", title: "D10 · Round 3 · Analysis: part-read, every row there, fewer slides · Desktop", init: { q: SEARCH.q, det: "f4", dtab: "analysis", analysis: "part" } },
    { file: "AnalysisThin.dc.html", title: "D10 · Round 3 · Analysis from the newer run: fewer rows, nothing blank · Desktop", init: { q: SEARCH.q, det: "f4", dtab: "analysis", analysis: "thin" } },
    { file: "NotAnalysed.dc.html", title: "D10 · Round 3 · Analysis: nothing yet, and the button · Desktop", init: { det: "f1", dtab: "analysis", analysis: "none" } },
    { file: "Analysing.dc.html", title: "D10 · Round 3 · Transcription: on its way, filling in · Desktop", init: { det: "f1", dtab: "words", analysis: "working" } },
    { file: "AnalysisBlocked.dc.html", title: "D10 · Round 3 · Analysis: blocked, the slides could not be fetched · Desktop", init: { det: "f1", dtab: "analysis", analysis: "blocked" } },
    { file: "AnalysisFailed.dc.html", title: "D10 · Round 3 · Analysis: failed, Retry · Desktop", init: { det: "f1", dtab: "analysis", analysis: "failed" } },
    { file: "PhoneDetails.dc.html", title: "D10 · Round 3 · The details window · Phone", phone: true, init: { q: SEARCH.q, det: "f4" } },
    { file: "PhoneAnalysisUp.dc.html", title: "D10 · Round 3 · The sheet scrolled up over the slides: Analysis · Phone", phone: true, init: { q: SEARCH.q, det: "f4", dtab: "analysis", up: true } },
    { file: "PhoneWordsUp.dc.html", title: "D10 · Round 3 · The sheet scrolled up over the slides: Transcription · Phone", phone: true, init: { q: SEARCH.q, det: "f4", dtab: "words", up: true } },
    { file: "PhoneFilters.dc.html", title: "D10 · Round 3 · The filter sheet · Phone", phone: true, init: { q: SEARCH.q, filt: true, f: { topic: "Eye care", views: "100k and over" } } },
    { file: "PhoneFiltered.dc.html", title: "D10 · Round 3 · Results with the filters used over them · Phone", phone: true, init: { q: SEARCH.q, f: { topic: "Eye care", views: "100k and over" } } },
    { file: "EndOfNew.dc.html", title: "D10 · Round 3 · The end of what is new: See older carousels · Desktop", init: { more: "older", take: 2 }, tall: 1960 },
    { file: "Caught.dc.html", title: "D10 · Round 3 · The feed with nothing new: the last ones seen · Desktop", init: { feedState: "caught" } },
    { file: "NewPosts.dc.html", title: "D10 · Round 3 · New carousels landed while the feed was open · Desktop", init: { feedState: "new" } },
  ].map((b, col) => ({ ...b, r3: true, row: 0, col }));
  const R3_LIGHT = true; /* dark approved by Garreth, 2026-09-19 */

  const BOARDS = [
    ...R3,
    /* The feed. */
    { file: "Main.dc.html", title: "D10 · Trends: the feed · Desktop", init: {}, row: 0, col: 0 },
    { file: "Paged.dc.html", title: "D10 · A post on its third slide, saved, with the arrows · Desktop", init: { slide: { f1: 2 }, arrows: true, saved: ["f1", "f4", "f2", "f6"] }, row: 0, col: 1 },
    { file: "Saved.dc.html", title: "D10 · Saved: a grid of the saved posts, newest first · Desktop", init: { tab: "saved" }, row: 1, col: 4 },
    { file: "NothingSaved.dc.html", title: "D10 · The feed with nothing saved yet · Desktop", init: { saved: [] }, row: 1, col: 5 },
    { file: "PhoneSaved.dc.html", title: "D10 · Saved · Phone", phone: true, init: { tab: "saved" }, row: 1, col: 6 },
    { file: "ImageGone.dc.html", title: "D10 · A slide whose link has died: the post stays · Desktop", init: { gone: "f1" }, row: 0, col: 2 },
    { file: "More.dc.html", title: "D10 · The next twenty loading · Desktop", init: { more: "loading", take: 2 }, tall: 1960, row: 0, col: 3 },
    { file: "End.dc.html", title: "D10 · The end of the library · Desktop", init: { more: "end", take: 2 }, tall: 1960, row: 0, col: 4 },
    /* D6's own screen, on this canvas so D10's reviewer can see where Use as
       reference lands without opening D6's. */
    { file: "Studio.dc.html", title: "D10 · Copy to Studio: the Studio on a reference with no analysis · Desktop", studio: true, init: {}, row: 0, col: 5 },
    { file: "PhoneFeed.dc.html", title: "D10 · The feed · Phone", phone: true, init: {}, row: 0, col: 6 },
    { file: "PhoneSearch.dc.html", title: "D10 · Carousels found for a search · Phone", phone: true, init: { q: SEARCH.q }, row: 0, col: 7 },
    /* Search. */
    { file: "Search.dc.html", title: "D10 · Carousels found for a search, as a grid · Desktop", init: { q: SEARCH.q }, row: 1, col: 0 },
    { file: "Accounts.dc.html", title: "D10 · A search that found accounts and carousels · Desktop", init: { q: ACCOUNTS.q }, row: 1, col: 1 },
    { file: "Creator.dc.html", title: "D10 · One creator's carousels · Desktop", init: { creator: CREATOR.handle }, row: 1, col: 2 },
    { file: "NoMatches.dc.html", title: "D10 · A search that found nothing · Desktop", init: { q: NO_MATCH_Q }, row: 1, col: 3 },
    /* Digests and the knowledge base, as approved on 2026-09-16. */
    { file: "Digests.dc.html", title: "D10 · Digests: the newest digest, not analysed yet · Desktop", init: { tab: "digests" }, row: 2, col: 0 },
    { file: "Analysed.dc.html", title: "D10 · An analysed digest, on a day when every digest is analysed · Desktop", init: { tab: "digests", allDone: true }, row: 2, col: 1 },
    { file: "Queued.dc.html", title: "D10 · Links still being analysed · Desktop", init: { tab: "digests", open: "g15" }, row: 2, col: 2 },
    { file: "Failed.dc.html", title: "D10 · The analysis failed: Retry · Desktop", init: { tab: "digests", open: "g13" }, row: 2, col: 3 },
    { file: "FirstRun.dc.html", title: "D10 · No digests yet · Desktop", init: { tab: "digests", empty: "first" }, row: 2, col: 4 },
    { file: "Knowledge.dc.html", title: "D10 · Knowledge: pending rules, Accept and Reject · Desktop", init: { tab: "knowledge" }, row: 2, col: 5 },
    { file: "NothingPending.dc.html", title: "D10 · Knowledge: nothing pending · Desktop", init: { tab: "knowledge", pending: false }, row: 2, col: 6 },
    { file: "PhoneDigest.dc.html", title: "D10 · An analysed digest · Phone", phone: true, init: { tab: "digests", allDone: true }, row: 2, col: 7 },
    { file: "PhoneKnowledge.dc.html", title: "D10 · Knowledge · Phone", phone: true, init: { tab: "knowledge" }, row: 2, col: 8 },
  ];

  /* Round three took the top row; everything approved before it moves down one. */
  for (const b of BOARDS) if (!b.r3) b.row += 1;

  /* Rows are laid out from the tallest board in each one, so a board that
     grows cannot land on its neighbour (D8's rule). */
  const GAP_X = 100;
  const GAP_Y = 120;
  const height = (b) => b.tall || (b.phone ? 844 : 900);
  const width = (b) => (b.phone ? 390 : 1440);
  const rowTop = [];
  for (let r = 0, y = 0; ; r += 1) {
    const inRow = BOARDS.filter((b) => b.row === r);
    if (!inRow.length) break;
    rowTop[r] = y;
    y += Math.max(...inRow.map(height)) + GAP_Y;
  }
  const colLeft = [];
  for (let c = 0, x = 0; ; c += 1) {
    const inCol = BOARDS.filter((b) => b.col === c);
    if (!inCol.length) break;
    colLeft[c] = x;
    x += Math.max(...inCol.map(width)) + GAP_X;
  }
  const noteX = colLeft[colLeft.length - 1] + 1440 + GAP_X * 2;

  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      if (light && b.r3 && !R3_LIGHT) continue;
      const phone = !!b.phone;
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      const screen = b.studio ? studioBoard() : trendsScreen({ init: b.init, tall: b.tall || 0 });
      const html = artboard({ phone, light, screens: [screen], navMode: "note" });
      if (!b.studio) checkBindings(file, html);
      fs.writeFileSync(path.join(OUT, file), html);
      artboards.push({
        file,
        title: light ? `${b.title} · Light` : b.title,
        page: light ? "light" : "dark",
        x: colLeft[b.col],
        y: rowTop[b.row],
        w: width(b),
        h: height(b),
        is_interactive: true,
      });
    }
  }

  const tryNote =
    "ROUND THREE (2026-09-18), the top row, dark only until approved. The search bar keeps its place and gains two things: how the search reads the library, inside the bar at its right (Meaning, Exact words, How it's built, How it looks, Comments), and a filter button just outside it, which opens Topic, Hook style, Visual style, Views and Standout posts only, with Clear all and Apply; the button counts the filters that are on, and the results line says so and offers Clear filters. On the phone the filters are a sheet, and the search type is its first group. A post now opens in a details window: slides at the left, the X at the upper right, Details and Analysis as tabs, and along the foot the thumbs, Save, View Post and Copy to Studio. It opens from a results tile, from View Details on a post, and from a Recent saves row. Analysis shows the words on each slide and the model's reading at once when the library holds them; when it does not, Transcribe and analyse starts it, the tab fills in as slides are read, and the result stays on the carousel. On a post, the thumbs sit at the left, View Details takes Save's place, and the numbers have a line of their own. Also new: a search on its way, a search that timed out, Unknown instead of 0, and No words on this slide instead of invented copy. The rows below are round two as approved, with the new post row.\n\nRound two, fifth cut (2026-09-17, after Garreth's fourth review): the page is a feed first, laid out the way a social feed is, and only the posts scroll. Clickable. The rail on the left (the floating bar on the phone) switches between Feed, Digests, Knowledge and Saved; on a post, a swipe across the slides pages them, as do the dots and the arrows; the bookmark saves it. Typing does nothing on a board: a search is a round trip, so it runs on Enter, and the boards in the second row show what comes back.\n\nEach post is one carousel another creator published, never ours: who posted it and when, the topics under the handle, View Post opposite them (it opens the post on its platform), the slides, then the numbers at the left and, together at the right, Copy to Studio (it opens the Studio on that deck) and Save. Both are quiet outlines; nothing on the feed is lit. The handle and the hook sit right under.\n\nNo filters and no label: the feed is one list, best-scored first. A date shows on a post only when there is one. Videos never reach the feed; this app makes carousels.\n\nOne search box, as wide as the posts, finds creators and carousels alike: accounts that match are listed first, and the carousels are a grid three across, each tile the slide that matched. Pressing a tile opens that post alone in the column, with Back to results; Clear brings the feed back. Pressing an account shows that creator's carousels.\n\nSaved: the panel to the right of the feed holds the last five saves, thumbnail first, and View all saves opens the Saved section, where the saved posts sit in the feed's layout, newest saved first. The phone has the Saved section on its bar and no panel.\n\nA slide whose link has died says Image gone and nothing else about the post changes. The two tall boards show the next twenty loading and the end of the library.\n\nOn the phone the search bar sits beside the title, the image runs edge to edge, the posts snap post to post, and the four sections float at the foot of the screen.\n\nDigests and Knowledge are as approved on 2026-09-16, one rail button along: Analyse lit only on the newest digest nothing has been run on, Accept and Reject on Knowledge only. The Studio board is D6's own screen, where Copy to Studio lands.\n\nThe content is invented: the handles and links go nowhere, the hooks and numbers are made up, and the reference decks are the ones D6 already keeps, so the same titles show in both.";
  fs.writeFileSync(
    path.join(OUT, "canvas.json"),
    JSON.stringify(
      {
        pages: [
          { id: "dark", name: "Dark" },
          { id: "light", name: "Light" },
        ],
        artboards,
        annotations: [
          { id: "d10-try", page: "dark", x: noteX, y: 0, w: 420, text: tryNote },
          { id: "d10-try-light", page: "light", x: noteX, y: 0, w: 420, text: tryNote },
        ],
        launch: { view: "canvas", page: "dark" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D10 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
