import { thumbUrl } from "@/lib/carousel/thumb";

/**
 * Which slide of a Trends card gets a picture (2026-10-27).
 *
 * A card used to ask for every slide of its carousel as a full-size original
 * the moment it appeared: one page of twenty cards was 94 originals before
 * anyone had swiped. Now a slide is drawn only once the person has reached
 * it, and as a resized copy sized for the card. `reached` is the furthest
 * slide swiped to so far, so swiping back never blanks a slide again.
 */
export function slidePicture(media: string | null | undefined, index: number, reached: number, width: number): string | null {
  if (index > reached) return null;
  return thumbUrl(media, width);
}
