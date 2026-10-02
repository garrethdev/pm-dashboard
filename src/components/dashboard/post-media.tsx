"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, MusicNote, TriangleAlert, Upload } from "@/components/ui/icons";
import type { TodoPost } from "@/lib/data/todo";
import { isVideo } from "@/lib/post-media-kind";
import { cn } from "@/lib/utils";

/**
 * Posting from the to-do list in one tap (Garreth, 2026-10-01).
 *
 * Tapping the post's picture COPIES THE CAPTION and opens the phone's share
 * menu with the video already attached. Yurie picks TikTok, Instagram or
 * Facebook there, the app opens a new post with the video in it, and she
 * pastes the caption.
 *
 * WHAT IT CANNOT DO: put the caption in for her. Instagram's and Facebook's
 * rules forbid other apps from filling a caption in, and TikTok ignores text
 * sent with a shared video. One paste is the floor.
 *
 * WHY IT IS SOMETIMES TWO TAPS. A phone only opens its share menu straight
 * after a tap, and the video has to be downloaded into the page first — 6 to
 * 75 MB. A small one usually arrives in time and the menu opens on the same
 * tap; a big one does not, and the picture then turns into a share button
 * for a second tap. The download is kept, so that second tap is instant.
 *
 * Only works where the page is open ON THE PHONE that posts: the share menu
 * hands the video to apps on the device holding the page. On a computer, with
 * no share menu for files, the tap downloads the video instead.
 *
 * Supabase Storage answers any origin (checked 2026-10-01), so the files are
 * fetched straight from where they live; nothing is relayed by our server.
 */

type Phase = "idle" | "loading" | "ready" | "failed";

/** The extension's type, for files whose server sends a vague one: iOS lists
 *  apps for a share by the file's type, and offers none for octet-stream. */
const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function fileName(url: string, i: number): string {
  try {
    const last = new URL(url).pathname.split("/").pop();
    if (last) return decodeURIComponent(last);
  } catch {
    // fall through
  }
  return `post-${i + 1}`;
}

function typeOf(name: string, served: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (served && served !== "application/octet-stream") return served;
  return TYPES[ext] ?? served ?? "application/octet-stream";
}


/** True where the browser can hand files to the phone's share menu. */
function canShareFiles(files: File[]): boolean {
  return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Save files the ordinary way, for a computer with no share menu. */
function saveFiles(files: File[]) {
  for (const file of files) {
    const href = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  }
}

/**
 * One post's media: fetched once on first use, then shared, saved or both.
 * Shared by the picture and the Download video button, so the second of
 * them never downloads the video again.
 */
export function usePostMedia(post: TodoPost | undefined) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const files = useRef<File[] | null>(null);
  const loading = useRef<Promise<File[]> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  function load(): Promise<File[]> {
    if (files.current) return Promise.resolve(files.current);
    if (loading.current) return loading.current;
    const urls = post?.media ?? [];
    setPhase("loading");
    setProgress(0);
    const done = new Array<number>(urls.length).fill(0);
    const total = new Array<number>(urls.length).fill(0);
    const report = () => {
      const sum = total.reduce((a, b) => a + b, 0);
      if (sum > 0) setProgress(Math.min(99, Math.round((done.reduce((a, b) => a + b, 0) / sum) * 100)));
    };
    loading.current = Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        total[i] = Number(res.headers.get("content-length")) || 0;
        const reader = res.body?.getReader();
        let blob: Blob;
        if (reader) {
          const chunks: BlobPart[] = [];
          for (;;) {
            const { done: end, value } = await reader.read();
            if (end) break;
            chunks.push(value);
            done[i] += value.byteLength;
            report();
          }
          blob = new Blob(chunks);
        } else {
          blob = await res.blob();
        }
        const name = fileName(url, i);
        return new File([blob], name, { type: typeOf(name, res.headers.get("content-type") ?? "") });
      }),
    ).then(
      (got) => {
        files.current = got;
        loading.current = null;
        setProgress(100);
        setPhase("ready");
        return got;
      },
      (err) => {
        loading.current = null;
        setPhase("failed");
        throw err;
      },
    );
    return loading.current;
  }

  async function copyCaption(): Promise<boolean> {
    if (!post?.caption) return false;
    const ok = await copyText(post.caption);
    if (ok) {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2500);
    }
    return ok;
  }

  /**
   * Hand the files to the share menu, or save them where there is none.
   * Returns false when the browser refused because the tap had gone stale,
   * which is the cue to wait for another tap.
   */
  async function hand(got: File[]): Promise<boolean> {
    if (!canShareFiles(got)) {
      saveFiles(got);
      return true;
    }
    try {
      await navigator.share({ files: got });
      return true;
    } catch (err) {
      // Closing the menu without choosing is not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return true;
      if (err instanceof DOMException && err.name === "NotAllowedError") return false;
      throw err;
    }
  }

  /** The picture's tap: caption to the clipboard, video to the share menu. */
  async function share() {
    if (!post) return;
    // First, while the tap is still fresh: the clipboard needs one too.
    void copyCaption();
    try {
      const ready = files.current;
      const got = ready ?? (await load());
      const handed = await hand(got);
      if (!handed) setPhase("ready");
    } catch {
      setPhase("failed");
    }
  }

  /** The Download video button: the file itself, through the same menu on a
   *  phone (where "Save Video" lives) and as a download on a computer. */
  async function download() {
    if (!post) return;
    try {
      const got = files.current ?? (await load());
      const handed = await hand(got);
      if (!handed) setPhase("ready");
    } catch {
      setPhase("failed");
    }
  }

  return { phase, progress, copied, share, download, copyCaption };
}

