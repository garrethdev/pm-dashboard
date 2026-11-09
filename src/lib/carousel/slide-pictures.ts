import { thumbUrl } from "@/lib/carousel/thumb";

/**
 * Which slide of a Trends card gets a picture (2026-10-27).
 *
 * A card used to ask for every slide of its carousel as a full-size original
 * the moment it appeared: one page of twenty cards was 94 originals before
 * anyone had swiped. Now a card asks only for the slides up to the one the
 * person has reached, plus the next one, as a resized copy sized for the card.
 * `reached` is the furthest slide swiped to so far, so swiping back never
 * blanks a slide again. The one extra is so the next slide is already there
 * when the person swipes to it, instead of blank while it loads (2026-11-05).
 */
export function slidePicture(media: string | null | undefined, index: number, reached: number, width: number): string | null {
  if (index > reached + 1) return null;
  return thumbUrl(media, width);
}
