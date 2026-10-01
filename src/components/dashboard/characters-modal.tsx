"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Plus, Users, X } from "@/components/ui/icons";
import { CtaButton } from "@/components/ui/cta-button";
import { DEVICE_INPUT, errorFrom } from "@/components/dashboard/device-fields";
import {
  MAX_POSTS_PER_DAY,
  MAX_POSTS_PER_WEEK,
  parseNewCharacter,
} from "@/lib/data/character-rules";
import type { CharacterSummary } from "@/lib/data/characters";
import { CharacterAvatar, shrinkPhoto, uploadPhoto } from "@/components/dashboard/character-photo";
import { cn } from "@/lib/utils";

/**
 * The Characters sheet — the button left of Add account on the Physical
 * Accounts page (Garreth, 2026-10-01).
 *
 * One sheet with every character on it, Edit on each, and Set up for the next
 * one at the bottom. It lives here because this is the page where an account
 * is given its character.
 *
 * EDIT changes the description always, and the posting amounts ONLY for a
 * character that owns no content types yet. A character that owns some keeps
 * its amounts in Adjust cadence, where its content types' numbers have to add
 * up to its weekly number; one character out of balance stops Adjust cadence
 * saving for every character. Those characters show their numbers and a link.
 *
 * Each character has a PROFILE PHOTO (Garreth, 2026-10-01), chosen in the form
 * and uploaded with Save; see `character-photo.tsx`.
 *
 * Empty posting amounts mean none — no posts at all — on Setup and on Edit
 * alike. There is no content-type step (Garreth, 2026-10-01): a content type
 * belongs to one character and is given to it when it is built.
 */

type View = { kind: "list" } | { kind: "setup" } | { kind: "edit"; name: string };

async function readCharacters(): Promise<{ characters: CharacterSummary[]; next: string }> {
  const res = await fetch("/api/characters", { cache: "no-store" });
  if (!res.ok) throw new Error(await errorFrom(res, "Reading the characters failed"));
  return (await res.json()) as { characters: CharacterSummary[]; next: string };
}