export type PostMedia = ReturnType<typeof usePostMedia>;

/**
 * The post's picture: the video's first frame (or the first slide), and the
 * thing to tap to go and post it.
 */
export function PostMediaCard({ media, url }: { media: PostMedia; url: string }) {
  const { phase, progress, copied } = media;
  return (
    <button
      onClick={() => void media.share()}
      aria-label="Post this"
      className={cn(
        "group relative mt-1.5 aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-nested border bg-card-raised transition-colors",
        phase === "ready" ? "border-accent" : "border-border hover:border-text-muted/50",
      )}
    >
      {isVideo(url) ? (
        // `#t=0.1` makes Safari draw the first frame instead of a black box.
        <video
          src={`${url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          className="pointer-events-none size-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a remote file of unknown size, shown as it is
        <img src={url} alt="" loading="lazy" className="pointer-events-none size-full object-cover" />
      )}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-colors",
          phase === "loading" || phase === "ready" ? "bg-black/55" : "bg-black/25 group-hover:bg-black/40",
        )}
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            phase === "ready" ? "bg-accent text-black" : "bg-black/50 text-white",
          )}
        >
          {phase === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : phase === "failed" ? (
            <TriangleAlert className="size-4" />
          ) : (
            <Upload className="size-4" />
          )}
        </span>
      </span>
      {phase === "loading" && progress > 0 && (
        <span className="tnum absolute inset-x-0 bottom-1 text-center text-[10px] font-medium text-white">
          {progress}%
        </span>
      )}
      {copied && (
        <span className="absolute inset-x-1 top-1 flex items-center justify-center gap-0.5 rounded-full bg-black/70 py-0.5 text-[10px] font-medium text-white">
          <Check className="size-3" />
          Caption
        </span>
      )}
    </button>
  );
}

/**
 * The post's song, with a button to copy it (Garreth, 2026-10-01). The robot
 * attaches the song itself when it posts to TikTok; posting by hand, the
 * person adds it in the app, so the name has to be on the task. Copied, it
 * pastes straight into TikTok's sound search.
 */
export function SongLine({ song }: { song: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    if (!(await copyText(song))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  }

  return (
    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
      <MusicNote className="size-3.5 shrink-0" />
      {/* Wraps rather than truncates: beside the picture on a phone there is
          room for about ten letters, and a cut-off song cannot be read. */}
      <span className="min-w-0 break-words">{song}</span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Song copied" : "Copy song"}
        className="-my-2 flex size-9 shrink-0 items-center justify-center rounded-full hover:text-text-primary"
      >
        {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

/** Copy caption, as a row button would show it once it has worked. */
export function CopiedIcon({ copied }: { copied: boolean }) {
  return copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />;
}
