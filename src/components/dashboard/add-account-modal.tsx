"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cloud, Loader2, Smartphone, UserPlus, X } from "@/components/ui/icons";
import { CtaButton } from "@/components/ui/cta-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { DEVICE_INPUT, errorFrom } from "@/components/dashboard/device-fields";
import type { PhoneOption } from "@/components/dashboard/accounts-by-phone";
import { normaliseProfile, normaliseUsername } from "@/lib/data/account-rules";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/platform";
import { deliveryModeOfFleet, type Fleet } from "@/lib/fleet";
import { cn } from "@/lib/utils";

/**
 * Add an account by hand — PF-21.
 *
 * The same bottom sheet as Add phone, for the same reason: it is filled in
 * standing over a phone, so the fields sit above the keyboard and the Save row
 * stays pinned.
 *
 * The **Profile name** is the field this form exists for. Garreth's decision
 * of 2026-09-22 is that an account made from scratch on a real iPhone still
 * gets a "Profile N" name even though it will never touch Geelark, because
 * that name is what ties the account to its posts, its health verdict, its
 * analytics and its calendar. It is typed, not assigned, so the one thing the
 * form must never do is accept a name that is already in use — the server
 * checks, the database's unique index checks again, and what comes back is
 * shown against the field.
 *
 * Everything else on the form is a column the provisioning workflow used to
 * leave blank for somebody to fill in by hand in the database afterwards.
 *
 * A new account is **paused** unless it is switched the other way here. An
 * account that is live the second it is written is picked up by the next
 * planning run, and a brand-new account has not been warmed yet.
 */
export function AddAccountModal({
  characters,
  phones,
  fleet,
  suggestedProfile,
  onClose,
  onCreated,
}: {
  /** The characters that are switched on, in order. */
  characters: string[];
  /** Registered phones. `held` decides which ones still have room. */
  phones: PhoneOption[];
  /** Which fleet is being looked at; the form starts on it. */
  fleet: Fleet;
  /** The lowest free Profile number, as the field's placeholder. */
  suggestedProfile: string;
  onClose: () => void;
  /** `deviceError` is set when the account saved but its phone had just filled up. */
  onCreated: (profile: string, deviceError: string | null) => void;
}) {
  const [profile, setProfile] = useState("");
  const [username, setUsername] = useState("");
  const [character, setCharacter] = useState(characters[0] ?? "");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [mode, setMode] = useState<Fleet>(fleet);
  const [deviceId, setDeviceId] = useState("");
  // The browser's own idea of today, which is what the person means by it.
  const [createdOn, setCreatedOn] = useState(() => localToday());
  const [paused, setPaused] = useState(true);
  // The account's own number (P14: numbers belong to accounts, not phones).
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The message sits under eight fields, so on a phone a refusal lands below
  // the fold and the sheet looks as though the press did nothing.
  const errorLine = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorLine.current?.scrollIntoView({ block: "nearest" });
  }, [error]);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  // Every phone that is switched on. It used to be only phones under three
  // accounts; nothing caps a phone now (Garreth, 2026-09-22).
  const switchedOn = useMemo(() => phones.filter((p) => p.isActive), [phones]);

  const cleanProfile = normaliseProfile(profile);
  const cleanUsername = normaliseUsername(username);
  // Only when the text would be stored differently from the way it was typed,
  // so the name that ties everything together is never changed silently.
  const restated =
    cleanProfile && cleanProfile !== profile.trim() ? `Saves as ${cleanProfile}` : null;

  const ready =
    !!cleanProfile && !!cleanUsername && character !== "" && createdOn !== "" && !busy;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: cleanProfile,
          username: cleanUsername,
          character,
          platform,
          deliveryMode: deliveryModeOfFleet(mode),
          deviceId: mode === "physical" && deviceId !== "" ? Number(deviceId) : null,
          createdOn,
          phoneNumber: mode === "physical" ? phoneNumber : null,
          paused,
        }),
      });
      if (!res.ok) throw new Error(await errorFrom(res, "Saving the account failed"));
      const saved = (await res.json()) as { profile: string; deviceError: string | null };
      if (alive.current) onCreated(saved.profile, saved.deviceError);
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
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
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <UserPlus className="size-5" />
            </span>
            <h2 className="text-base font-semibold">Add account</h2>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex size-9 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Profile name" className="sm:col-span-2">
              <input
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                disabled={busy}
                maxLength={20}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                placeholder={suggestedProfile}
                className={cn(DEVICE_INPUT, "tnum")}
              />
              {restated && <span className="text-xs text-text-muted">{restated}</span>}
            </Field>

            <Field label="Handle">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                disabled={busy || characters.length === 0}
                className={cn(DEVICE_INPUT, "appearance-none")}
              >
                {characters.length === 0 && <option value="">No characters</option>}
                {characters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Group label="Platform" className="sm:col-span-2">
              <FilterPills
                value={platform}
                onChange={setPlatform}
                options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABEL[p] }))}
              />
            </Group>

            <Group label="Fleet" className="sm:col-span-2">
              <FilterPills
                value={mode}
                onChange={(next) => {
                  setMode(next);
                  // A Cloud account has no phone, so a phone chosen before the
                  // switch was flipped is let go rather than saved unseen.
                  if (next === "cloud") setDeviceId("");
                }}
                options={[
                  { value: "cloud", label: "Cloud", icon: <Cloud className="size-3.5" /> },
                  {
                    value: "physical",
                    label: "Physical",
                    icon: <Smartphone className="size-3.5" />,
                  },
                ]}
              />
            </Group>

            {mode === "physical" && (
              <Field label="Phone">
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  disabled={busy || switchedOn.length === 0}
                  className={cn(DEVICE_INPUT, "appearance-none")}
                >
                  <option value="">{switchedOn.length === 0 ? "No phone switched on" : "Not yet"}</option>
                  {switchedOn.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.model ? `${p.name} · ${p.model}` : p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Made on" className={mode === "physical" ? undefined : "sm:col-span-2"}>
              <input
                type="date"
                value={createdOn}
                onChange={(e) => setCreatedOn(e.target.value)}
                disabled={busy}
                max={localToday()}
                className={cn(DEVICE_INPUT, "tnum")}
              />
            </Field>

            {mode === "physical" && (
              <Field label="Phone number" className="sm:col-span-2">
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={busy}
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={30}
                  placeholder="+1 (555) 201-7781"
                  className={cn(DEVICE_INPUT, "tnum")}
                />
              </Field>
            )}

            <Group label="Posting" className="sm:col-span-2">
              <FilterPills
                value={paused ? "paused" : "live"}
                onChange={(v) => setPaused(v === "paused")}
                options={[
                  { value: "paused", label: "Paused" },
                  { value: "live", label: "Posting" },
                ]}
              />
            </Group>
          </div>

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
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <CtaButton onClick={submit} disabled={!ready}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save account
          </CtaButton>
        </div>
      </div>
    </div>
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

/**
 * The same row for a segmented control. Not a <label>: a label that points at
 * a group of buttons hands a press on its text to whichever button the browser
 * picks, which on Platform would quietly change the choice.
 */
function Group({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Today where the person is, not where the server is. */
function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
