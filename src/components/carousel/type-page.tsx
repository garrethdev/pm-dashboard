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
import { useMemo, useRef, useState } from "react";
import { Accent, Btn, LoadError, PageHead, Pill, WordsPill, post, shortDate, typeMeta, useJson } from "@/components/carousel/kit";
import { EmptyState } from "@/components/ui/empty-state";
import { Check, ChevronDown, ChevronRight, Pencil, Sparkles, Table } from "@/components/ui/icons";
import { Mentioned, WritingEditor } from "@/components/carousel/writing-editor";
import type { CopyRole } from "@/lib/carousel/template/validate";
import { diffWords } from "@/lib/carousel/writer/diff";
import { cn } from "@/lib/utils";
import type { BatchSummary, CarouselType, LaneRow, TemplateRecord, WritingVersion } from "@/server/carousel/repo/types";
import { batchWords, whileMoving } from "@/server/carousel/status-words";

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

interface ChatMsg {
  id: number;
  who: "me" | "ai";
  text: string;
  /** The full revised direction the conversation proposes, if it proposed one. */
  proposal?: string | null;
  cited?: string[];
  /** Waiting on the writer. */
  pending?: boolean;
  /** The call failed; Retry sends the same thing again. */
  failed?: { message: string | null };
}

/** A proposal, shown as what would change against the active Writing. */
function Proposal({ against, proposal, cited, used, onUse }: { against: string; proposal: string; cited: string[]; used: boolean; onUse: () => void }) {
  const parts = useMemo(() => diffWords(against, proposal), [against, proposal]);
  return (
    <div className="flex flex-col gap-2 rounded-nested border border-border bg-bg/60 p-3">
      <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-[13px] leading-5">
        {parts.map((part, i) =>
          part.kind === "same" ? (
            <span key={i} className="text-text-muted">{part.text}</span>
          ) : part.kind === "added" ? (
            <ins key={i} className="rounded-[3px] bg-accent-soft text-text-primary no-underline">{part.text}</ins>
          ) : (
            <del key={i} className="text-danger/80">{part.text}</del>
          ),
        )}
      </p>
      {cited.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-[11px] text-text-muted">
          <span>Rules used</span>
          {cited.map((k) => <span key={k} className="rounded-full bg-pill-bg px-2 py-px">{k}</span>)}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Btn onClick={onUse} disabled={used}>{used ? "In the editor" : "Put in the editor"}</Btn>
        <span className="text-[11px] text-text-muted">Not saved until you press Save version</span>
      </div>
    </div>
  );
}

function Writing({ d, onChange }: { d: Payload; onChange: () => void }) {
  const active = d.writing.find((w) => w.active) ?? null;
  const [text, setText] = useState(active?.body ?? "");
  const [shown, setShown] = useState<WritingVersion | null>(active);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [q, setQ] = useState("");
  // The rules behind the proposal now in the editor; Save version records them.
  const [rules, setRules] = useState<string[]>([]);
  const [sheet, setSheet] = useState(false);
  const [unread, setUnread] = useState(false);
  const nextId = useRef(1);
  const dirty = text !== (shown?.body ?? "");
  const slideCount = d.type.slides ?? ((d.template?.template?.slides as unknown[] | undefined)?.length ?? 0);
  // Only the boxes the painter draws are text boxes; hidden contract fields are not.
  const roles = useMemo<CopyRole[]>(() => {
    const t = d.template?.template as { slides?: { text?: { role: string }[] }[]; copy_contract?: CopyRole[] } | null | undefined;
    const painted = [...new Set((t?.slides ?? []).flatMap((sl) => (sl.text ?? []).map((x) => x.role)))];
    const byRole = new Map((t?.copy_contract ?? []).map((c) => [c.role, c]));
    return painted.map((role) => byRole.get(role) ?? ({ role, columns: [role], writer: "ai" } as CopyRole));
  }, [d.template]);
  const typeUrl = `/api/carousel-generator/types/${encodeURIComponent(d.type.id)}/writing`;

  const save = async () => {
    setBusy("save");
    setErr(null);
    const res = await post<WritingVersion>(typeUrl, { body: text, citedRuleKeys: rules });
    if (res.error) setErr(res.error);
    else {
      setShown(res.data);
      setRules([]);
      onChange();
    }
    setBusy(null);
  };
  const activate = async (v: WritingVersion) => {
    setBusy(v.id);
    await post(typeUrl, { versionId: v.id }, "PATCH");
    setBusy(null);
    onChange();
  };

  const answer = (id: number, patch: Partial<ChatMsg>) => {
    setChat((c) => c.map((m) => (m.id === id ? { ...m, pending: false, ...patch } : m)));
    setUnread(true);
  };
  /** One exchange with the writer. `message` null is the first-draft offer. */
  const exchange = async (message: string | null, replyId?: number) => {
    const id = replyId ?? nextId.current++;
    const history = chat.filter((m) => !m.pending && !m.failed).map((m) => ({ who: m.who, text: m.proposal ? `${m.text}\n\nProposed direction:\n${m.proposal}` : m.text }));
    setChat((c) => (replyId ? c.map((m) => (m.id === id ? { ...m, pending: true, failed: undefined, text: message === null ? "Writing a first draft" : "Thinking" } : m)) : [...c, ...(message !== null ? [{ id: nextId.current++, who: "me" as const, text: message }] : []), { id, who: "ai" as const, text: message === null ? "Writing a first draft" : "Thinking", pending: true }]));
    setBusy("chat");
    const res = await post<{ reply: string; proposal: string | null; citedRuleKeys: string[] }>(`${typeUrl}/conversation`, message === null ? { mode: "first_draft" } : { message, draft: text, history });
    setBusy(null);
    if (res.error || !res.data) {
      // The offer's own failure leaves the editor empty (D13b).
      answer(id, { text: res.error ?? "The writer could not be reached", failed: { message } });
      return;
    }
    if (message === null && res.data.proposal) {
      // A first draft lands in the editor, unsaved. Save version stays a person's press.
      setText(res.data.proposal);
      setRules(res.data.citedRuleKeys);
      answer(id, { text: `${res.data.reply} It is in the editor, not saved.`, cited: res.data.citedRuleKeys });
      return;
    }
    answer(id, { text: res.data.reply, proposal: res.data.proposal, cited: res.data.citedRuleKeys });
  };
  const ask = () => {
    const message = q.trim();
    if (!message || busy === "chat") return;
    setQ("");
    void exchange(message);
  };
  const use = (m: ChatMsg) => {
    if (!m.proposal) return;
    setText(m.proposal);
    setRules(m.cited ?? []);
    setSheet(false);
  };

  const offer = (
    <div className="flex flex-col items-center gap-1">
      <Btn onClick={() => void exchange(null)} busy={busy === "chat"}>Write a first draft</Btn>
      <span className="text-xs text-text-muted">{slideCount > 0 ? `from the active template and its ${slideCount} slides` : "from the type's name and character; it has no template yet"}</span>
    </div>
  );
  const empty = !shown && !text;
  const conversation = (
    <>
      <div className="flex min-h-40 flex-col gap-3 text-sm">
        {chat.length === 0 && empty && (
          <div className="flex flex-col items-start gap-2 text-text-muted">
            <p>Nothing written for this type yet.</p>
            {offer}
          </div>
        )}
        {chat.length === 0 && !empty && <p className="text-text-muted">Say what should change. The conversation proposes a revised direction; it never saves.</p>}
        {chat.map((m) =>
          m.who === "me" ? (
            <p key={m.id} className="max-w-[90%] self-end whitespace-pre-wrap rounded-nested bg-card-raised px-3 py-2"><Mentioned text={m.text} roles={roles} /></p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <p className={cn("whitespace-pre-wrap rounded-nested border border-border px-3 py-2", m.failed ? "text-danger" : "text-text-muted", m.pending && "animate-pulse")}>
                <Mentioned text={m.text} roles={roles} />
              </p>
              {m.failed && <span><Btn onClick={() => void exchange(m.failed!.message, m.id)} busy={busy === "chat"}>Retry</Btn></span>}
              {m.proposal && <Proposal against={active?.body ?? ""} proposal={m.proposal} cited={m.cited ?? []} used={text === m.proposal} onUse={() => use(m)} />}
            </div>
          ),
        )}
      </div>
      <WritingEditor single label="" value={q} roles={roles} onChange={setQ} onSubmit={ask} disabled={busy === "chat"} placeholder={d.writing.length ? "What should change?" : "What should this type sound like?"} aside={<Btn onClick={ask} disabled={!q.trim()} busy={busy === "chat"}>Send</Btn>} />
    </>
  );

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
        {empty ? (
          <div className="flex flex-col">
            <EmptyState icon={Pencil}>Nothing written for this type yet.</EmptyState>
            <div className="pb-4">{offer}</div>
          </div>
        ) : (
          <WritingEditor value={text} roles={roles} onChange={setText} disabled={busy === "save"} />
        )}
        {err && <p role="alert" className="text-xs text-danger">{err}</p>}
        {rules.length > 0 && dirty && <p className="text-xs text-text-muted">Saving records the {rules.length} {rules.length === 1 ? "rule" : "rules"} this draft drew on.</p>}
        {d.writing.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <span className="text-xs font-medium text-text-muted">Versions</span>
            {d.writing.map((v) => (
              <button key={v.id} type="button" onClick={() => { setShown(v); setText(v.body); setRules([]); }} className={cn("flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-sm hover:bg-card-raised", shown?.id === v.id && "bg-card-raised")}>
                <b className="tnum">Version {v.version}</b>
                <span className="text-xs text-text-muted tnum">{shortDate(v.createdAt)}</span>
                {v.createdBy && <span className="truncate text-xs text-text-muted">{v.createdBy}</span>}
                {v.citedRuleKeys.length > 0 && <span className="text-xs text-text-muted tnum">{v.citedRuleKeys.length} {v.citedRuleKeys.length === 1 ? "rule" : "rules"}</span>}
                <span className="ml-auto">{v.active && <Pill tone="ok">Active</Pill>}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
      {/* Beside the writing on a wide screen; a sheet behind the floating button on a phone. */}
      <Card title="Conversation" className="max-lg:hidden">{conversation}</Card>
      <button type="button" onClick={() => { setSheet(true); setUnread(false); }} aria-label={unread ? "Conversation, something new is waiting" : "Conversation"} className="fixed right-4 bottom-20 z-30 flex size-12 items-center justify-center rounded-full bg-accent text-bg shadow-card lg:hidden">
        <Sparkles className="size-5" />
        {unread && <span aria-hidden className="absolute top-1 right-1 size-2.5 rounded-full bg-danger ring-2 ring-bg" />}
      </button>
      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Conversation" className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden">
          <button type="button" aria-label="Close" onClick={() => setSheet(false)} className="absolute inset-0 bg-black/40" />
          <div className="relative flex max-h-[85dvh] flex-col gap-3 overflow-y-auto rounded-t-[24px] border-t border-border bg-card p-4 pb-8">
            <div className="flex items-center">
              <h2 className="text-sm font-medium text-text-muted">Conversation</h2>
              <button type="button" onClick={() => setSheet(false)} className="ml-auto text-xs text-text-muted hover:text-text-primary">Close</button>
            </div>
            {conversation}
          </div>
        </div>
      )}
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
  const { data, error, reload } = useJson<Payload>(`/api/carousel-generator/types/${encodeURIComponent(slug)}`, { every: (d) => whileMoving(d?.batches), initial });
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

