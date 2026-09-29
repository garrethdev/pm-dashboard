"use client";

/**
 * The details window (D10 round three, DEV-42): one window over Trends or
 * Overview with the slides at the left and three tabs at the right —
 * Details, Analysis, Transcription — and along the foot thumb up, thumb
 * down and Save at the left, View Post and Copy to Studio at the right.
 * Closed by the X, the scrim or Escape, back to exactly where it was.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Btn, compact, post, shortDate, useJson } from "@/components/carousel/kit";
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Loader2, ThumbsDown, ThumbsUp, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Reference, ReferenceAnalysis } from "@/server/carousel/repo/types";

type Tab = "details" | "analysis" | "transcription";

function Group({ title, open: initial, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(Boolean(initial));
  return (
    <div className="border-t border-border first:border-t-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-2.5 text-sm font-medium">
        {title}
        <ChevronDown className={cn("size-3.5 text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export function DetailsWindow({ id, onClose, onChanged, startSlide = 0 }: { id: number; onClose: () => void; onChanged?: () => void; startSlide?: number }) {
  const { data, error, reload, setData } = useJson<{ reference: Reference; analysis: ReferenceAnalysis }>(`/api/carousel-generator/trends/reference/${id}`);
  const [tab, setTab] = useState<Tab>("details");
  const [slide, setSlide] = useState(startSlide);
  const box = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      opener.current?.focus?.();
    };
  }, [onClose]);

  const r = data?.reference;
  const a = data?.analysis;
  const slides = r?.slides ?? [];
  const cur = slides[Math.min(slide, Math.max(0, slides.length - 1))];

  const save = async () => {
    if (!r) return;
    const res = await post<{ saved: boolean }>("/api/carousel-generator/trends/save", { id: r.id });
    if (res.data) {
      setData((d) => (d ? { ...d, reference: { ...d.reference, saved: res.data!.saved } } : d));
      onChanged?.();
    }
  };
  const vote = async (v: "up" | "down") => {
    if (!r) return;
    const next = r.vote === v ? null : v;
    setData((d) => (d ? { ...d, reference: { ...d.reference, vote: next } } : d));
    await post("/api/carousel-generator/trends/vote", { id: r.id, vote: next });
  };

  const n = (v: number | null) => (v === null ? "Unknown" : (compact(v) ?? String(v)));

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center md:p-6">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]" />
      <div ref={box} role="dialog" aria-modal="true" aria-label="Carousel details" tabIndex={-1} className="relative flex h-full w-full flex-col overflow-hidden bg-card outline-none md:h-[720px] md:max-w-[1040px] md:flex-row md:rounded-card md:border md:border-border md:shadow-card">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-card-raised text-text-muted hover:text-text-primary"><X className="size-[18px]" /></button>
        {!data && (
          <div className="flex flex-1 items-center justify-center gap-3 p-8 text-sm text-text-muted">
            {error ? <><span>{error}</span><Btn onClick={reload}>Retry</Btn></> : <Loader2 className="size-5 animate-spin" />}
          </div>
        )}
        {r && a && (
          <>
            <div className="relative flex shrink-0 items-center justify-center bg-bg md:w-[420px]">
              <div className="relative aspect-[4/5] w-full max-w-[360px] overflow-hidden bg-card-sunken md:my-4 md:rounded-xl">
                {cur?.media ? <span className="block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${cur.media}")` }} role="img" aria-label={`Slide ${slide + 1}`} /> : <div className="flex h-full items-center justify-center text-xs text-text-muted">Image gone</div>}
                {slides.length > 1 && (
                  <>
                    <button type="button" aria-label="Previous slide" onClick={() => setSlide((s) => Math.max(0, s - 1))} className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"><ChevronLeft className="size-4" /></button>
                    <button type="button" aria-label="Next slide" onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))} className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"><ChevronRight className="size-4" /></button>
                    <span className="absolute top-2 right-2 rounded-full bg-black/45 px-2 text-[11px] leading-4 text-white tnum">{Math.min(slide + 1, slides.length)} / {slides.length}</span>
                    <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">{slides.map((_, i) => <i key={i} className={cn("size-1.5 rounded-full", i === slide ? "bg-white" : "bg-white/40")} />)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col gap-1 px-5 pt-4 pr-14">
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-full bg-pill-bg px-2 py-0.5 text-[11px] font-medium text-text-muted uppercase">{r.platform}</span>
                  <b className="truncate">{r.handle ? `@${r.handle}` : "Unknown"}</b>
                </div>
                {r.topics.length > 0 && <span className="text-xs text-text-muted">{r.topics.map((t) => t.replace(/_/g, " ")).join(" · ")}</span>}
              </div>
              <div role="tablist" aria-label="Details" className="mt-3 flex gap-1 border-b border-border px-5">
                {(["details", "analysis", "transcription"] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("-mb-px border-b-2 px-2 py-2 text-sm capitalize", tab === t ? "border-text-primary font-medium" : "border-transparent text-text-muted hover:text-text-primary")}>{t}</button>
                ))}
              </div>
              <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm">
                {tab === "details" && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[["Views", n(r.views)], ["Likes", n(r.likes)], ["Saves", n(r.saves)]].map(([l, v]) => (
                        <div key={l} className="rounded-nested border border-border bg-card-sunken px-3 py-2"><div className="text-[11px] text-text-muted">{l}</div><div className="text-lg font-semibold tnum">{v}</div></div>
                      ))}
                    </div>
                    <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-sm">
                      <dt className="text-text-muted">Posted</dt><dd>{r.publishedAt ? shortDate(r.publishedAt) : "Unknown"}</dd>
                      <dt className="text-text-muted">Platform</dt><dd className="capitalize">{r.platform}</dd>
                      <dt className="text-text-muted">Slides</dt><dd className="tnum">{slides.length}</dd>
                    </dl>
                    {r.hook && <p className="whitespace-pre-wrap text-text-muted">{r.hook}</p>}
                  </div>
                )}
                {tab === "analysis" && (
                  a.status === "none" ? (
                    <div className="flex flex-col items-start gap-3 text-text-muted">
                      <p>Not transcribed or analysed yet</p>
                      <Btn disabled title="Analysis on demand is not connected yet">Transcribe and analyse</Btn>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="mb-2 flex items-center gap-2 text-xs text-text-muted">
                        <span className="rounded-full bg-pill-bg px-2 py-0.5 font-medium text-text-primary capitalize">{a.status}</span>
                        {a.readAt && <span>Read by the model · {shortDate(a.readAt)}</span>}
                      </div>
                      {Object.keys(a.summary).length > 0 && (
                        <Group title="Summary" open>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {Object.entries(a.summary).map(([k, v]) => (<div key={k}><dt className="text-[11px] text-text-muted">{k}</dt><dd>{v}</dd></div>))}
                          </dl>
                        </Group>
                      )}
                      {Object.keys(a.howItWorks).length > 0 && (
                        <Group title="How it works">
                          <div className="flex flex-col gap-2 text-text-muted">
                            {Object.entries(a.howItWorks).map(([k, v]) => (<p key={k}><b className="font-medium text-text-primary">{k}.</b> {v}</p>))}
                          </div>
                        </Group>
                      )}
                      {(a.keep.length > 0 || a.limits.length > 0) && (
                        <Group title="Reusable pattern">
                          {a.keep.length > 0 && <><div className="mb-1 text-[11px] font-medium text-text-muted uppercase">Keep</div><ul className="mb-3 list-disc pl-5 text-text-muted">{a.keep.map((k) => <li key={k}>{k}</li>)}</ul></>}
                          {a.limits.length > 0 && <><div className="mb-1 text-[11px] font-medium text-text-muted uppercase">Limits</div><ul className="list-disc pl-5 text-text-muted">{a.limits.map((k) => <li key={k}>{k}</li>)}</ul></>}
                        </Group>
                      )}
                      <Group title="Audience response">
                        {a.themes.length === 0 && a.questions.length === 0 ? (
                          <p className="text-text-muted">Too few comments to read</p>
                        ) : (
                          <>
                            <div className="mb-2 flex flex-wrap gap-1.5">{a.themes.map((t) => <span key={t} className="rounded-full bg-pill-bg px-2.5 py-0.5 text-xs text-text-muted">{t}</span>)}</div>
                            {a.questions.length > 0 && <ul className="list-disc pl-5 text-text-muted">{a.questions.map((q) => <li key={q}>{q}</li>)}</ul>}
                          </>
                        )}
                      </Group>
                    </div>
                  )
                )}
                {tab === "transcription" && (
                  slides.every((s) => s.copy === null) && a.status === "none" ? (
                    <div className="flex flex-col items-start gap-3 text-text-muted">
                      <p>Not transcribed or analysed yet</p>
                      <Btn disabled title="Analysis on demand is not connected yet">Transcribe and analyse</Btn>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {a.slidesRead && <span className="text-xs text-text-muted tnum">{a.slidesRead.read === a.slidesRead.of ? `All ${a.slidesRead.of} slides read` : `${a.slidesRead.read} of ${a.slidesRead.of} slides read`}</span>}
                      {slides.map((s, i) => (
                        <button key={s.position} type="button" onClick={() => setSlide(i)} className={cn("flex flex-col gap-1 rounded-nested border border-border p-3 text-left hover:bg-card-raised", i === slide && "border-text-muted")}>
                          <span className="flex items-center gap-2 text-[11px] text-text-muted"><span className="tnum">{i === 0 ? "Opening slide" : `Slide ${s.position}`}</span>{s.role && <span className="rounded-full bg-pill-bg px-2 py-0.5 capitalize">{s.role.replace(/_/g, " ")}</span>}</span>
                          <span className="whitespace-pre-wrap">{s.copy?.trim() || <i className="text-text-muted">No words on this slide</i>}</span>
                          {s.visual && <span className="text-xs text-text-muted">{s.visual}</span>}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
                <button type="button" aria-pressed={r.vote === "up"} aria-label="Useful" onClick={() => vote("up")} className={cn("flex size-8 items-center justify-center rounded-full border border-border", r.vote === "up" ? "bg-text-primary text-bg" : "text-text-muted hover:text-text-primary")}><ThumbsUp className="size-4" /></button>
                <button type="button" aria-pressed={r.vote === "down"} aria-label="Not useful" onClick={() => vote("down")} className={cn("flex size-8 items-center justify-center rounded-full border border-border", r.vote === "down" ? "bg-text-primary text-bg" : "text-text-muted hover:text-text-primary")}><ThumbsDown className="size-4" /></button>
                <Btn onClick={save} ariaLabel={r.saved ? "Unsave" : "Save"}><Bookmark className={cn("size-3.5", r.saved && "text-accent")} />{r.saved ? "Saved" : "Save"}</Btn>
                <span className="ml-auto flex items-center gap-2">
                  {r.sourceUrl && (
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary">View Post <ExternalLink className="size-3.5" /></a>
                  )}
                  <Link href={`/carousel-generator/studio?reference=${r.id}` as never} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary">Copy to Studio</Link>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
