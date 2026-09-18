"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "@/components/ui/icons";
import { Card, DashCard } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { StatusPill } from "@/components/ui/pill";
import {
  DEVICE_INPUT,
  DeviceFields,
  errorFrom,
  type DeviceFormValues,
} from "@/components/dashboard/device-fields";
import type { Platform } from "@/lib/data/accounts";
import { MAX_ACCOUNTS_PER_DEVICE, proofRefusal } from "@/lib/data/device-rules";
import type { Device, DeviceAccount } from "@/lib/data/devices";
import { cn } from "@/lib/utils";

const PLATFORM_SHORT: Record<Platform, string> = {
  tiktok: "TT",
  instagram: "IG",
  facebook: "FB",
};

const QUIET_BUTTON =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card-raised px-3.5 py-2 text-xs font-medium text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-muted";

function toForm(d: Device): DeviceFormValues {
  return {
    name: d.name,
    model: d.model ?? "",
    iosVersion: d.iosVersion ?? "",
    proxy: d.proxy ?? "",
    timezone: d.timezone ?? "",
    notes: d.notes ?? "",
  };
}

function accountName(a: DeviceAccount): string {
  return a.username ? `@${a.username}` : (a.profile ?? `Account ${a.id}`);
}

/** /accounts/20 for "Profile 20"; null for an account with no profile number. */
function accountHref(a: DeviceAccount): string | null {
  const digits = a.profile?.replace(/\D+/g, "");
  return digits ? `/accounts/${digits}` : null;
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent" : "bg-border",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

/**
 * One phone: its details, its proof screenshot and the accounts it carries.
 *
 * Every write goes to the server, which is where the rules live (three accounts
 * at most, none onto a phone that is off). This screen only hides the controls
 * that would be refused, and shows the server's sentence when one is anyway.
 */
export function DeviceDetail({
  device,
  proofUrl,
  assignable,
  initialNotice,
}: {
  device: Device;
  /** Short-lived signed link to the screenshot, when there is one. */
  proofUrl: string | null;
  assignable: DeviceAccount[];
  /** Carried over from "Add phone" when the phone saved but its picture did not. */
  initialNotice?: string | null;
}) {
  const router = useRouter();
  const saved = toForm(device);
  const [values, setValues] = useState<DeviceFormValues>(saved);
  // One busy flag: every action here ends in the same refresh, and two at once
  // would race each other to repaint.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ where: string; message: string } | null>(
    initialNotice ? { where: "proof", message: initialNotice } : null,
  );
  const [picked, setPicked] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = (Object.keys(saved) as (keyof DeviceFormValues)[]).some(
    (k) => values[k].trim() !== saved[k],
  );
  const full = device.accounts.length >= MAX_ACCOUNTS_PER_DEVICE;

  async function run(where: string, request: () => Promise<Response>, fallback: string) {
    if (busy) return false;
    setBusy(where);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) throw new Error(await errorFrom(res, fallback));
      router.refresh();
      return true;
    } catch (err) {
      setError({ where, message: err instanceof Error ? err.message : "Network error" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const patch = (body: unknown) => () =>
    fetch(`/api/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const accountsRequest = (method: "POST" | "DELETE", accountId: number) => () =>
    fetch(`/api/devices/${device.id}/accounts`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

  function uploadProof(file: File) {
    const problem = proofRefusal(file);
    if (problem) {
      setError({ where: "proof", message: problem });
      return;
    }
    const form = new FormData();
    form.append("file", file);
    void run(
      "proof",
      () => fetch(`/api/devices/${device.id}/proof`, { method: "POST", body: form }),
      "The screenshot did not upload",
    );
  }

  const errorLine = (where: string) =>
    error?.where === where && (
      <p className="rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">{error.message}</p>
    );

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={"/devices" as never}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-3.5" /> All phones
      </Link>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 truncate font-display text-2xl leading-[30px] font-bold">
              {device.name}
            </h1>
            <StatusPill tone={device.isActive ? "ok" : "neutral"}>
              {device.isActive ? "Active" : "Off"}
            </StatusPill>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-text-muted">
            In use
            <Switch
              label="In use"
              checked={device.isActive}
              disabled={busy !== null}
              onChange={(v) => void run("active", patch({ isActive: v }), "Saving failed")}
            />
          </label>
        </div>
        {errorLine("active")}
      </Card>

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="flex flex-col gap-3 lg:col-span-3">
          <DashCard
            title="Accounts"
            headerAction={
              <StatusPill tone={full ? "warn" : "gray"} className="tnum">
                {device.accounts.length}/{MAX_ACCOUNTS_PER_DEVICE}
              </StatusPill>
            }
          >
            <div className="flex flex-col gap-3">
              {device.accounts.length === 0 ? (
                <p className="rounded-nested border border-border px-3 py-6 text-center text-sm text-text-muted">
                  No accounts on this phone
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {device.accounts.map((a) => {
                    const href = accountHref(a);
                    return (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-nested border border-border px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <StatusPill tone="gray">{PLATFORM_SHORT[a.platform]}</StatusPill>
                          <div className="min-w-0">
                            {href ? (
                              <Link
                                href={href as never}
                                className="block truncate text-sm font-medium hover:underline"
                              >
                                {accountName(a)}
                              </Link>
                            ) : (
                              <span className="block truncate text-sm font-medium">
                                {accountName(a)}
                              </span>
                            )}
                            <span className="block truncate text-xs text-text-muted">
                              {[a.character, a.profile, !a.isActive ? "retired" : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            void run(
                              "accounts",
                              accountsRequest("DELETE", a.id),
                              "Removing the account failed",
                            )
                          }
                          className={QUIET_BUTTON}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!full && device.isActive && (
                <div className="flex gap-2">
                  <select
                    aria-label="Account to add"
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                    disabled={busy !== null || assignable.length === 0}
                    className={cn(DEVICE_INPUT, "min-w-0 flex-1 appearance-none")}
                  >
                    <option value="">
                      {assignable.length === 0 ? "No accounts left to add" : "Choose an account"}
                    </option>
                    {assignable.map((a) => (
                      <option key={a.id} value={a.id}>
                        {[PLATFORM_SHORT[a.platform], accountName(a), a.character, a.profile]
                          .filter(Boolean)
                          .join(" · ")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy !== null || picked === ""}
                    onClick={async () => {
                      const ok = await run(
                        "accounts",
                        accountsRequest("POST", Number(picked)),
                        "Adding the account failed",
                      );
                      if (ok) setPicked("");
                    }}
                    className={QUIET_BUTTON}
                  >
                    {busy === "accounts" && <Loader2 className="size-3.5 animate-spin" />}
                    Add
                  </button>
                </div>
              )}
              {errorLine("accounts")}
            </div>
          </DashCard>

          <DashCard title="Details">
            <div className="flex flex-col gap-4">
              <DeviceFields values={values} onChange={setValues} disabled={busy !== null} />
              {errorLine("details")}
              <div className="flex justify-end gap-2">
                {dirty && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setValues(saved)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
                  >
                    Undo
                  </button>
                )}
                <CtaButton
                  disabled={busy !== null || !dirty || values.name.trim() === ""}
                  onClick={() => void run("details", patch(values), "Saving the phone failed")}
                >
                  {busy === "details" && <Loader2 className="size-3.5 animate-spin" />}
                  Save
                </CtaButton>
              </div>
            </div>
          </DashCard>
        </div>

        <DashCard
          title="whoer.net proof"
          className="lg:col-span-2"
          headerAction={
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => fileInput.current?.click()}
              className={QUIET_BUTTON}
            >
              {busy === "proof" && <Loader2 className="size-3.5 animate-spin" />}
              {device.proofPath ? "Replace" : "Add screenshot"}
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Cleared so picking the same file again after a failure still fires.
                e.target.value = "";
                if (file) uploadProof(file);
              }}
            />
            {errorLine("proof")}
            {proofUrl ? (
              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage link; not optimisable */}
                <img
                  src={proofUrl}
                  alt={`${device.name} whoer.net screenshot`}
                  className="mx-auto max-h-[70vh] w-auto max-w-full rounded-nested border border-border"
                />
              </a>
            ) : (
              <p className="rounded-nested border border-border px-3 py-10 text-center text-sm text-text-muted">
                {device.proofPath ? "The screenshot could not be loaded" : "No proof yet"}
              </p>
            )}
          </div>
        </DashCard>
      </div>
    </div>
  );
}
