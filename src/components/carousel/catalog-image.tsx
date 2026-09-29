"use client";
import { useState } from "react";

/** Third-party source images may expire. A broken image never removes its record. */
export function CatalogImage({ src, alt }: { src: string | null; alt: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return <div className="flex h-full min-h-32 items-center justify-center bg-card-sunken text-sm text-text-muted">Image gone</div>;
  // External corpus URLs are displayed directly; do not send private signed URLs
  // through an image optimization proxy or require an exhaustive host allow-list.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} className="h-full w-full object-contain" />;
}
