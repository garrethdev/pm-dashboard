/** Browser-safe presentation only. Provider/database credentials stay in client.ts (server). */
export const SEARCH_CHANNELS = [
  ["meaning", "Meaning"], ["literal", "Exact words"], ["construction", "How it's built"],
  ["visual", "How it looks"], ["comments", "Comments"],
] as const;
export type SearchChannel = typeof SEARCH_CHANNELS[number][0];
export type CatalogRecord = Record<string, unknown>;
export interface SearchItem extends CatalogRecord {
  reference: CatalogRecord;
  matched_media: unknown;
  slide_count: number;
}
export interface SearchResponse {
  query: string;
  fallback: string | null;
  mode: string;
  results: SearchItem[];
  pagination: { limit: number; returned: number; exhaustive: boolean };
}
export interface CarouselDetail {
  reference: CatalogRecord;
  slides: CatalogRecord[];
  analysis: CatalogRecord | null;
  documents: CatalogRecord[];
  reading_required: boolean;
}

export function plainText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Do not let stored source strings become javascript/data URLs in links or images. */
export function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Known persisted media shapes only; never treat arbitrary metadata as image HTML. */
export function mediaUrl(value: unknown): string | null {
  if (typeof value === "string") return safeWebUrl(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as CatalogRecord;
  return safeWebUrl(record.url) ?? safeWebUrl(record.public_url) ?? safeWebUrl(record.image_url);
}

export function metric(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function initialSlide(slides: CatalogRecord[], position: unknown): number {
  const index = slides.findIndex(slide => slide.position === position);
  return index < 0 ? 0 : index;
}

export function searchSummary(response: SearchResponse): string {
  const count = response.results.length;
  if (!count) return `Nothing matches “${response.query}”`;
  return count >= response.pagination.limit
    ? `The ${count} best matches for “${response.query}”`
    : `${count} ${count === 1 ? "carousel" : "carousels"} for “${response.query}” · best match first`;
}
