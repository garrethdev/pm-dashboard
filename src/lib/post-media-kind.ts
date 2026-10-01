/** A video file, judged by its address. */
export function isVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url);
}

/**
 * What a post is, for the download button's words (Garreth, 2026-10-01): one
 * video, a carousel's slides, or a single picture.
 */
export type MediaKind = "video" | "slides" | "image";

export function mediaKind(media: string[]): MediaKind {
  if (media.length > 1) return "slides";
  return media[0] && !isVideo(media[0]) ? "image" : "video";
}

export const DOWNLOAD_LABEL: Record<MediaKind, { full: string; short: string }> = {
  video: { full: "Download video", short: "Video" },
  slides: { full: "Download slides", short: "Slides" },
  image: { full: "Download image", short: "Image" },
};
