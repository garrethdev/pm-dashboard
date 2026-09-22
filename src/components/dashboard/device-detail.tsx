"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Hand,
  ListChecks,
  Loader2,
  Robot,
  Users,
} from "@/components/ui/icons";
import { Card, DashCard } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DEVICE_INPUT,
  DeviceFields,
  errorFrom,
  type DeviceFormValues,
} from "@/components/dashboard/device-fields";
import type { Platform } from "@/lib/data/accounts";
import { MAX_ACCOUNTS_PER_DEVICE, proofRefusal } from "@/lib/data/device-rules";
import type { Device, DeviceAccount } from "@/lib/data/devices";
import {
  accountProgress,
  deviceProgress,
  todoAnchor,
  type DevicePagePlaceholder,
  type TodoAccount,
  type WarmupSession,
} from "@/lib/data/todo-placeholder";
import { healthTone } from "@/lib/health";
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
 * Who warms an account up, as a mark you read rather than a switch you press.
 *
 * P4 settled that the setting is changed on the Accounts page and only SHOWN
 * here, "because that is how a phone's day is read". Same hand and same robot
 * as the switch there and as the to-do list's badge, so one shape means one
 * thing wherever it appears.
 */
function WarmupModeMark({ automated }: { automated: boolean }) {
  const label = automated ? "Automated warmup" : "Manual warmup";
  return (
    <Tooltip label={label} className="shrink-0">
      <span
        role="img"
        aria-label={label}
        className="flex size-5 items-center justify-center rounded-full bg-pill-bg text-text-muted"
      >
        {automated ? <Robot className="size-3.5" /> : <Hand className="size-3.5" />}
      </span>
    </Tooltip>
  );
}

/** One line of the Accounts block, from a real row or from the invented phone. */
type AccountLine = {
  key: string;
  /** The row to remove; null on the invented phone, which has nothing to remove. */
  account: DeviceAccount | null;
  platform: Platform;
  name: string;
  /** "Character 2 · Profile 21". */
  who: string;
  health: string | null;
  automated: boolean | null;
};

function realLines(device: Device): AccountLine[] {
  return device.accounts.map((a) => ({
    key: String(a.id),
    account: a,
    platform: a.platform,
    name: accountName(a),
    who:
      [a.character, a.profile, !a.isActive ? "retired" : null].filter(Boolean).join(" · ") || "—",
    health: null,
    automated: null,
  }));
}

function demoLines(demo: DevicePagePlaceholder): AccountLine[] {
  return demo.today.accounts.map((a, i) => {
    const meta = demo.accounts.find((m) => m.id === a.id);
    return {
      key: a.id,
      account: null,
      platform: a.platform,
      name: a.handle,
      who: `${a.character} · Profile ${21 + i}`,
      health: meta?.health ?? null,
      automated: meta?.automated ?? null,
    };
  });
}

/**
 * One phone — design ticket P5.
 *
 * The page is ordered by how often a thing is looked at, which is Garreth's
 * instruction for this ticket: the phone's DAILY WORK first — today's list,
 * the accounts on it, the warmups it has run — and the things set once when
 * the phone was registered (its details, its whoer.net proof and the in-use
 * switch) below them. Before this the page opened on a form.
 *
 *  - TODAY ON THIS PHONE is a high-level, READ-ONLY overview of this phone's
 *    day: where each account stands and which items are done or still owed.
 *    Nothing in it is pressable. Garreth, 2026-09-22: it was drawing the
 *    To-do page's own block, ticks and all, which made this page a second
 *    place to do the same work — "the ability to mark an activity done should
 *    only be in the dashboard and the to do page". The phone's name is the
 *    page's title, so the block carries its count and nothing else.
 *  - ACCOUNTS keeps the list it had and adds what a phone's day is read from:
 *    health, and who warms the account up (P4's hand and robot, shown not
 *    switched).
 *  - WARMUP HISTORY is the phone's recent sessions, a person's and the
 *    script's told apart by the same two marks.
 *  - LIVE VIEW sits where the in-use switch used to, at the top right. It is
 *    INERT until PF-14 builds the page it opens on the MacBook Air; it is a
 *    link out, never something embedded here.
 *
 * Every write still goes to the server, which is where the rules live (three
 * accounts at most, none onto a phone that is off). This screen only hides the
 * controls that would be refused, and shows the server's sentence when one is
 * anyway.
 *
 * `demo` is the invented phone from `todo-placeholder.ts`, drawn only when
 * `?demo=` is on the URL (P5's states: `full`, `new`, `off`). Without it the
 * page reads the database exactly as it always has, and the three new blocks
 * show their empty state, because the data behind them is PF-04, PF-05 and
 * PF-07 and none of it exists yet. Nothing saves on the invented phone.
 */
