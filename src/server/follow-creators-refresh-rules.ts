/**
 * The rules the monthly refresh of Creators to follow applies, kept apart from
 * the calls so they can be tested. The same rules picked the first list by hand
 * on 2026-11-13 (see the changelog); written down here so every month applies
 * them the same way.
 */

/** "A few thousand followers or fewer" (Warmup Upgrade Plan, Y6). */
export const MIN_FOLLOWERS = 300;
export const MAX_FOLLOWERS = 6000;

/** Lookups in a row that found nothing before a creator comes off the list. */
export const MISSES_TO_RETIRE = 2;

/** An Instagram creator with no post for this long has stopped. */
export const INSTAGRAM_QUIET_DAYS = 60;
/** A new Instagram twin must have posted this recently to be added. */
export const INSTAGRAM_NEW_ACTIVE_DAYS = 30;

/** Below this many creators on a platform, the top-up looks for more. */
export const TARGET = { tiktok: 100, instagram: 40 } as const;

/**
 * TikTok searches, Character 6's audience: women 40+, weight loss, GLP-1,
 * menopause. The 44 phrases the first list was built from. Each month takes
 * the next SEARCHES_PER_RUN of them, so the whole set is used over the year.
 */
export const SEARCH_PHRASES = [
  "glp1 journey over 40", "glp1 journey over 50", "weight loss over 50", "weight loss over 40",
  "menopause weight loss", "perimenopause weight loss", "mounjaro journey", "zepbound journey",
  "wegovy journey", "semaglutide journey", "tirzepatide journey", "glp1 what i eat in a day",
  "glp1 protein meals", "midlife weight loss", "women over 50 fitness", "weight loss check in",
  "non scale victory", "down 40 pounds", "loose skin after weight loss", "walking for weight loss women",
  "calorie deficit over 40", "menopause belly", "weigh in glp1", "healthy habits over 50",
  "glp1 weekly weigh in", "mounjaro weigh in", "zepbound weigh in", "menopause fitness journey",
  "50 and fit women", "gen x weight loss", "weight loss mom over 40", "my glp1 journey",
  "glp1 real talk", "weight loss after 45", "healthy over 50 women", "menopause weight gain",
  "wegovy weigh in", "semaglutide update", "glp1 non scale victory", "losing weight in my 40s",
  "midlife glow up", "walking pad weight loss", "fitness over 40 women", "weight loss update women",
];
export const SEARCHES_PER_RUN = 10;

/** This month's phrases: a window that moves by SEARCHES_PER_RUN each month. */
export function phrasesFor(date: Date): string[] {
  const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
  const start = (month * SEARCHES_PER_RUN) % SEARCH_PHRASES.length;
  return Array.from({ length: SEARCHES_PER_RUN }, (_, i) => SEARCH_PHRASES[(start + i) % SEARCH_PHRASES.length]!);
}

/**
 * Bio links that mean she sells something we must not be tied to: GLP-1 or
 * peptide shops, pharmacies, telehealth sign-ups, supplement affiliates. Two
 * of the first list's rejects were exactly this (orderlymeds, galaglp1).
 */
const SELLER_LINK =
  /(glp|peptide|pharm|meds\b|orderlymeds|rx\b|telehealth|clinic|semaglutide|tirzepatide|mondae|ufeelgreat|lvnta|tryorigin|hormone|wellness-?shop)/i;

export function isSellerLink(link: string | null | undefined): boolean {
  return !!link && SELLER_LINK.test(link);
}

/** Why an existing creator comes off the list, or null to keep her. */
export function retireReason(p: {
  found: boolean;
  missedBefore: number;
  followers: number;
  isPrivate: boolean;
  /** Instagram only; null when unknown (TikTok gives no post dates here). */
  daysSincePost: number | null;
}): string | null {
  if (!p.found) return p.missedBefore + 1 >= MISSES_TO_RETIRE ? "not found twice in a row" : null;
  if (p.isPrivate) return "went private";
  if (p.followers > MAX_FOLLOWERS) return `grew past ${MAX_FOLLOWERS.toLocaleString("en-US")} followers`;
  if (p.daysSincePost !== null && p.daysSincePost > INSTAGRAM_QUIET_DAYS) return `no posts in ${INSTAGRAM_QUIET_DAYS} days`;
  return null;
}

export function inRange(followers: number): boolean {
  return followers >= MIN_FOLLOWERS && followers <= MAX_FOLLOWERS;
}

/** Rough tags from her bio and captions, as the first list had. */
export function topicsOf(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  const groups: [string, string[]][] = [
    ["GLP-1", ["glp", "mounjaro", "zepbound", "wegovy", "semaglutide", "tirzepatide", "mj journey"]],
    ["Menopause", ["menopause", "perimenopause", "hrt", "midlife", "meno"]],
    ["Over 40/50", ["40", "50", "gen x", "genx"]],
    ["Weight loss", ["weight", "lbs", "pounds", "weigh", "scale"]],
    ["Fitness", ["gym", "workout", "lift", "walk", "run", "jog", "strength", "fitness"]],
  ];
  for (const [tag, words] of groups) if (words.some((w) => t.includes(w))) out.push(tag);
  return out;
}

/** The Instagram handle a TikTok bio names ("IG: @name", "instagram @name"), if any. */
export function instagramFromBio(bio: string, link: string | null | undefined): string | null {
  const m = /(?:\big|instagram|insta)\W{0,6}@([a-z0-9._]{2,30})/i.exec(bio) ?? /instagram\.com\/([a-z0-9._]{2,30})/i.exec(link ?? "");
  return m ? m[1]!.replace(/\.+$/, "").toLowerCase() : null;
}

/**
 * What the AI is asked about each new TikTok creator. The hand-picked list
 * left out men, coaches and trainers selling programmes, clinics and medical
 * professionals posting as such, product brands, sellers and affiliates,
 * repost and quote pages, off-topic accounts and non-English ones, and kept
 * women sharing their OWN weight-loss, GLP-1, menopause or midlife journey.
 */
export const CLASSIFY_PROMPT = `You are choosing small social media creators for a weight-loss brand's accounts to follow.
The accounts are written as women over 40 on a weight-loss / GLP-1 / menopause journey, so they follow peers.

KEEP a creator only if ALL are true:
- She is a woman sharing her OWN life: her weight-loss, GLP-1, menopause, midlife health or fitness journey.
- She posts in English.
- She is a regular person, not a business.

REJECT if any is true:
- A man, a couple page, or a brand / company / clinic / med spa / pharmacy.
- A coach, personal trainer, nutritionist, doctor, nurse practitioner or other professional whose page sells programmes, coaching or services ("I help women...", "DM to work with me", booking links).
- Sells or promotes GLP-1s, peptides, supplements or MLM products, or links to an affiliate shop for them.
- A repost, quote or motivation page, or off topic (fragrance, books, gaming, beauty-only).

Answer with JSON: {"results":[{"handle":"...","keep":true|false,"reason":"a few words"}]} with one entry per creator, same handles.`;

/**
 * Is this Instagram account the same woman as the TikTok one? Taken as yes when
 * her TikTok bio names it, or when the two display names share a word of three
 * letters or more. A bare same-handle match is not enough: on 2026-11-13 two
 * same-handle Instagram accounts turned out to be someone else's.
 */
export function looksLikeSamePerson(tiktokName: string | null, instagramName: string | null, namedInBio: boolean): boolean {
  if (namedInBio) return true;
  const words = (s: string | null) =>
    new Set(
      (s ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3),
    );
  const a = words(tiktokName);
  for (const w of words(instagramName)) if (a.has(w)) return true;
  return false;
}
