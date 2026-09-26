"use client";

/**
 * The generator's small shared pieces (DEV-13): the buttons the designs draw
 * on every screen, the page head, the pill words for a batch, a fetch hook
 * with a Retry, and the date words. Everything here is the app's tokens; no
 * colour is spelled out.
 */
import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "@/components/ui/icons";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import type { BatchWords } from "@/server/carousel/status-words";

/** The quiet grey outline button: the designs' `btn2`. */
export function Btn({
  children,
  onClick,
  href,
  disabled,
  full,
  line,
  busy,
  className,
  type = "button",
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  full?: boolean;
  /** Outline only, for a button inside a card. */
  line?: boolean;
  busy?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
  ariaLabel?: string;
}) {
  const cls = cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
    line ? "bg-transparent" : "bg-card-raised",
    "text-text-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40",
    full && "w-full",
    className,
  );
  if (href) {
    return (
      <Link href={href as never} className={cls} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} className={cls} title={title} aria-label={ariaLabel}>
      {busy && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/** The accent pill, sized like the secondary button when it sits in a row. */
export function Accent({
  children,
  onClick,
  href,
  disabled,
  busy,
  small,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const cls = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent font-medium whitespace-nowrap text-bg transition-[transform,opacity]",
    "shadow-[inset_0_0_0_1px_var(--accent-deep)] hover:shadow-[inset_0_0_0_1px_var(--accent-deep),inset_1px_1px_0_rgba(255,255,255,0.55)] active:scale-[0.97]",
    small ? "border border-transparent px-3.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
    className,
  );
  if (href) {
    return (
      <Link href={href as never} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} className={cls}>
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** The quiet grey pill with the app's tones. */
export function Pill({ tone = "neutral", children, className }: { tone?: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <StatusPill tone={tone} className={className}>
      {children}
    </StatusPill>
  );
}

/** The batch's DEV-61 words as a pill: neutral, accent while working, danger for Stopped. */
export function WordsPill({ words }: { words: BatchWords }) {
  return <Pill tone={words.tone === "danger" ? "danger" : words.tone === "accent" ? "accent" : "neutral"}>{words.label}</Pill>;
}

/** "‹ Carousel types" over the title, then the title with its pills and its actions. */
export function PageHead({
  back,
  title,
  meta,
  actions,
  children,
}: {
  back?: { href: string; label: string };
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {back && (
        <Link href={back.href as never} className="inline-flex w-fit items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary">
          <ChevronLeft className="size-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>
          {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/** A section heading the height of a secondary button, with a quiet link at its end. */
export function SectionHead({ title, note, link, action }: { title: string; note?: string; link?: { href: string; label: string }; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[30px] items-center gap-2 px-0.5">
      <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
      {note && <span className="hidden truncate text-xs text-text-muted tnum sm:inline">{note}</span>}
      {action && <span className="ml-auto">{action}</span>}
      {link && !action && (
        <Link href={link.href as never} className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text-primary">
          {link.label} <ChevronRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

/** The thin progress track under a batch's count line. */
export function Track({ value }: { value: number }) {
  return (
    <div aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-card-raised">
      <i className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}

/** One quiet error line with Retry, in the place the content would be. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-nested border border-border bg-card-sunken px-4 py-3 text-sm text-text-muted">
      <span>{message}</span>
      {onRetry && (
        <Btn onClick={onRetry}>Retry</Btn>
      )}
    </div>
  );
}

/** Load JSON from one of the generator's routes, with a Retry and optional polling. */
/**
 * Read a JSON route. Server-rendered pages pass `initial`, and the hook then
 * trusts it instead of fetching the same thing again on mount.
 *
 * `every` is how often to re-read while the page is open: a number, or a
 * function of the latest data that answers null when nothing on the screen
 * can change on its own (no batch writing or rendering). It is re-asked
 * whenever the data changes, so a press that starts work starts the polling
 * with it. A screen that is not polling still catches up when the person
 * comes back to the tab.
 */
export function useJson<T>(url: string | null, opts: { every?: number | ((data: T | null) => number | null); initial?: T | null } = {}) {
  const [data, setData] = useState<T | null>(opts.initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!opts.initial && Boolean(url));
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const skipFirst = opts.initial != null;
  const interval = useEffectEvent((latest: T | null): number | null => {
    const e = opts.every;
    if (typeof e === "function") return e(latest);
    return e ?? null;
  });

  // The read itself. The first pass is skipped when the page already
  // rendered the data on the server.
  useEffect(() => {
    if (!url || (skipFirst && tick === 0)) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!alive) return;
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setData(json as T);
        setError(null);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not load");
      } finally {
        if (alive) {
          setLoading(false);
          setSettled((n) => n + 1);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [url, tick, skipFirst]);

  // The next read, decided from what is on screen now. Re-evaluated after
  // every read and whenever the data is changed by a press.
  useEffect(() => {
    if (!url) return;
    const wait = interval(data);
    if (wait == null) return;
    const t = setTimeout(() => setTick((n) => n + 1), document.visibilityState === "hidden" ? wait * 3 : wait);
    return () => clearTimeout(t);
  }, [url, data, settled]);

  // Coming back to the tab re-reads once, so a screen that is not polling
  // is never older than the moment the person last looked at it.
  useEffect(() => {
    if (!url) return;
    const onBack = () => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [url]);

  return { data, error, loading, reload, setData };
}

/** POST to a generator route and hand back the JSON or the error sentence. */
export async function post<T = { ok: true }>(url: string, body?: unknown, method: "POST" | "PATCH" = "POST"): Promise<{ data: T | null; error: string | null; code?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) return { data: null, error: json.error ?? `HTTP ${res.status}`, code: json.code };
    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Could not reach the server" };
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 12", or "Sep 12, 2025" when it is not this year. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

/** "Just now", "6m ago", "2h ago", then the date. */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return shortDate(iso);
}

/** "1.2M", "412k", "58k", or the number. Null stays null so it can be left off. */
export function compact(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** Slides plus the canvas shape: "7 slides · 3:4". */
export function slidesText(b: { slides: number | null; size: string | null }): string {
  const parts: string[] = [];
  if (b.slides) parts.push(`${b.slides} slides`);
  if (b.size) parts.push(b.size);
  return parts.join(" · ");
}

export function typeMeta(t: { character: string; slides: number | null; size: string | null }) {
  return (
    <>
      {t.character && <Pill>{t.character}</Pill>}
      {slidesText(t) && <Pill className="tnum">{slidesText(t)}</Pill>}
    </>
  );
}

/** A slide painted by the painter, drawn inline at any size. */
export function SlideFace({ svg, className, label }: { svg: string | null; className?: string; label?: string }) {
  if (!svg) return <div className={cn("bg-card-sunken", className)} aria-label={label} />;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("overflow-hidden bg-card-sunken [&>svg]:block [&>svg]:h-full [&>svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