export function CharactersModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  /** Something was saved: the page's own lists need re-reading. */
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [data, setData] = useState<{ characters: CharacterSummary[]; next: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A save that half-worked (the character saved, its photo did not) says so
  // above the list it returns to.
  const [notice, setNotice] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The state is set when the answer ARRIVES, never while an effect runs,
  // the same rule as the To-do list's reads.
  const load = useCallback(
    () =>
      readCharacters().then(
        (body) => {
          if (!alive.current) return;
          setData(body);
          setLoadError(null);
        },
        (err: unknown) => {
          if (alive.current) setLoadError(err instanceof Error ? err.message : "Network error");
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      if (view.kind === "list") onClose();
      else setView({ kind: "list" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy, view.kind]);

  const editing = view.kind === "edit" ? data?.characters.find((c) => c.name === view.name) : undefined;
  const title =
    view.kind === "list" ? "Characters" : view.kind === "setup" ? `Set up ${data?.next ?? ""}` : view.name;

  async function saved(message: string | null = null) {
    await load();
    if (!alive.current) return;
    setNotice(message);
    setView({ kind: "list" });
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-card border border-border glass-overlay sm:max-h-[85vh] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {view.kind === "list" ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Users className="size-5" />
              </span>
            ) : (
              <button
                onClick={() => setView({ kind: "list" })}
                disabled={busy}
                aria-label="Back to the characters"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-raised text-text-muted hover:text-text-primary disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <h2 className="truncate text-base font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        {view.kind === "list" ? (
          <CharacterList
            data={data}
            loadError={loadError}
            notice={notice}
            onEdit={(name) => {
              setNotice(null);
              setView({ kind: "edit", name });
            }}
            onSetup={() => {
              setNotice(null);
              setView({ kind: "setup" });
            }}
          />
        ) : view.kind === "setup" && data ? (
          <CharacterForm
            key="setup"
            name={data.next}
            onBusy={setBusy}
            onCancel={() => setView({ kind: "list" })}
            onSaved={saved}
          />
        ) : editing ? (
          <CharacterForm
            key={editing.name}
            name={editing.name}
            current={editing}
            onBusy={setBusy}
            onCancel={() => setView({ kind: "list" })}
            onSaved={saved}
          />
        ) : null}
      </div>
    </div>
  );
}

function CharacterList({
  data,
  loadError,
  notice,
  onEdit,
  onSetup,
}: {
  data: { characters: CharacterSummary[]; next: string } | null;
  loadError: string | null;
  notice: string | null;
  onEdit: (name: string) => void;
  onSetup: () => void;
}) {
  if (loadError) {
    return <p className="p-5 text-sm text-danger sm:p-6">{loadError}</p>;
  }
  if (!data) {
    return (
      <div className="flex justify-center p-8 text-text-muted">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {notice && (
        <p role="status" className="mx-5 mt-4 rounded-nested bg-pill-yellow/10 px-3 py-2 text-sm text-pill-yellow sm:mx-6">
          {notice}
        </p>
      )}
      <ul className="flex flex-col px-5 sm:px-6">
        {data.characters.map((c) => (
          <li
            key={c.name}
            className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"
          >
            <CharacterAvatar name={c.name} url={c.photoUrl} className="size-10" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{c.name}</span>
              <span className="truncate text-xs text-text-muted">
                {c.contentTypes.length === 0
                  ? "No content types"
                  : `${c.contentTypes.length} content ${c.contentTypes.length === 1 ? "type" : "types"}`}
                {" · "}
                {c.accounts} {c.accounts === 1 ? "account" : "accounts"}
              </span>
            </div>
            <button
              onClick={() => onEdit(c.name)}
              className="inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-card-raised px-3.5 text-xs font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <button
          onClick={onSetup}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border text-sm font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary"
        >
          <Plus className="size-4" />
          Set up {data.next}
        </button>
      </div>
    </div>
  );
}

/** "0" and a missing number both show as an empty field, which reads as none. */
function field(n: number | null | undefined): string {
  return n ? String(n) : "";
}

function CharacterForm({
  name,
  current,
  onBusy,
  onCancel,
  onSaved,
}: {
  name: string;
  /** Absent when setting up a new character. */
  current?: CharacterSummary;
  onBusy: (busy: boolean) => void;
  onCancel: () => void;
  /** `message` is said above the list when part of the save did not land. */
  onSaved: (message?: string | null) => Promise<void>;
}) {
  const isNew = !current;
  // Amounts are this sheet's only for a character with no content types.
  const ownsTypes = (current?.contentTypes.length ?? 0) > 0;
  const startNotes = current?.notes ?? "";
  const startDay = field(current?.override.maxPerDay);
  const startWeek = field(current?.override.perWeek);

  const [notes, setNotes] = useState(startNotes);
  const [perDay, setPerDay] = useState(startDay);
  const [perWeek, setPerWeek] = useState(startWeek);
  // The shrunk photo waiting for Save, and a link to show it meanwhile.
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusyState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBusy = (b: boolean) => {
    setBusyState(b);
    onBusy(b);
  };

  const errorLine = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorLine.current?.scrollIntoView({ block: "nearest" });
  }, [error]);

  // The same rules the route reads, so a refusal shows before the press. A
  // character that owns content types has no amounts here to check.
  const check = ownsTypes
    ? ({ ok: true } as const)
    : parseNewCharacter({ character: name, notes, maxPerDay: perDay, perWeek });
  const hint = !check.ok && perDay !== "" && perWeek !== "" ? check.error : null;

  const notesChanged = notes.trim() !== startNotes.trim();
  const amountsChanged = !ownsTypes && (perDay !== startDay || perWeek !== startWeek);
  const ready = check.ok && !busy && !preparing && (isNew || notesChanged || amountsChanged || photo !== null);

  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.preview);
  }, [photo]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const shrunk = await shrinkPhoto(file);
      setPhoto({ file: shrunk, preview: URL.createObjectURL(shrunk) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That photo could not be read.");
    } finally {
      setPreparing(false);
      // So picking the same file again still counts as a pick.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      // The character first: a photo needs a character to belong to.
      const details = isNew
        ? { character: name, notes, maxPerDay: perDay, perWeek }
        : {
            character: name,
            ...(notesChanged ? { notes } : {}),
            ...(amountsChanged ? { maxPerDay: perDay, perWeek } : {}),
          };
      if (isNew || notesChanged || amountsChanged) {
        const res = await fetch("/api/characters", {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details),
        });
        if (!res.ok) throw new Error(await errorFrom(res, "Saving the character failed"));
      }
      if (photo) {
        const res = await uploadPhoto(name, photo.file);
        if (!res.ok) {
          const why = await errorFrom(res, "The photo did not upload");
          // The details saved; only the photo is missing. On an edit the
          // window stays open to try again. A new character exists now, so
          // the sheet returns to the list and says what is missing.
          if (isNew) {
            await onSaved(`${name} is set up, but its photo did not upload: ${why}`);
            return;
          }
          throw new Error(why);
        }
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <CharacterAvatar
            name={name}
            url={photo?.preview ?? current?.photoUrl ?? null}
            className="size-16 text-lg"
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => void pickPhoto(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || preparing}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card-raised px-3.5 text-xs font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary disabled:opacity-40"
          >
            {preparing && <Loader2 className="size-3.5 animate-spin" />}
            {photo || current?.photoPath ? "Change photo" : "Upload photo"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <input value={name} readOnly className={cn(DEVICE_INPUT, "text-text-muted")} />
          </Field>

          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              rows={3}
              maxLength={500}
              placeholder="Who this character is"
              className={cn(DEVICE_INPUT, "h-auto resize-none py-2")}
            />
          </Field>

          {ownsTypes && current ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs text-text-muted">Posting</span>
              <div className="flex items-center justify-between gap-3 rounded-nested border border-border bg-card-raised/50 px-3 py-2.5">
                <span className="tnum text-sm">
                  {current.effective.maxPerDay} a day · {current.effective.perWeek} a week
                </span>
                <Link
                  href="/content-calendar"
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  Adjust cadence
                </Link>
              </div>
            </div>
          ) : (
            <>
              <Field label="Posts a day">
                <input
                  value={perDay}
                  onChange={(e) => setPerDay(e.target.value.replace(/\D/g, ""))}
                  disabled={busy}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder={`None · up to ${MAX_POSTS_PER_DAY}`}
                  className={cn(DEVICE_INPUT, "tnum")}
                />
              </Field>
              <Field label="Posts a week">
                <input
                  value={perWeek}
                  onChange={(e) => setPerWeek(e.target.value.replace(/\D/g, ""))}
                  disabled={busy}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder={`None · up to ${MAX_POSTS_PER_WEEK}`}
                  className={cn(DEVICE_INPUT, "tnum")}
                />
              </Field>
            </>
          )}

          {current && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs text-text-muted">Content types</span>
              {current.contentTypes.length === 0 ? (
                <span className="text-sm text-text-muted">None</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {current.contentTypes.map((t) => (
                    <span
                      key={t.contentType}
                      className="rounded-full bg-pill-bg px-2.5 py-1 text-xs text-text-muted"
                    >
                      {t.displayName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {hint && <p className="text-xs text-pill-yellow">{hint}</p>}

        {error && (
          <p
            ref={errorLine}
            role="alert"
            className="rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          Cancel
        </button>
        <CtaButton onClick={submit} disabled={!ready}>
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          Save character
        </CtaButton>
      </div>
    </>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  );
}
