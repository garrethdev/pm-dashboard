"use client";

/**
 * Generate (D2, approved 2026-09-14; D12's Auto switch; D13's Writing stop).
 * How many (up to 50), Image library with Change and Undo, Writing read-only
 * with its version, Note, the template's per-batch fields, Auto mode, then
 * Generate — unavailable until everything required is filled, with the
 * reason beside it. On a phone Generate sits in a bottom bar.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Accent, Btn, PageHead, Pill, post, shortDate, typeMeta } from "@/components/carousel/kit";
import { ChevronRight, Images, Minus, Plus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { CarouselType, Library } from "@/server/carousel/repo/types";
import type { CopyRole } from "@/server/carousel/services/writer";

function Row({ label, htmlFor, optional, children, danger }: { label: string; htmlFor?: string; optional?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn("grid gap-3 border-b border-border px-5 py-5 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-6 sm:px-6", danger && "shadow-[inset_3px_0_0_var(--danger)]")}>
      <label htmlFor={htmlFor} className="text-sm">
        {label}
        {optional && <span className="ml-2 text-xs text-text-muted">Optional</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function GenerateForm({ type, libraries, perBatchRoles }: { type: CarouselType; libraries: Library[]; perBatchRoles: CopyRole[] }) {
  const router = useRouter();
  const [count, setCount] = useState("50");
  const [note, setNote] = useState("");
  const [auto, setAuto] = useState(type.lastAuto);
  const [libraryId, setLibraryId] = useState<string | null>(type.libraryId);
  const [prevLibrary, setPrevLibrary] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [dirOpen, setDirOpen] = useState(false);
  const [perBatch, setPerBatch] = useState<Record<string, { mode: "fixed" | "written"; text: string }>>(
    Object.fromEntries(perBatchRoles.map((r) => [r.role, { mode: "fixed", text: r.fixed ?? "" }])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Number(count);
  const validCount = /^\d+$/.test(count) && n >= 1 && n <= 50;
  const library = libraries.find((l) => l.id === libraryId) ?? null;
  const retired = type.lifecycle === "retired";
  const needsWriting = !type.writing;
  const reason = retired
    ? "This type is retired"
    : type.runningBatch
      ? "A batch is already running"
      : needsWriting
        ? "Needs writing"
        : !library
          ? "Choose an image library"
          : !type.templateId
            ? "This type has no template"
            : !validCount
              ? "Enter a whole number from 1 to 50"
              : null;

  const submit = async () => {
    if (reason) return;
    setBusy(true);
    setError(null);
    const perBatchText: Record<string, string> = {};
    for (const [role, v] of Object.entries(perBatch)) perBatchText[role] = v.mode === "fixed" ? (perBatchRoles.find((r) => r.role === role)?.fixed ?? v.text) : v.text;
    const res = await post<{ id: string }>("/api/carousel-generator/batches", { typeId: type.id, requested: n, auto, note, perBatchText, libraryId });
    if (res.error || !res.data) {
      setError(res.error ?? "Could not start the batch");
      setBusy(false);
      return;
    }
    router.push(`/carousel-generator/batches/${res.data.id}`);
  };

  const step = (d: number) => setCount(String(Math.min(50, Math.max(1, (Number(count) || 1) + d))));

  const generate = (
    <Accent onClick={submit} disabled={Boolean(reason)} busy={busy}>
      Generate
    </Accent>
  );

  return (
    <div className="flex flex-col gap-6 pb-24 sm:pb-0">
      <PageHead back={{ href: "/carousel-generator/types", label: "Carousel types" }} title={type.name} meta={typeMeta(type)} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="overflow-hidden rounded-card border border-border bg-card shadow-card"
      >
        <Row label="How many" htmlFor="count">
          <div className="inline-flex items-stretch overflow-hidden rounded-nested border border-border bg-bg/60">
            <button type="button" aria-label="Decrease how many" disabled={validCount && n <= 1} onClick={() => step(-1)} className="flex w-9 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30">
              <Minus className="size-3" />
            </button>
            <input id="count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))} aria-invalid={!validCount} className="w-16 border-x border-border bg-transparent text-center text-sm outline-none tnum" />
            <button type="button" aria-label="Increase how many" disabled={validCount && n >= 50} onClick={() => step(1)} className="flex w-9 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30">
              <Plus className="size-3" />
            </button>
          </div>
          {!validCount && <p role="alert" className="mt-2 text-xs text-danger">Enter a whole number from 1 to 50.</p>}
        </Row>

        <Row label="Image library" danger={!library}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {library ? (
                <>
                  <span className="size-11 shrink-0 overflow-hidden rounded-[10px] border border-border bg-card-sunken bg-cover bg-center" style={library.cover ? { backgroundImage: `url("${library.cover}")` } : undefined} aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{library.name}</span>
                    <span className="text-xs text-text-muted tnum">{library.count} images · {library.sets.filter((s) => !s.parentId).length} sets</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-border text-text-muted" aria-hidden><Images className="size-[18px]" /></span>
                  <span className="text-sm text-text-muted">No library</span>
                </>
              )}
              <span className="ml-auto flex items-center gap-2">
                {prevLibrary !== null && prevLibrary !== libraryId && (
                  <button type="button" className="text-xs text-text-muted hover:text-text-primary" onClick={() => { setLibraryId(prevLibrary); setPrevLibrary(null); }}>Undo</button>
                )}
                <Btn onClick={() => setPicking((p) => !p)}>{library ? "Change" : "Choose"}</Btn>
              </span>
            </div>
            {picking && (
              <div role="listbox" aria-label="Image libraries" className="flex flex-col gap-1 rounded-nested border border-border glass-overlay p-2">
                {libraries.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="option"
                    aria-selected={l.id === libraryId}
                    onClick={() => { setPrevLibrary(libraryId); setLibraryId(l.id); setPicking(false); }}
                    className={cn("flex items-center gap-3 rounded-[12px] px-2 py-1.5 text-left text-sm hover:bg-card", l.id === libraryId && "bg-card")}
                  >
                    <span className="size-8 shrink-0 rounded-[8px] border border-border bg-card-sunken bg-cover bg-center" style={l.cover ? { backgroundImage: `url("${l.cover}")` } : undefined} aria-hidden />
                    <span className="truncate">{l.name}</span>
                    <span className="ml-auto text-xs text-text-muted tnum">{l.count}</span>
                  </button>
                ))}
              </div>
            )}
            {library && (
              <div className="flex flex-wrap gap-1.5">
                {library.sets.filter((s) => !s.parentId).map((s) => (
                  <Pill key={s.id} className="tnum">{s.name} <b className="ml-1 text-text-primary">{s.count}</b></Pill>
                ))}
              </div>
            )}
          </div>
        </Row>

        <Row label="Writing" danger={needsWriting}>
          <div className="flex flex-col gap-2 rounded-nested border border-border bg-card-sunken p-3">
            <div className="flex items-center gap-2">
              {type.writing ? (
                <>
                  <Pill className="tnum">Version {type.writing.version}</Pill>
                  <span className="text-xs text-text-muted tnum">{shortDate(type.writing.createdAt)}</span>
                </>
              ) : (
                <span className="text-sm text-danger">No writing</span>
              )}
              <Link href={`/carousel-generator/types/${type.slug}?tab=writing` as never} className="ml-auto inline-flex items-center gap-0.5 text-xs text-text-muted hover:text-text-primary">
                {type.writing ? "Edit" : "Write it"} <ChevronRight className="size-3" />
              </Link>
            </div>
            {type.writing && (
              <>
                <p className={cn("text-sm text-text-muted whitespace-pre-wrap", !dirOpen && "line-clamp-3")}>{type.writing.body}</p>
                {type.writing.body.length > 200 && (
                  <button type="button" onClick={() => setDirOpen((o) => !o)} className="w-fit text-xs text-text-muted hover:text-text-primary">{dirOpen ? "Less" : "More"}</button>
                )}
              </>
            )}
          </div>
        </Row>

        <Row label="Note" htmlFor="note" optional>
          <input id="note" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="anything specific about this batch?" className="w-full rounded-nested border border-border bg-transparent px-3.5 py-2 text-sm outline-none placeholder:text-text-muted focus:border-text-muted" />
        </Row>

        {perBatchRoles.length > 0 && (
          <div className="border-b border-border bg-card-sunken px-5 py-2 text-[11px] font-medium tracking-[0.12em] text-text-muted uppercase sm:px-6">Template</div>
        )}
        {perBatchRoles.map((r) => {
          const v = perBatch[r.role];
          const label = r.role.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
          return (
            <Row key={r.role} label={label}>
              <div className="flex flex-col gap-2">
                {r.fixed ? (
                  <div role="radiogroup" aria-label={label} className="inline-flex w-fit rounded-full bg-card-raised p-0.5">
                    {(["fixed", "written"] as const).map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={v.mode === m} onClick={() => setPerBatch((p) => ({ ...p, [r.role]: { ...p[r.role], mode: m } }))} className={cn("rounded-full px-3 py-1 text-xs font-medium", v.mode === m ? "bg-accent text-bg" : "text-text-muted hover:text-text-primary")}>
                        {m === "fixed" ? "Fixed" : "Written"}
                      </button>
                    ))}
                  </div>
                ) : null}
                {v.mode === "fixed" && r.fixed ? (
                  <div className="rounded-nested border border-border bg-card-sunken px-3.5 py-2 text-sm text-text-muted">{r.fixed}</div>
                ) : (
                  <input value={v.text} onChange={(e) => setPerBatch((p) => ({ ...p, [r.role]: { ...p[r.role], text: e.target.value } }))} maxLength={r.max_chars ?? 200} placeholder={label} className="w-full rounded-nested border border-border bg-transparent px-3.5 py-2 text-sm outline-none placeholder:text-text-muted focus:border-text-muted" />
                )}
              </div>
            </Row>
          );
        })}

        <Row label="Auto mode">
          <button type="button" role="switch" aria-checked={auto} aria-label="Auto mode" onClick={() => setAuto((a) => !a)} className={cn("relative h-5 w-9 rounded-full transition-colors", auto ? "bg-accent" : "bg-card-raised")}>
            <span className={cn("absolute top-0.5 size-4 rounded-full bg-text-primary transition-[left]", auto ? "left-[18px] bg-card" : "left-0.5")} />
          </button>
        </Row>

        <div className="hidden items-center justify-between gap-4 px-6 py-4 sm:flex">
          <span role="status" aria-live="polite" className={cn("text-xs", error ? "text-danger" : "text-text-muted")}>{error ?? reason ?? ""}</span>
          {generate}
        </div>
      </form>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-border bg-bg/80 px-4 py-3 backdrop-blur-xl sm:hidden">
        <span className={cn("min-w-0 truncate text-xs", error ? "text-danger" : "text-text-muted")}>{error ?? reason ?? ""}</span>
        {generate}
      </div>
    </div>
  );
}
