"use client";

/**
 * Trends (D10, round three approved 2026-09-19). A fixed page frame with one
 * scrolling region: the title and the search box pinned, the rail of four
 * sections down the left (a floating bar on a phone), the Recent saves
 * panel at the right on the desktop. The Feed holds what this person has
 * not seen, best first; the end of it offers the older ones. A post has
 * thumbs, Copy to Studio and View Details, and its numbers on a line of
 * their own with a null number left off. Saved is a grid three across.
 * Digests and Knowledge keep their substance.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DetailsWindow } from "@/components/carousel/details-window";
import { Btn, Pill, compact, post, shortDate, useJson } from "@/components/carousel/kit";
import { TrendsSearch } from "@/components/carousel/trends-search";
import { Bookmark, Check, ChevronLeft, ChevronRight, LayoutList, Loader2, PaintBrush, ThumbsDown, ThumbsUp, TrendUp } from "@/components/ui/icons";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { cn } from "@/lib/utils";
import type { Digest, KnowledgeRule, Reference } from "@/server/carousel/repo/types";

type Section = "feed" | "digests" | "knowledge" | "saved";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "digests", label: "Digests" },
  { id: "knowledge", label: "Knowledge" },
  { id: "saved", label: "Saved" },
];

function numbersLine(r: Reference): string {
  const parts: string[] = [];
  const v = compact(r.views);
  const l = compact(r.likes);
  const s = compact(r.saves);
  if (v) parts.push(`${v} views`);
  if (l) parts.push(`${l} likes`);
  if (s) parts.push(`${s} saves`);
  return parts.join(" · ");
}

function Post({ r, onDetails, onVote, onSeen }: { r: Reference; onDetails: () => void; onVote: (v: "up" | "down") => void; onSeen: (id: number) => void }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !timer) timer = setTimeout(() => { seen.current = true; onSeen(r.id); io.disconnect(); }, 1000);
        else if (!e.isIntersecting && timer) { clearTimeout(timer); timer = null; }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [r.id, onSeen]);
  const slides = r.slides;
  const cur = slides[i];
  return (
    <article ref={ref} aria-label={`${r.handle ?? "Carousel"}, ${slides.length} slides`} className="flex flex-col gap-2.5 border-b border-border py-5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-card-raised" aria-hidden><PlatformIcon platform={r.platform} className="size-4 text-text-primary" /></span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-baseline gap-1.5 text-sm"><b className="truncate">{r.handle ? `@${r.handle}` : "Unknown"}</b>{r.publishedAt && <span className="text-xs text-text-muted tnum">· {shortDate(r.publishedAt)}</span>}</span>
          {r.topics.length > 0 && <span className="truncate text-xs text-text-muted">{r.topics.map((t) => t.replace(/_/g, " ")).join(" · ")}</span>}
        </span>
        {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-full border border-border px-3 py-1 text-xs font-medium text-text-muted hover:text-text-primary">View Post</a>}
      </div>
      <div className="group relative -mx-4 sm:mx-0">
        <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto sm:rounded-xl" onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {slides.map((s) => (
            <span key={s.position} className="aspect-[4/5] w-full shrink-0 snap-start bg-card-sunken bg-cover bg-center" style={s.media ? { backgroundImage: `url("${s.media}")` } : undefined} role="img" aria-label={`Slide ${s.position}`}>
              {!s.media && <span className="flex h-full items-center justify-center text-xs text-text-muted">Image gone</span>}
            </span>
          ))}
        </div>
        {slides.length > 1 && (
          <>
            <span className="absolute top-2 right-2 rounded-full bg-black/45 px-2 text-[11px] leading-4 text-white tnum">{Math.min(i + 1, slides.length)} / {slides.length}</span>
            <button type="button" aria-label="Previous slide" onClick={(e) => { const t = e.currentTarget.parentElement?.firstElementChild as HTMLElement; t.scrollBy({ left: -t.clientWidth, behavior: "smooth" }); }} className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"><ChevronLeft className="size-4" /></button>
            <button type="button" aria-label="Next slide" onClick={(e) => { const t = e.currentTarget.parentElement?.firstElementChild as HTMLElement; t.scrollBy({ left: t.clientWidth, behavior: "smooth" }); }} className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"><ChevronRight className="size-4" /></button>
          </>
        )}
      </div>
      {slides.length > 1 && <div className="flex justify-center gap-1" aria-hidden>{slides.map((_, k) => <i key={k} className={cn("size-1.5 rounded-full", k === i ? "bg-text-primary" : "bg-border")} />)}</div>}
      <div className="flex items-center gap-1.5">
        <button type="button" aria-pressed={r.vote === "up"} aria-label="Useful" onClick={() => onVote("up")} className={cn("flex size-8 items-center justify-center rounded-full border border-border", r.vote === "up" ? "bg-text-primary text-bg" : "text-text-muted hover:text-text-primary")}><ThumbsUp className="size-4" /></button>
        <button type="button" aria-pressed={r.vote === "down"} aria-label="Not useful" onClick={() => onVote("down")} className={cn("flex size-8 items-center justify-center rounded-full border border-border", r.vote === "down" ? "bg-text-primary text-bg" : "text-text-muted hover:text-text-primary")}><ThumbsDown className="size-4" /></button>
        <span className="flex-1" />
        <Link href={`/carousel-generator/studio?reference=${r.id}` as never} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-muted hover:text-text-primary"><PaintBrush className="size-3.5" />Copy to Studio</Link>
        <button type="button" onClick={onDetails} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-muted hover:text-text-primary">View Details</button>
      </div>
      {numbersLine(r) && <span className="text-xs text-text-muted tnum">{numbersLine(r)}</span>}
      {r.hook && <p className="text-sm"><b className="mr-1.5">{r.handle ? `@${r.handle}` : ""}</b><span className="whitespace-pre-line text-text-muted">{cur?.copy ?? r.hook}</span></p>}
    </article>
  );
}

function Tile({ r, onOpen }: { r: Reference; onOpen: () => void }) {
  const img = r.slides[0]?.media ?? r.thumbnail;
  return (
    <button type="button" onClick={onOpen} aria-label={`${r.handle ?? "Carousel"}, ${r.slides.length} slides`} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-card-sunken bg-cover bg-center transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
      <span className="absolute top-2 right-2 text-white drop-shadow"><LayoutList className="size-3.5" /></span>
      <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 text-[11px] leading-4 text-white tnum">{r.slides.length} slides</span>
    </button>
  );
}

function Feed({ onOpen }: { onOpen: (id: number) => void }) {
  const [items, setItems] = useState<Reference[]>([]);
  const [older, setOlder] = useState<Reference[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "end" | "error">("loading");
  const [moreNew, setMoreNew] = useState(true);
  const [moreOld, setMoreOld] = useState(true);
  const [fresh, setFresh] = useState(0);
  const queue = useRef<number[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const flush = useCallback(() => {
    if (!queue.current.length) return;
    const ids = queue.current.splice(0);
    const body = JSON.stringify({ ids });
    if (typeof navigator.sendBeacon === "function") navigator.sendBeacon("/api/carousel-generator/trends/seen", new Blob([body], { type: "application/json" }));
    else void fetch("/api/carousel-generator/trends/seen", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  }, []);
  const onSeen = useCallback((id: number) => { queue.current.push(id); }, []);
  useEffect(() => {
    const t = setInterval(flush, 4000);
    window.addEventListener("pagehide", flush);
    return () => { clearInterval(t); window.removeEventListener("pagehide", flush); flush(); };
  }, [flush]);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (older === null) {
        const last = items[items.length - 1];
        const q = last ? `?afterScore=${last.score}&afterId=${last.id}` : "";
        const res = await fetch(`/api/carousel-generator/trends/feed${q}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = (await res.json()) as { items: Reference[]; more: boolean };
        setItems((p) => [...p, ...j.items.filter((x) => !p.some((y) => y.id === x.id))]);
        setMoreNew(j.more && j.items.length > 0);
        setState("ready");
      } else {
        const last = older[older.length - 1];
        const q = `?seen=1${last?.seenAt ? `&before=${encodeURIComponent(last.seenAt)}` : ""}`;
        const res = await fetch(`/api/carousel-generator/trends/feed${q}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = (await res.json()) as { items: Reference[]; more: boolean };
        setOlder((p) => [...(p ?? []), ...j.items.filter((x) => !(p ?? []).some((y) => y.id === x.id))]);
        setMoreOld(j.more && j.items.length > 0);
        if (!j.more || j.items.length === 0) setState("end");
      }
    } catch {
      setState("error");
    } finally {
      busy.current = false;
    }
  }, [items, older]);

  // The sentinel sits under the list and is on screen from the start, so the
  // same observer fetches the first page and every page after it.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && ((older === null && moreNew) || (older !== null && moreOld))) void loadMore(); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, moreNew, moreOld, older]);
  // New while open: poll the unseen count and offer, never insert (DEV-45).
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch("/api/carousel-generator/trends/feed?count=1", { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const j = (await res.json()) as { unseen: number };
      const known = items.length;
      if (j.unseen > known) setFresh(j.unseen - known);
    }, 180_000);
    return () => clearInterval(t);
  }, [items.length]);

  const vote = async (r: Reference, v: "up" | "down") => {
    const next = r.vote === v ? null : v;
    const upd = (list: Reference[]) => list.map((x) => (x.id === r.id ? { ...x, vote: next } : x));
    setItems(upd);
    setOlder((o) => (o ? upd(o) : o));
    await post("/api/carousel-generator/trends/vote", { id: r.id, vote: next });
  };

  if (state === "error" && items.length === 0) return <div className="flex flex-col items-start gap-2 py-8 text-sm text-text-muted"><span>The feed could not be loaded</span><Btn onClick={() => { setState("loading"); void loadMore(); }}>Retry</Btn></div>;
  return (
    <div className="flex flex-col">
      {fresh > 0 && <div className="flex justify-center py-3"><Btn onClick={() => { setItems([]); setOlder(null); setFresh(0); setMoreNew(true); void loadMore(); }}>{fresh} new carousels</Btn></div>}
      {state === "loading" && items.length === 0 && <div className="flex justify-center py-10 text-text-muted"><Loader2 className="size-5 animate-spin" /></div>}
      {state !== "loading" && items.length === 0 && older === null && (
        <div className="flex flex-col items-center gap-1 py-3 text-xs text-text-muted"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5" />No new carousels</span></div>
      )}
      {items.map((r) => <Post key={r.id} r={r} onDetails={() => onOpen(r.id)} onVote={(v) => vote(r, v)} onSeen={onSeen} />)}
      {older === null && !moreNew && state !== "loading" && (
        <div className="flex flex-col items-center gap-2 py-6 text-xs text-text-muted">
          {items.length > 0 && <span className="inline-flex items-center gap-1.5"><Check className="size-3.5" />No more new carousels</span>}
          <Btn onClick={() => { setOlder([]); void loadMore(); }}>See older carousels</Btn>
        </div>
      )}
      {older?.map((r) => <Post key={`o${r.id}`} r={r} onDetails={() => onOpen(r.id)} onVote={(v) => vote(r, v)} onSeen={onSeen} />)}
      {state === "end" && <p className="py-6 text-center text-xs text-text-muted">That’s every carousel</p>}
      <div ref={sentinel} className="h-px" />
      {state === "ready" && ((older === null && moreNew) || (older !== null && moreOld)) && <div className="flex justify-center py-4 text-text-muted"><Loader2 className="size-4 animate-spin" /></div>}
    </div>
  );
}

function Saved({ onOpen, refreshKey }: { onOpen: (id: number) => void; refreshKey: number }) {
  const { data, error, reload } = useJson<{ items: Reference[] }>(`/api/carousel-generator/trends/saved?k=${refreshKey}`);
  if (error) return <div className="py-8 text-sm text-text-muted">{error} <Btn onClick={reload}>Retry</Btn></div>;
  if (!data) return <div className="flex justify-center py-10 text-text-muted"><Loader2 className="size-5 animate-spin" /></div>;
  if (data.items.length === 0) return <div className="flex flex-col items-center gap-2 py-16 text-sm text-text-muted"><Bookmark className="size-6" />Nothing saved yet</div>;
  return <div className="grid grid-cols-3 gap-1.5 py-2">{data.items.map((r) => <Tile key={r.id} r={r} onOpen={() => onOpen(r.id)} />)}</div>;
}

function Digests({ onOpen }: { onOpen: (id: number) => void }) {
  const { data, error, reload } = useJson<{ digests: Digest[] }>("/api/carousel-generator/trends/digests");
  const [open, setOpen] = useState<number | null>(null);
  if (error) return <div className="py-8 text-sm text-text-muted">{error} <Btn onClick={reload}>Retry</Btn></div>;
  if (!data) return <div className="flex justify-center py-10 text-text-muted"><Loader2 className="size-5 animate-spin" /></div>;
  if (data.digests.length === 0) return <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-text-muted"><TrendUp className="size-6" />No digests yet<span className="text-xs">The daily study digest is not captured into the app yet.</span></div>;
  const cur = data.digests.find((d) => d.id === open) ?? data.digests[0];
  return (
    <div className="grid gap-4 py-2 md:grid-cols-[180px_minmax(0,1fr)]">
      <div className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col">
        {data.digests.map((d) => (
          <button key={d.id} type="button" onClick={() => setOpen(d.id)} className={cn("flex shrink-0 flex-col rounded-nested px-3 py-2 text-left text-sm", cur.id === d.id ? "bg-card font-medium" : "text-text-muted hover:text-text-primary")}>
            <span className="tnum">{shortDate(d.receivedAt)}</span>
            <span className="text-xs text-text-muted tnum">{d.carouselCount ?? d.carousels.length} carousels</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{cur.subject ?? shortDate(cur.receivedAt)}</h3>{!cur.analysedAt && <Btn disabled title="Analysis is not connected yet">Analyse</Btn>}</div>
        {cur.body && <p className="max-h-60 overflow-y-auto rounded-nested border border-border bg-card-sunken p-3 text-xs whitespace-pre-wrap text-text-muted">{cur.body}</p>}
        {cur.rules.length > 0 && <ul className="flex flex-col gap-1 text-sm">{cur.rules.map((r) => <li key={r.rule} className="flex gap-2"><span className="text-text-muted">•</span><span>{r.rule}{r.confidence && <span className="ml-1 text-xs text-text-muted">· {r.confidence}</span>}</span></li>)}</ul>}
        {cur.carousels.length > 0 && <div className="grid grid-cols-3 gap-1.5">{cur.carousels.map((r) => <Tile key={r.id} r={r} onOpen={() => onOpen(r.id)} />)}</div>}
        {cur.queued.length > 0 && <ul className="text-xs text-text-muted">{cur.queued.map((q) => <li key={q.url}>Queued {shortDate(q.queuedAt)} · {q.url}</li>)}</ul>}
      </div>
    </div>
  );
}

function Knowledge() {
  const { data, error, reload, setData } = useJson<{ rules: KnowledgeRule[] }>("/api/carousel-generator/trends/knowledge");
  const [conf, setConf] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  if (error) return <div className="py-8 text-sm text-text-muted">{error} <Btn onClick={reload}>Retry</Btn></div>;
  if (!data) return <div className="flex justify-center py-10 text-text-muted"><Loader2 className="size-5 animate-spin" /></div>;
  const rules = data.rules.filter((r) => (!conf || r.confidence === conf) && (!cat || r.category === cat));
  const pending = rules.filter((r) => r.status !== "active" && r.status !== "rejected");
  const accepted = rules.filter((r) => r.status === "active");
  const cats = [...new Set(data.rules.map((r) => r.category).filter((c): c is string => Boolean(c)))];
  const confs = [...new Set(data.rules.map((r) => r.confidence).filter((c): c is string => Boolean(c)))];
  const decide = async (r: KnowledgeRule, status: "active" | "rejected") => {
    setData((d) => (d ? { rules: d.rules.map((x) => (x.id === r.id ? { ...x, status } : x)) } : d));
    await post(`/api/carousel-generator/trends/knowledge/${r.id}`, { status }, "PATCH");
  };
  const Rule = ({ r, actions }: { r: KnowledgeRule; actions: boolean }) => (
    <li className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        {r.category && <Pill>{r.category.replace(/_/g, " ")}</Pill>}
        {r.confidence && <Pill>{r.confidence}</Pill>}
        {r.platform && <span className="capitalize">{r.platform}</span>}
        <span className="font-mono text-[11px]">{r.ruleKey}</span>
        <span className="ml-auto tnum">{shortDate(r.updatedAt)}</span>
      </div>
      <p className="text-sm">{r.ruleText}</p>
      {r.rationale && <p className="line-clamp-2 text-xs text-text-muted">{r.rationale}</p>}
      {actions && <div className="flex gap-2"><Btn line onClick={() => decide(r, "active")}><Check className="size-3.5" />Accept</Btn><Btn line onClick={() => decide(r, "rejected")}>Reject</Btn></div>}
    </li>
  );
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", cat === c ? "border-text-primary bg-text-primary text-bg" : "border-border text-text-muted hover:text-text-primary")}>{c.replace(/_/g, " ")}</button>)}
        <span className="mx-1 border-l border-border" />
        {confs.map((c) => <button key={c} type="button" aria-pressed={conf === c} onClick={() => setConf(conf === c ? null : c)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", conf === c ? "border-text-primary bg-text-primary text-bg" : "border-border text-text-muted hover:text-text-primary")}>{c}</button>)}
      </div>
      {pending.length > 0 && <section><h3 className="mb-1 text-sm font-semibold">Pending <span className="text-text-muted tnum">{pending.length}</span></h3><ul>{pending.map((r) => <Rule key={r.id} r={r} actions />)}</ul></section>}
      <section><h3 className="mb-1 text-sm font-semibold">Accepted <span className="text-text-muted tnum">{accepted.length}</span></h3>{accepted.length ? <ul>{accepted.map((r) => <Rule key={r.id} r={r} actions={false} />)}</ul> : <p className="text-sm text-text-muted">Nothing accepted yet</p>}</section>
    </div>
  );
}

export function TrendsView({ section, query }: { section?: string; query?: string }) {
  const router = useRouter();
  const cur: Section = SECTIONS.find((s) => s.id === section)?.id ?? "feed";
  const [open, setOpen] = useState<number | null>(null);
  const [savedKey, setSavedKey] = useState(0);
  const [searching, setSearching] = useState(Boolean(query));
  const { data: recent, reload: reloadRecent } = useJson<{ items: Reference[] }>(`/api/carousel-generator/trends/saved?k=${savedKey}`);
  const go = useCallback((s: Section) => router.replace(`/carousel-generator/trends${s === "feed" ? "" : `?section=${s}`}` as never), [router]);
  // Searching from any other section switches to Feed (D10).
  const onSearching = useCallback((on: boolean) => { setSearching(on); if (on && cur !== "feed") go("feed"); }, [cur, go]);
  const changed = () => { setSavedKey((k) => k + 1); reloadRecent(); };

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[480px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Trends</h1>
      </div>
      <div className={cn("grid min-h-0 flex-1 gap-4", cur === "feed" ? "md:grid-cols-[200px_minmax(0,1fr)_300px]" : "md:grid-cols-[200px_minmax(0,1fr)]")}>
        <nav aria-label="Sections" className="fixed inset-x-4 bottom-4 z-30 flex justify-around rounded-full border border-border glass-overlay p-1 md:static md:flex-col md:justify-start md:gap-1 md:self-start md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" aria-current={cur === s.id ? "page" : undefined} onClick={() => go(s.id)} className={cn("rounded-full px-3 py-1.5 text-sm md:rounded-nested md:px-3 md:text-left", cur === s.id ? "bg-card font-medium text-text-primary" : "text-text-muted hover:text-text-primary")}>{s.label}</button>
          ))}
        </nav>
        <div className="no-scrollbar min-h-0 overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto flex w-full max-w-[500px] flex-col gap-2">
            <TrendsSearch compact onSearching={onSearching} initialQuery={query} />
            {cur === "feed" && !searching && <Feed onOpen={setOpen} />}
            {cur === "saved" && <Saved onOpen={setOpen} refreshKey={savedKey} />}
            {cur === "digests" && <Digests onOpen={setOpen} />}
            {cur === "knowledge" && <Knowledge />}
          </div>
        </div>
        <aside className={cn("hidden min-h-0 flex-col", cur === "feed" && "md:flex")} aria-label="Recent saves">
          <section className="flex flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-card">
            <h2 className="text-sm font-medium text-text-muted">Recent saves</h2>
            {(recent?.items ?? []).slice(0, 5).map((r) => (
              <button key={r.id} type="button" onClick={() => setOpen(r.id)} className="flex items-center gap-3 rounded-nested px-1 py-1 text-left hover:bg-card-raised">
                <span className="aspect-[4/5] w-10 shrink-0 rounded-[6px] border border-border bg-card-sunken bg-cover bg-center" style={(r.slides[0]?.media ?? r.thumbnail) ? { backgroundImage: `url("${r.slides[0]?.media ?? r.thumbnail}")` } : undefined} aria-hidden />
                <span className="flex min-w-0 flex-col"><b className="truncate text-sm">{r.handle ? `@${r.handle}` : "Unknown"}</b><span className="text-xs text-text-muted tnum">{numbersLine(r) || "Numbers unknown"}</span></span>
              </button>
            ))}
            {recent && recent.items.length === 0 && <p className="text-xs text-text-muted">Nothing saved yet</p>}
            {recent && recent.items.length > 0 && <button type="button" onClick={() => go("saved")} className="mt-1 w-fit text-xs text-text-muted hover:text-text-primary">View all saves</button>}
          </section>
        </aside>
      </div>
      {open !== null && <DetailsWindow id={open} onClose={() => setOpen(null)} onChanged={changed} />}
    </div>
  );
}
