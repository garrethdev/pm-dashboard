"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Hand,
  Loader2,
  Lock,
  Pencil,
  Robot,
  X,
} from "@/components/ui/icons";
import { CtaButton } from "@/components/ui/cta-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { DEVICE_INPUT, errorFrom } from "@/components/dashboard/device-fields";
import { CadenceFields, useCadenceForm } from "@/components/dashboard/cadence-form";
import type { PhoneOption } from "@/components/dashboard/accounts-by-phone";
import type { AccountRow, WarmupMode } from "@/lib/data/accounts";
import type { ContentTypeOption } from "@/lib/data/scheduler-overrides";
import { PLATFORM_LABEL } from "@/lib/platform";
import { cn } from "@/lib/utils";

/**
 * Edit account — design ticket P14 (Garreth, 2026-09-23), approved and built
 * the same day.
 *
 * The ⋯ at the end of an account row opens this or Retire. It gathers what
 * used to sit on the row as separate controls — the warmup switch, the
 * Posting pill — and adds what had no home: the handle, the character, the
 * phone the account is on, and the account's own phone number (numbers belong
 * to accounts, not phones: Garreth, 2026-09-23).
 *
 * What is shown but cannot be changed, and why:
 *  - PROFILE NAME. Every n8n workflow finds an account by it, and so does
 *    content assigned to it; renaming one would quietly cut the account off
 *    from its own posts.
 *  - PLATFORM. An Instagram account does not become a TikTok one.
 *  - PROXY. It belongs to the phone and every account on it shares it, so it
 *    is changed on the phone's page, which the link here opens.
 *
 * Posting opens as the plain Active / Paused switch; the cadence is one press
 * further, behind Edit cadence (Garreth, 2026-09-23), because most accounts
 * run on the defaults and should not face six fields to pause one. The
 * cadence is the Posting window's own form (`cadence-form.tsx`), not a copy.
 *
 * SAVING. Each part goes to the route that already owns it — details to
 * `/api/accounts/edit`, warmup to `warmup-mode`, posting to `pause`, the
 * cadence to `scheduler-override` — and only the parts that changed are sent.
 * They go one after another, and the first that fails stops the rest and says
 * which part it was and that the ones before it were saved, rather than
 * pretending the whole window failed or succeeded.
 *
 * PHYSICAL ONLY. Cloud keeps its own row and its Posting window, untouched
 * (Garreth, 2026-09-23). With `sample` (the invented accounts of `?demo=1`,
 * which reuse real Profile names) Save only closes.
 */