export function DeviceDetail({
  device,
  proofUrl,
  assignable,
  initialNotice,
  demo = null,
}: {
  device: Device;
  /** Short-lived signed link to the screenshot, when there is one. */
  proofUrl: string | null;
  assignable: DeviceAccount[];
  /** Carried over from "Add phone" when the phone saved but its picture did not. */
  initialNotice?: string | null;
  /** The invented phone for the P5 review, or null for a real one. */
  demo?: DevicePagePlaceholder | null;
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

  // The invented phone is not in the database, so nothing on it can save.
  const inert = demo !== null;
  const locked = busy !== null || inert;

  // Read-only (Garreth, 2026-09-22). This block SHOWS the phone's day; it is
  // not a second place to work it. Marking anything done happens on the
  // dashboard and the To-do page only, so this reads the day straight through
  // rather than through the To-do board's tick state.
  const today = demo?.today ?? null;
  const progress = today ? deviceProgress(today) : null;

  const lines = demo ? demoLines(demo) : realLines(device);
  const warmups: WarmupSession[] = demo?.warmups ?? [];

  const dirty = (Object.keys(saved) as (keyof DeviceFormValues)[]).some(
    (k) => values[k].trim() !== saved[k],
  );
  const full = lines.length >= MAX_ACCOUNTS_PER_DEVICE;

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
    <>
      <div className="flex flex-col gap-3">
        <Link
          href={"/devices" as never}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="size-3.5" /> All phones
        </Link>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 truncate font-display text-2xl leading-[30px] font-bold">
              {device.name}
            </h1>
            <StatusPill tone={device.isActive ? "ok" : "neutral"}>
              {device.isActive ? "Active" : "Off"}
            </StatusPill>
          </div>
          {/* PF-14's page on the MacBook Air. Drawn in its place and inert
              until that page exists; it opens there, it is not embedded. */}
          <button type="button" disabled className={QUIET_BUTTON}>
            Live view <ExternalLink className="size-3.5" />
          </button>
        </Card>

        {/* ---- the phone's daily work ---- */}

        <DashCard
          title="Today on this phone"
          // The phone block sizes its own contents against this card, the way
          // it does in the To-do page's Grid.
          className="@container"
          actions={
            progress && progress.total > 0 ? (
              <span className="tnum text-xs text-text-muted">
                {progress.done} of {progress.total}
              </span>
            ) : undefined
          }
        >
          {today && today.accounts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {today.accounts.map((account) => (
                <AccountToday key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <EmptyState icon={ListChecks}>Nothing due</EmptyState>
          )}
        </DashCard>

        <div className="grid gap-3 lg:grid-cols-2">
          <DashCard
            title="Accounts"
            headerAction={
              <StatusPill tone={full ? "warn" : "gray"} className="tnum">
                {lines.length}/{MAX_ACCOUNTS_PER_DEVICE}
              </StatusPill>
            }
          >
            <div className="flex flex-col gap-3">
              {lines.length === 0 ? (
                <EmptyState icon={Users} compact>
                  No accounts on this phone
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {lines.map((line) => (
                    <AccountRow
                      key={line.key}
                      line={line}
                      disabled={locked}
                      onRemove={
                        line.account
                          ? () =>
                              void run(
                                "accounts",
                                accountsRequest("DELETE", line.account!.id),
                                "Removing the account failed",
                              )
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}

              {!full && device.isActive && (
                <div className="flex gap-2">
                  <select
                    aria-label="Account to add"
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                    disabled={locked || assignable.length === 0}
                    className={cn(DEVICE_INPUT, "min-w-0 flex-1 appearance-none")}
                  >
                    <option value="">
                      {assignable.length === 0 ? "No accounts left to add" : "Choose an account"}
                    </option>
                    {/* Never listed on the invented phone: these are live
                        handles, and a design screen shows none. */}
                    {!inert &&
                      assignable.map((a) => (
                        <option key={a.id} value={a.id}>
                          {[PLATFORM_SHORT[a.platform], accountName(a), a.character, a.profile]
                            .filter(Boolean)
                            .join(" · ")}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={locked || picked === ""}
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

          <DashCard title="Warmup history">
            {warmups.length === 0 ? (
              <EmptyState icon={ListChecks} compact>
                No warmups yet
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {warmups.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-2.5 rounded-nested border border-border px-3 py-2.5"
                  >
                    <WarmupModeMark automated={w.automated} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{w.handle}</span>
                      <span className="tnum truncate text-xs text-text-muted">
                        {w.when} · {w.label}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-xs text-text-muted">{w.minutes} min</span>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>
        </div>

        {/* ---- set once when the phone was registered ---- */}

        <div className="grid gap-3 lg:grid-cols-5">
          <DashCard
            title="Details"
            className="lg:col-span-3"
            actions={
              <label className="flex items-center gap-2.5 text-sm text-text-muted">
                In use
                <Switch
                  label="In use"
                  checked={device.isActive}
                  disabled={locked}
                  onChange={(v) => void run("active", patch({ isActive: v }), "Saving failed")}
                />
              </label>
            }
          >
            <div className="flex flex-col gap-4">
              {errorLine("active")}
              <DeviceFields values={values} onChange={setValues} disabled={locked} />
              {errorLine("details")}
              <div className="flex justify-end gap-2">
                {dirty && (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setValues(saved)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
                  >
                    Undo
                  </button>
                )}
                <CtaButton
                  disabled={locked || !dirty || values.name.trim() === ""}
                  onClick={() => void run("details", patch(values), "Saving the phone failed")}
                >
                  {busy === "details" && <Loader2 className="size-3.5 animate-spin" />}
                  Save
                </CtaButton>
              </div>
            </div>
          </DashCard>

          <DashCard
            title="whoer.net proof"
            className="lg:col-span-2"
            headerAction={
              <button
                type="button"
                disabled={locked}
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

    </>
  );
}

/**
 * One account on this phone. The list it had, plus the two things a phone's
 * day is read from (P5): health, and who warms it up.
 *
 * The health verdict is the app's own StatusPill on the health ladder rather
 * than a bare coloured dot — the same mark and the same tone as the Accounts
 * page — so the word is there to read and nothing new had to be invented.
 */
/**
 * One account's day on this phone, to READ (Garreth, 2026-09-22).
 *
 * The device page was drawing the To-do page's own block, ticks and all, which
 * made it a second place to do the same work. It now shows where the account
 * stands and nothing more: the two counts, and each item as done or still
 * owed. Nothing here is pressable. The work is done on the dashboard and the
 * To-do page, which stay the one place a thing can be marked off.
 */
/**
 * One account's standing for the day — one line, nothing more.
 *
 * Garreth, 2026-09-22, round three: "we should simplify this. Remove the
 * detailed list." The phone's page says HOW EACH ACCOUNT STANDS; the work
 * itself, and every detail of it, lives on the To-do page. So the day is two
 * pills and no list.
 *
 * A finished half of the day is **cyan** and sits still. An unfinished one is
 * a **grey pill you can press**, and it takes you to that account on the To-do
 * page — the one place the work is actually done. That is the whole
 * navigation of this block: see it here, do it there.
 */
function AccountToday({ account }: { account: TodoAccount }) {
  const progress = accountProgress(account);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-nested bg-card-raised/50 px-3 py-3">
      <PlatformIcon platform={account.platform} />
      <span className="min-w-0 truncate text-sm font-medium">{account.handle}</span>
      <span className="shrink-0 text-xs text-text-muted">{account.character}</span>
      <span className="flex shrink-0 items-center gap-1.5 @lg:ml-auto">
        <CountPill label="Posts" of={progress.posts} accountId={account.id} />
        <CountPill label="Warmup" of={progress.warmups} accountId={account.id} />
      </span>
    </div>
  );
}

const PILL_BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

/**
 * "Posts done" in cyan, or "Posts 1 of 2" as a press that goes to the work.
 *
 * The link lands on the account's own group on the To-do page, so a phone with
 * three accounts does not drop you at the top of the list to find it yourself.
 */
function CountPill({
  label,
  of,
  accountId,
}: {
  label: string;
  of: { done: number; total: number };
  accountId: string;
}) {
  if (of.total === 0) return null;

  if (of.done === of.total) {
    return <StatusPill tone="accent">{label} done</StatusPill>;
  }

  return (
    <Link
      href={{ pathname: "/todo", hash: todoAnchor(accountId) } as never}
      className={cn(
        PILL_BASE,
        "bg-pill-bg text-text-muted transition-colors hover:text-text-primary",
      )}
    >
      {label} {of.done} of {of.total}
    </Link>
  );
}

function AccountRow({
  line,
  disabled,
  onRemove,
}: {
  line: AccountLine;
  disabled: boolean;
  onRemove?: () => void;
}) {
  const href = line.account ? accountHref(line.account) : null;

  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-nested border border-border px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <PlatformIcon platform={line.platform} />
          {href ? (
            <Link
              href={href as never}
              className="min-w-0 truncate text-sm font-medium hover:underline"
            >
              {line.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium">{line.name}</span>
          )}
          {line.health && <StatusPill tone={healthTone(line.health)}>{line.health}</StatusPill>}
          {line.automated !== null && <WarmupModeMark automated={line.automated} />}
        </span>
        <span className="block truncate text-xs text-text-muted">{line.who}</span>
      </div>
      <button
        type="button"
        disabled={disabled || !onRemove}
        onClick={onRemove}
        className={QUIET_BUTTON}
      >
        Remove
      </button>
    </li>
  );
}
