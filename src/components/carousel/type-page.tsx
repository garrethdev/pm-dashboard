"use client";

/**
 * The type page (D7, approved 2026-09-15; D13 renamed the tabs; D15 added
 * Rows). Overview: the template with its versions and slides, the pool
 * tiles, the details, the batches. Writing: the versions and the editor with
 * Save version, plus the conversation panel. Rows: what sits in the lane
 * table and why each row cannot post. Go Live: the checklist, read from real
 * checks; the wire itself is not built here.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Accent, Btn, LoadError, PageHead, Pill, WordsPill, post, shortDate, typeMeta, useJson } from "@/components/carousel/kit";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, ChevronDown, ChevronRight, Pencil, Table } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { BatchSummary, CarouselType, LaneRow, TemplateRecord, WritingVersion } from "@/server/carousel/repo/types";
import { batchWords } from "@/server/carousel/status-words";

type Tab = "overview" | "writing" | "rows" | "go-live";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "writing", label: "Writing" },
  { id: "rows", label: "Rows" },
  { id: "go-live", label: "Go Live" },
];

interface Payload {
  type: CarouselType;
  template: TemplateRecord | null;
  writing: WritingVersion[];
  batches: BatchSummary[];
  rows: { rows: LaneRow[]; total: number; ready: number };
}

function slideLines(template: Record<string, unknown> | null): { n: number; text: string }[] {
  const slides = (template?.slides as { n: number; text?: { role: string }[] }[] | undefined) ?? [];
  return slides.map((s) => ({ n: s.n, text: (s.text ?? []).map((t) => t.role.replace(/_/g, " ")).join(" · ") || "image" }));
}

function Card({ title, titleExtra, action, children, className }: { title?: string; titleExtra?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && <h2 className="text-sm font-medium text-text-muted">{title}</h2>}
          {titleExtra}
          {action && <span className="ml-auto flex items-center gap-2">{action}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function Overview({ d, onChange }: { d: Payload; onChange: () => void }) {
  const t = d.type;
  const tpl = d.template;
  const [ver, setVer] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const shown = ver ?? tpl?.activeVersion ?? null;
  const shownRow = tpl?.versions.find((v) => v.version === shown);
  const [busy, setBusy] = useState(false);
  const makeActive = async () => {
    if (!tpl || shown === null) return;
    setBusy(true);
    await post(`/api/carousel-generator/templates/${tpl.id}`, { activateVersion: shown }, "PATCH");
    setBusy(false);
    setVer(null);
    onChange();
  };
  const tiles = [
    ["Posts left", t.postsLeft ?? "—"],
    ["Days of cover", t.daysOfCover ?? "—"],
    ["Median views", t.medianViews !== null ? t.medianViews.toLocaleString() : "—"],
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <Card
        action={tpl && <Btn href={`/carousel-generator/studio/${tpl.slug}`}><Pencil className="size-3.5" />Edit template</Btn>}
        title="Template"
        titleExtra={tpl && (
          <>
            <span className="relative">
              <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary">
                <span className="tnum">Version {shown}</span>
                {shownRow && <span className="text-text-muted tnum">{shortDate(shownRow.createdAt)}</span>}
                <ChevronDown className="size-3.5" />
              </button>
              {open && (
                <div role="listbox" aria-label="Template versions" className="absolute top-full left-0 z-20 mt-1 min-w-56 rounded-nested border border-border glass-overlay p-1.5">
                  {tpl.versions.map((v) => (
                    <button key={v.id} type="button" role="option" aria-selected={v.version === shown} onClick={() => { setVer(v.version); setOpen(false); }} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-sm hover:bg-card">
                      <b className="tnum">Version {v.version}</b>
                      <span className="text-xs text-text-muted tnum">{shortDate(v.createdAt)}</span>
                      <span className="ml-auto">{v.active && <Pill tone="ok">Active</Pill>}</span>
                    </button>
                  ))}
                </div>
              )}
            </span>
            {shownRow?.active ? <Pill tone="ok">Active</Pill> : shown !== null && <Btn onClick={makeActive} busy={busy}>Make active</Btn>}
          </>
        )}
      >
        {tpl ? (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {slideLines(tpl.template).map((s) => (
              <div key={s.n} role="img" aria-label={`Slide ${s.n}: ${s.text}`} className={cn("flex w-[104px] shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-border bg-card-sunken p-2 text-center", t.size === "9:16" ? "aspect-[9/16]" : "aspect-[3/4]")}>
                <span className="text-[11px] text-text-muted tnum">{s.n}</span>
                <span className="line-clamp-4 text-[11px] leading-[14px] text-text-primary">{s.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No template. Make one in the Studio.</p>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid grid-cols-3 content-start gap-3" aria-label="Pool">
          {tiles.map(([l, v]) => (
            <div key={l} className="dot-fade flex min-h-[104px] flex-col justify-between gap-2 overflow-hidden rounded-nested border border-border bg-card-raised px-4 py-3 text-text-muted">
              <span className="relative z-10 text-xs">{l}</span>
              <span className={cn("relative z-10 text-2xl font-semibold tnum", v === "—" ? "text-text-muted" : "text-text-primary")}>{v}</span>
            </div>
          ))}
        </div>
        <Card title="Details">
          <dl className="flex flex-col gap-2 text-sm">
            {[
              ["Image library", t.libraryName ?? "None"],
              ["Character", t.character],
              ["Slides", t.slides ?? "—"],
              ["Size", t.size ?? "—"],
              ["Lane table", t.laneTable ?? "Not wired"],
              ["Writing", t.writing ? `Version ${t.writing.version}` : "Needs writing"],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"><dt className="text-text-muted">{k}</dt><dd className="tnum">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
      <Card title="Batches" action={<Link href="/carousel-generator/history" className="inline-flex items-center gap-0.5 text-xs text-text-muted hover:text-text-primary">History <ChevronRight className="size-3" /></Link>}>
        {d.batches.length === 0 ? (
          <p className="text-sm text-text-muted">No batches yet</p>
        ) : (
          <div className="flex flex-col">
            <div className="hidden grid-cols-[88px_80px_80px_80px_80px_minmax(0,1fr)_100px] gap-3 border-b border-border pb-2 text-xs text-text-muted md:grid"><span>Date</span><span>Requested</span><span>Written</span><span>Rendered</span><span>Approved</span><span /><span /></div>
            {d.batches.slice(0, 8).map((b) => {
              const w = batchWords(b);
              return (
                <div key={b.id} className="grid grid-cols-2 gap-2 border-b border-border py-2.5 last:border-b-0 md:grid-cols-[88px_80px_80px_80px_80px_minmax(0,1fr)_100px] md:items-center md:gap-3">
                  <span className="text-sm tnum">{shortDate(b.createdAt)}</span>
                  <span className="text-sm tnum md:contents"><span className="md:hidden text-text-muted">{b.requested} requested</span><span className="hidden md:inline">{b.requested}</span></span>
                  <span className="hidden text-sm tnum md:inline">{b.counts.written || "—"}</span>
                  <span className="hidden text-sm tnum md:inline">{b.counts.rendered || "—"}</span>
                  <span className="hidden text-sm tnum md:inline">{b.counts.approved || "—"}</span>
                  <span className="flex items-center gap-1.5"><WordsPill words={w} />{b.madeInAuto && <Pill>Auto</Pill>}</span>
                  <span className="flex md:justify-end"><Btn href={w.href}>Open</Btn></span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Writing({ d, onChange }: { d: Payload; onChange: () => void }) {
  const active = d.writing.find((w) => w.active) ?? null;
  const [text, setText] = useState(active?.body ?? "");
  const [shown, setShown] = useState<WritingVersion | null>(active);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState("");
  const dirty = text !== (shown?.body ?? "");
  const boxes = useMemo(() => {
    const slides = (d.template?.template?.slides as { text?: { role: string }[] }[] | undefined) ?? [];
    return [...new Set(slides.flatMap((s) => (s.text ?? []).map((t) => t.role)))];
  }, [d.template]);

  const save = async () => {
    setBusy("save");
    setErr(null);
    const res = await post<WritingVersion>(`/api/carousel-generator/types/${encodeURIComponent(d.type.id)}/writing`, { body: text });
    if (res.error) setErr(res.error);
    else {
      setShown(res.data);
      onChange();
    }
    setBusy(null);
  };
  const activate = async (v: WritingVersion) => {
    setBusy(v.id);
    await post(`/api/carousel-generator/types/${encodeURIComponent(d.type.id)}/writing`, { versionId: v.id }, "PATCH");
    setBusy(null);
    onChange();
  };
  const firstDraft = () => {
    const n = d.type.slides ?? boxes.length;
    const draft = `Open on something the reader can picture in their own mirror. Keep every line under twelve words, warm and plain, never clinical. Write in the first person as ${d.type.character || "the character"}.\n\nThe deck has ${n} slides. ${boxes.length ? `Boxes: ${boxes.map((b) => `@${b}`).join(", ")}.` : ""} The opening line is the hook and earns the swipe; the middle slides each carry one honest tip; the last slide names one habit and never a product. The caption ends on a question the reader wants to answer.`;
    setText(draft);
  };
  const ask = () => {
    if (!q.trim()) return;
    const a = shown
      ? `To ${q.trim().toLowerCase().replace(/[.?!]$/, "")}, change the direction above and press Save version. The conversation proposes; it never saves.`
      : "There is nothing written yet. Press Write a first draft, edit it, then Save version.";
    setChat((c) => [...c, { q, a }]);
    setQ("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card
        title={shown ? `Version ${shown.version}${shown.active ? " · Active" : ""}` : "Writing"}
        action={
          <>
            {dirty && <Pill>Not saved</Pill>}
            {shown && !shown.active && !dirty && <Btn onClick={() => activate(shown)} busy={busy === shown.id}>Make active</Btn>}
            <Accent onClick={save} disabled={!dirty || !text.trim()} busy={busy === "save"}>Save version</Accent>
          </>
        }
      >
        {!shown && !text ? (
          <div className="flex flex-col">
            <EmptyState icon={Pencil}>Nothing written for this type yet.</EmptyState>
            <div className="flex flex-col items-center gap-1 pb-4">
              <Btn onClick={firstDraft}>Write a first draft</Btn>
              <span className="text-xs text-text-muted">from the active template and its {d.type.slides ?? boxes.length} slides</span>
            </div>
          </div>
        ) : (
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} aria-label="Writing" className="w-full resize-y rounded-nested border border-border bg-bg/60 px-4 py-3 text-sm leading-6 outline-none focus:border-text-muted" />
        )}
        {err && <p role="alert" className="text-xs text-danger">{err}</p>}
        {boxes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-muted">Text boxes</span>
            {boxes.map((b) => (
              <button key={b} type="button" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", `@${b}`)} onClick={() => setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${b}`)} className="rounded-full bg-pill-bg px-2.5 py-0.5 text-xs font-medium text-text-muted hover:text-text-primary">@{b}</button>
            ))}
          </div>
        )}
        {d.writing.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <span className="text-xs font-medium text-text-muted">Versions</span>
            {d.writing.map((v) => (
              <button key={v.id} type="button" onClick={() => { setShown(v); setText(v.body); }} className={cn("flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-sm hover:bg-card-raised", shown?.id === v.id && "bg-card-raised")}>
                <b className="tnum">Version {v.version}</b>
                <span className="text-xs text-text-muted tnum">{shortDate(v.createdAt)}</span>
                {v.createdBy && <span className="truncate text-xs text-text-muted">{v.createdBy}</span>}
                <span className="ml-auto">{v.active && <Pill tone="ok">Active</Pill>}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card title="Conversation" className="max-lg:order-first">
        <div className="flex min-h-40 flex-col gap-3 text-sm">
          {chat.length === 0 && !shown && (
            <div className="flex flex-col items-start gap-2 text-text-muted">
              <p>Nothing written for this type yet.</p>
              <Btn onClick={firstDraft}>Write a first draft</Btn>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <p className="self-end rounded-nested bg-card-raised px-3 py-2">{m.q}</p>
              <p className="rounded-nested border border-border px-3 py-2 text-text-muted">{m.a}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder={shown ? "What should change?" : "What should this type sound like?"} aria-label="Ask about the writing" className="w-full rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-sm outline-none placeholder:text-text-muted" />
          <Btn onClick={ask}>Send</Btn>
        </div>
        <p className="text-[11px] text-text-muted">The writing conversation on Claude is not connected yet; this proposes and never saves.</p>
      </Card>
    </div>
  );
}

function RowsTab({ d, slug, goLive }: { d: Payload; slug: string; goLive: () => void }) {
  const [page, setPage] = useState(0);
  const { data } = useJson<{ rows: Payload["rows"] }>(page > 0 ? `/api/carousel-generator/types/${encodeURIComponent(slug)}?rowsPage=${page}` : null);
  const rows = page > 0 && data ? data.rows : d.rows;
  const [openRow, setOpenRow] = useState<LaneRow | null>(null);
  if (!d.type.laneTable) {
    return (
      <Card className="flex-1">
        <EmptyState icon={Table}>No rows until this type goes live</EmptyState>
        <div className="flex justify-center pb-2"><Btn onClick={goLive}>Go Live</Btn></div>
      </Card>
    );
  }
  const tone = (s: string) => (s === "Posted" || s === "Ready" || s === "In pool" ? "ok" : s === "Rejected" ? "danger" : s === "Hold" ? "warn" : "neutral");
  return (
    <Card className="flex-1">
      <div className="flex items-center gap-3">
        <p className="text-sm tnum">{rows.total} rows<span className="text-text-muted"> · {rows.ready} ready to post</span></p>
        <span className="ml-auto rounded-full bg-pill-bg px-2.5 py-0.5 font-mono text-[11px] text-text-muted">{d.type.laneTable}</span>
      </div>
      {rows.rows.length === 0 ? (
        <EmptyState icon={Table}>No rows yet</EmptyState>
      ) : (
        <div className="flex flex-col">
          <div className="hidden grid-cols-[40px_80px_minmax(0,1fr)_160px_90px_90px_110px_20px] gap-3 border-b border-border pb-2 text-xs text-text-muted md:grid"><span /><span>Id</span><span>Caption</span><span>Music</span><span>Posting date</span><span>Profile</span><span>Status</span><span /></div>
          {rows.rows.map((r) => (
            <button key={r.id} type="button" onClick={() => setOpenRow(r)} className="grid grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 border-b border-border py-2 text-left last:border-b-0 hover:bg-card-raised md:grid-cols-[40px_80px_minmax(0,1fr)_160px_90px_90px_110px_20px]">
              <span className="aspect-[4/5] w-10 rounded-[6px] border border-border bg-card-sunken bg-cover bg-center" style={r.thumbnail ? { backgroundImage: `url("${r.thumbnail}")` } : undefined} aria-hidden />
              <span className="flex min-w-0 flex-col gap-0.5 md:contents">
                <span className="flex items-center gap-2 text-sm md:contents"><span className="tnum">{r.id}</span><span className="md:hidden"><Pill tone={tone(r.status)}>{r.status}</Pill></span></span>
                <span className="truncate text-sm text-text-muted">{r.caption ?? "—"}</span>
                <span className="hidden truncate text-sm text-text-muted md:inline">{r.music ?? "—"}</span>
                <span className="hidden text-sm tnum md:inline">{r.postingDate ? shortDate(r.postingDate) : "—"}</span>
                <span className="hidden text-sm tnum md:inline">{r.profile ?? "—"}</span>
                <span className="hidden md:inline"><Pill tone={tone(r.status)}>{r.status}</Pill></span>
              </span>
              <ChevronRight className="size-3.5 text-text-muted" />
            </button>
          ))}
          <div className="flex items-center justify-between pt-3 text-xs text-text-muted tnum">
            <span>{page * 25 + 1}–{Math.min((page + 1) * 25, rows.total)} of {rows.total}</span>
            <span className="flex gap-2"><Btn disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Btn><Btn disabled={(page + 1) * 25 >= rows.total} onClick={() => setPage((p) => p + 1)}>Next</Btn></span>
          </div>
        </div>
      )}
      {openRow && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div aria-hidden onClick={() => setOpenRow(null)} className="absolute inset-0 bg-[var(--scrim)]" />
          <aside role="dialog" aria-label={`Row ${openRow.id}`} className="relative flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-card p-5">
            <div className="flex items-center justify-between"><h3 className="text-base font-semibold tnum">{openRow.id}</h3><Btn onClick={() => setOpenRow(null)}>Close</Btn></div>
            <Pill tone={tone(openRow.status)}>{openRow.status}</Pill>
            {openRow.blocker && <p className="text-sm text-text-muted">{openRow.blocker}</p>}
            {openRow.thumbnail && <span className="block aspect-[4/5] w-40 rounded-[10px] border border-border bg-cover bg-center" style={{ backgroundImage: `url("${openRow.thumbnail}")` }} aria-hidden />}
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-text-muted">Caption</dt><dd className="whitespace-pre-wrap">{openRow.caption ?? "—"}</dd>
              <dt className="text-text-muted">Music</dt><dd>{openRow.music ?? "—"}</dd>
              <dt className="text-text-muted">Posting date</dt><dd className="tnum">{openRow.postingDate ? shortDate(openRow.postingDate) : "—"}</dd>
              <dt className="text-text-muted">Profile</dt><dd className="tnum">{openRow.profile ?? "—"}</dd>
              <dt className="text-text-muted">Created</dt><dd className="tnum">{shortDate(openRow.createdAt)}</dd>
            </dl>
            <p className="text-xs text-text-muted">A row is repaired on the screen that owns it: the content calendar for its date and profile, the batch for its copy.</p>
          </aside>
        </div>
      )}
    </Card>
  );
}

function GoLive({ d }: { d: Payload }) {
  const t = d.type;
  const wired = Boolean(t.laneTable);
  const items: { label: string; ok: boolean; note?: string }[] = [
    { label: "Template saved", ok: Boolean(t.templateId), note: t.templateVersion ? `Version ${t.templateVersion}` : undefined },
    { label: "Writing saved", ok: Boolean(t.writing), note: t.writing ? `Version ${t.writing.version}` : "Needs writing" },
    { label: "Image library chosen", ok: Boolean(t.libraryId), note: t.libraryName ?? undefined },
    { label: "A batch approved", ok: d.batches.some((b) => b.counts.approved > 0), note: d.batches.some((b) => b.counts.approved > 0) ? undefined : "Generate, render and approve one first" },
    { label: "Lane table", ok: wired, note: t.laneTable ?? "Made by Wire" },
    { label: "Registry row and character allow-list", ok: wired },
    { label: "Scheduler pool and unified posts", ok: wired },
    { label: "Smart Scheduler media map", ok: wired, note: wired ? undefined : "Read from n8n after wiring" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card title={wired ? "Live" : "Checklist"}>
        <ul className="flex flex-col">
          {items.map((i) => (
            <li key={i.label} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
              <span className={cn("flex size-5 items-center justify-center rounded-full border", i.ok ? "border-ok bg-ok text-bg" : "border-border text-transparent")}><Check className="size-3" /></span>
              <span className="text-sm">{i.label}</span>
              {i.note && <span className="ml-auto text-xs text-text-muted">{i.note}</span>}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Wire">
        <p className="text-sm text-text-muted">{wired ? "This type is wired and posting through the scheduler." : "Wiring creates the lane table, the registry row, the scheduler entries and the cadence rebalance in one reviewed database step. That step is not built yet; the checklist above is read from real checks and shows what is ready."}</p>
        <Btn disabled title="The lane-creation database function is not built yet">{wired ? "Wired" : "Wire"}</Btn>
      </Card>
    </div>
  );
}

export function TypePage({ slug, initial, tab }: { slug: string; initial: Payload | null; tab?: string }) {
  const search = useSearchParams();
  const { data, error, reload } = useJson<Payload>(`/api/carousel-generator/types/${encodeURIComponent(slug)}`, { every: 15_000, initial });
  // The address is the tab (D13: the query string is something a person
  // reads). It is written with the browser's own history so the switch is
  // instant: a router navigation re-ran the whole server page and the tab
  // lagged behind the press by seconds (found by the QA agent, 2026-09-26).
  const fromUrl = search.get("tab") ?? tab;
  const cur: Tab = TABS.find((t) => t.id === fromUrl)?.id ?? "overview";
  const go = (t: Tab) => {
    window.history.replaceState(null, "", `/carousel-generator/types/${slug}${t === "overview" ? "" : `?tab=${t}`}`);
  };
  const d = data ?? initial;
  if (!d) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Carousel type</h1>
        <LoadError message={error ?? "The carousel type could not be loaded"} onRetry={reload} />
      </div>
    );
  }
  const t = d.type;
  const running = t.runningBatch;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <PageHead
        back={{ href: "/carousel-generator/types", label: "Carousel types" }}
        title={t.name}
        meta={
          <>
            {typeMeta(t)}
            {t.lifecycle === "not_wired" && <Pill>Not wired</Pill>}
            {t.lifecycle === "retired" && <Pill>Retired</Pill>}
            {!t.writing && <Pill>Needs writing</Pill>}
          </>
        }
        actions={
          t.lifecycle === "retired" ? null : running ? (
            <Btn href={`/carousel-generator/batches/${running.id}`}>Open running batch</Btn>
          ) : (
            <Accent href={`/carousel-generator/generate?type=${encodeURIComponent(t.id)}`}>Generate</Accent>
          )
        }
      />
      <div role="tablist" aria-label="Carousel type" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={cur === x.id} onClick={() => go(x.id)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm", cur === x.id ? "border-text-primary font-medium" : "border-transparent text-text-muted hover:text-text-primary")}>{x.label}</button>
        ))}
      </div>
      {error && <LoadError message={error} onRetry={reload} />}
      {cur === "overview" && <Overview d={d} onChange={reload} />}
      {cur === "writing" && <Writing key={d.writing.map((w) => w.id).join(",")} d={d} onChange={reload} />}
      {cur === "rows" && <RowsTab d={d} slug={slug} goLive={() => go("go-live")} />}
      {cur === "go-live" && <GoLive d={d} />}
    </div>
  );
}