export function EditAccountModal({
  account,
  phones,
  characters,
  options,
  sample = false,
  onClose,
  onSaved,
}: {
  account: AccountRow;
  phones: PhoneOption[];
  characters: string[];
  /** The content types this account's character may post. */
  options: ContentTypeOption[];
  sample?: boolean;
  onClose: () => void;
  /** Something was written: re-read the page. `close` is false when a later
   *  part failed and the window stays open to say so. */
  onSaved: (close: boolean) => void;
}) {
  const [handle, setHandle] = useState(account.username ?? "");
  const [character, setCharacter] = useState(account.character);
  const [phoneId, setPhoneId] = useState<string>(account.deviceId ? String(account.deviceId) : "");
  const [number, setNumber] = useState(account.phoneNumber ?? "");
  const [paused, setPaused] = useState(account.paused);
  const [warmup, setWarmup] = useState<WarmupMode>(account.warmupMode);
  const [cadenceOpen, setCadenceOpen] = useState(false);
  const cadence = useCadenceForm({
    override: account.override,
    effective: account.effective,
    options,
    paused,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clamped, setClamped] = useState<{
    requested: number;
    effective: number;
    reason: string | null;
  } | null>(null);

  const phone = phones.find((p) => String(p.id) === phoneId) ?? null;
  const characterOptions = characters.includes(character) ? characters : [character, ...characters];

  async function send(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await errorFrom(res, "Saving failed"));
    return (await res.json().catch(() => ({}))) as {
      clamped?: { requested: number; effective: number; reason: string | null } | null;
    };
  }

  async function save() {
    if (sample) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    setClamped(null);

    // Only what changed, each to the route that owns it.
    const details: Record<string, unknown> = {};
    if (handle.trim().replace(/^@+/, "") !== (account.username ?? "")) details.username = handle;
    if (character !== account.character) details.character = character;
    if (number.trim() !== (account.phoneNumber ?? "")) details.phoneNumber = number;
    if (phoneId !== (account.deviceId ? String(account.deviceId) : "")) {
      details.deviceId = phoneId === "" ? null : Number(phoneId);
    }

    const parts: { name: string; run: () => Promise<unknown> }[] = [];
    if (Object.keys(details).length > 0) {
      parts.push({ name: "Details", run: () => send("/api/accounts/edit", { profile: account.profile, ...details }) });
    }
    if (warmup !== account.warmupMode) {
      parts.push({
        name: "Warmup",
        run: () => send("/api/accounts/warmup-mode", { profiles: [account.profile], mode: warmup }),
      });
    }
    if (paused !== account.paused) {
      parts.push({
        name: "Posting",
        run: () => send("/api/accounts/pause", { profile: account.profile, paused }),
      });
    }
    // The cadence is only written when it was opened: a window used to fix a
    // handle must not rewrite the schedule underneath it.
    // Held in an object so the part below can set it and the check after
    // the loop still sees it.
    const result: { clamp: typeof clamped } = { clamp: null };
    if (cadenceOpen && !paused) {
      parts.push({
        name: "Cadence",
        run: async () => {
          const res = await send("/api/accounts/scheduler-override", {
            profile: account.profile,
            ...cadence.payload(),
          });
          result.clamp = res.clamped ?? null;
        },
      });
    }

    const saved: string[] = [];
    for (const part of parts) {
      try {
        await part.run();
        saved.push(part.name);
      } catch (err) {
        const why = (err instanceof Error ? err.message : "Saving failed").replace(/\.\s*$/, "");
        setError(
          saved.length
            ? `${part.name} was not saved: ${why}. ${saved.join(" and ")} ${saved.length === 1 ? "was" : "were"} saved.`
            : `${part.name} was not saved: ${why}.`,
        );
        setBusy(false);
        if (saved.length) onSaved(false);
        return;
      }
    }

    setBusy(false);
    // A clamp is not a failure — the save landed — but closing would hide that
    // the scheduler will use a different number, the Posting window's rule.
    if (result.clamp) {
      setClamped(result.clamp);
      onSaved(false);
      return;
    }
    if (parts.length > 0) onSaved(true);
    else onClose();
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
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Pencil className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Edit account</h2>
              <p className="truncate text-xs text-text-muted">
                {account.profile}
                {account.username ? ` · @${account.username}` : ""}
              </p>
            </div>
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

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6">
          <Section title="Details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Locked label="Profile name" value={account.profile} />
              <Locked label="Platform" value={PLATFORM_LABEL[account.platform]} />
              <Field label="Handle">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  disabled={busy}
                  maxLength={61}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="@handle"
                  className={DEVICE_INPUT}
                />
              </Field>
              <Field label="Character">
                <select
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  disabled={busy}
                  className={cn(DEVICE_INPUT, "appearance-none")}
                >
                  {characterOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Phone">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <select
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  disabled={busy}
                  className={cn(DEVICE_INPUT, "appearance-none")}
                >
                  <option value="">No phone</option>
                  {phones
                    .filter((p) => p.isActive || String(p.id) === phoneId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.model ? `${p.name} · ${p.model}` : p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Phone number">
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  disabled={busy}
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={30}
                  placeholder="+1 (555) 201-7781"
                  className={cn(DEVICE_INPUT, "tnum")}
                />
              </Field>
            </div>
            {/* The proxy is the phone's, so it is read here and changed there. */}
            {phone && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-nested border border-border px-3.5 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-text-muted">Proxy</span>
                  <span className="tnum truncate text-sm">{phone.proxy ?? "—"}</span>
                </div>
                <Link
                  href={`/devices/${phone.id}` as never}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:opacity-80"
                >
                  {phone.name}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </Section>

          <Section title="Posting">
            <label className="flex cursor-pointer items-center justify-between rounded-nested border border-border bg-card-raised/60 px-3.5 py-3.5">
              <span className="flex items-center gap-2.5">
                <span className="text-sm font-medium">Posting</span>
                <StatusPill tone={paused ? "warn" : "ok"}>{paused ? "Paused" : "Active"}</StatusPill>
              </span>
              <Toggle checked={!paused} onChange={(v) => setPaused(!v)} label="Posting" disabled={busy} />
            </label>

            <button
              type="button"
              onClick={() => setCadenceOpen((v) => !v)}
              aria-expanded={cadenceOpen}
              disabled={paused || busy}
              className="mt-2 inline-flex h-10 items-center gap-1.5 self-start rounded-full px-1 text-sm font-medium text-accent transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
            >
              {cadenceOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              Edit cadence
            </button>

            {cadenceOpen && !paused && (
              <div className="-mt-3">
                <CadenceFields
                  form={cadence}
                  options={options}
                  effective={account.effective}
                  paused={paused}
                  busy={busy}
                />
              </div>
            )}
          </Section>

          <Section title="Warmup">
            <FilterPills
              value={warmup}
              onChange={setWarmup}
              options={[
                { value: "manual", label: "Manual", icon: <Hand className="size-3.5" /> },
                { value: "script", label: "Automated", icon: <Robot className="size-3.5" /> },
              ]}
            />
          </Section>

          {error && (
            <p role="alert" className="rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {clamped && (
            <div className="rounded-nested border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs">
              <p className="font-semibold text-warn">
                Saved, but the scheduler will use {clamped.effective}/day, not {clamped.requested}/day.
              </p>
              <p className="mt-1 text-text-muted">
                {clamped.reason ? `${clamped.reason}. ` : ""}Your weekly limits were applied in full. Turn on
                “Ignore automatic throttling” and save again to force {clamped.requested}/day.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            {clamped ? "Close" : "Cancel"}
          </button>
          <CtaButton onClick={save} disabled={busy || (cadenceOpen && cadence.blocked)}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h3 className="mb-2.5 text-xs font-medium tracking-wide text-text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  );
}

/** A value shown for reference, with a lock so it does not read as a box
 *  that has failed to accept typing. */
function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn(DEVICE_INPUT, "flex items-center justify-between gap-2 text-text-muted")}>
        <span className="tnum truncate">{value}</span>
        <Lock className="size-3.5 shrink-0" />
      </span>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className="flex h-11 shrink-0 items-center px-1 disabled:opacity-50"
    >
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-accent" : "bg-border")}>
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
