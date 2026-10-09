"use client";

import { useEffect, useRef, useState } from "react";
import { thumbUrl } from "@/lib/carousel/thumb";

/**
 * A picture that is not asked for until it is near the screen (2026-10-09).
 *
 * The browser's own lazy loading looks more than a thousand pixels ahead on
 * a fast connection, which on the Character 6 grid still meant 120 requests
 * on first paint. This waits until the tile is within a few hundred pixels,
 * so a grid of two hundred asks for the two or three rows in view, and the
 * rest as they scroll up. The picture is the resized copy at `width`.
 */
export function LazyPicture({ src, width, alt = "", className, margin = "320px" }: { src: string; width: number; alt?: string; className?: string; margin?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Starts "waiting" on the server and the client alike, so the two agree;
  // a browser without an observer loads the picture a tick later.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);
  return (
    <span ref={ref} data-lazy-picture={near ? "loaded" : "waiting"} className={className} aria-hidden={alt === "" ? true : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {near && <img src={thumbUrl(src, width) ?? src} alt={alt} loading="lazy" decoding="async" draggable={false} className="pointer-events-none size-full object-cover" />}
    </span>
  );
}
