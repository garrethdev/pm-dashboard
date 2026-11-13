"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus, Users } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import { DEVICE_INPUT } from "@/components/dashboard/device-fields";
import {
  DAILY_FOLLOW_LIMIT,
  creatorProfileUrl,
  type FollowAccount,
  type FollowBoard,
  type FollowCreator,
} from "@/lib/data/follow-creators-rules";
import { cn } from "@/lib/utils";

/**
 * Creators to follow (Garreth, 2026-11-13; the Warmup Upgrade Plan's Y6).
 *
 * Built for the farm phone first: Yurie picks the account she is on in the
 * app, taps a creator's card (the profile link, which iOS opens in the TikTok
 * or Instagram app), follows her there, and taps Mark followed here. On a Mac
 * the card opens the profile in the browser. Each card is her photo, name,
 * handle and follower count, nothing more (Garreth, 2026-11-13).
 *
 * The account picked is remembered on that device, since each phone is held by
 * the same few accounts. "To follow" puts the creators fewest of our accounts
 * already follow first, so the follows spread out. The count beside the picker
 * is the plan's limit of 4 a day, the robot's follows included (Y5); it warns,
 * it does not stop the tick, because the tick records a follow already made.
 */

const PICKED_KEY = "pm-follow-account";
type Tab = "todo" | "done";

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
}

function pairKey(creatorId: number, accountId: string) {
  return `${creatorId}:${accountId}`;
}

export function FollowCreatorsView({ board }: { board: FollowBoard }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string>(board.accounts[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("todo");
  // Ticks pressed but not yet back from the server: true = followed, false = taken back.
  const [pending, setPending] = useState<Map<string, boolean>>(new Map());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  // The account this device used last time. localStorage does not exist on
  // the server, so this can only be read once running in the browser:
  // render the first account, then correct. Read once, on arrival.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PICKED_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && board.accounts.some((a) => a.id === saved)) setAccountId(saved);
    } catch {
      // Private browsing: start on the first account.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fresh server numbers replace the optimistic ones (adjusted during render,
  // not in an effect, so there is no frame showing a tick counted twice).
  const [seenBoard, setSeenBoard] = useState(board);
  if (seenBoard !== board) {
    setSeenBoard(board);
    // A tick still on its way keeps showing until its own refresh lands.
    setPending(new Map([...pending].filter(([k]) => busy.has(k))));
  }

  function pick(id: string) {
    setAccountId(id);
    try {
      localStorage.setItem(PICKED_KEY, id);
    } catch {
      // Not remembered; nothing else depends on it.
    }
  }

  const account = board.accounts.find((a) => a.id === accountId);

  const followed = useMemo(() => {
    const s = new Set(board.follows.map((f) => pairKey(f.creatorId, f.accountId)));
    for (const [k, v] of pending) {
      if (v) s.add(k);
      else s.delete(k);
    }
    return s;
  }, [board.follows, pending]);

  // How many of our accounts follow each creator, for the spread.
  const oursCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const k of followed) {
      const id = Number(k.split(":")[0]);
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [followed]);

  const list = account ? board.creators.filter((c) => c.platform === account.platform) : [];
  const done = list.filter((c) => followed.has(pairKey(c.id, accountId)));
  const todo = list
    .filter((c) => !followed.has(pairKey(c.id, accountId)))
    .sort((a, b) => (oursCount.get(a.id) ?? 0) - (oursCount.get(b.id) ?? 0) || a.followers - b.followers);
  const shown = tab === "todo" ? todo : done;

  // Today's count, with ticks still in flight added in.
  let inFlight = 0;
  for (const [k, v] of pending) if (k.endsWith(`:${accountId}`)) inFlight += v ? 1 : -1;
  const today = account ? account.handToday + account.robotToday + inFlight : 0;
  const tone: PillTone = today > DAILY_FOLLOW_LIMIT ? "danger" : today === DAILY_FOLLOW_LIMIT ? "warn" : "ok";

  async function toggle(c: FollowCreator) {
    if (!account) return;
    const key = pairKey(c.id, account.id);
    const next = !followed.has(key);
    setError("");
    setPending((p) => new Map(p).set(key, next));
    setBusy((b) => new Set(b).add(key));
    try {
      const res = await fetch("/api/follow-creators/follows", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: c.id, accountId: account.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setPending((p) => {
        const m = new Map(p);
        m.delete(key);
        return m;
      });
      setError(`@${c.handle}: ${err instanceof Error ? err.message : "not saved"}`);
    } finally {
      setBusy((b) => {
        const s = new Set(b);
        s.delete(key);
        return s;
      });
    }
  }

  const phones = groupByPhone(board.accounts);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Creators to follow</h1>

      {board.accounts.length === 0 ? (
        <EmptyState icon={Users}>No TikTok or Instagram accounts on a phone</EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Account"
              value={accountId}
              onChange={(e) => pick(e.target.value)}
              className={cn(DEVICE_INPUT, "appearance-none sm:max-w-xs")}
            >
              {phones.map(([phone, accounts]) => (
                <optgroup key={phone} label={phone}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.username} · {a.platform === "tiktok" ? "TikTok" : "Instagram"}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {account && (
              <StatusPill tone={tone} className="w-fit">
                {today} of {DAILY_FOLLOW_LIMIT} today
                {account.robotToday > 0 ? ` · robot ${account.robotToday}` : ""}
              </StatusPill>
            )}
          </div>

          <FilterPills<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "todo", label: `To follow ${todo.length}` },
              { value: "done", label: `Followed ${done.length}` },
            ]}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          {shown.length === 0 ? (
            <EmptyState icon={tab === "todo" ? Check : UserPlus}>
              {tab === "todo" ? "This account follows every creator on the list" : "None followed yet"}
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((c) => {
                const key = pairKey(c.id, accountId);
                const isFollowed = followed.has(key);
                const others = (oursCount.get(c.id) ?? 0) - (isFollowed ? 1 : 0);
                return (
                  <li
                    key={c.id}
                    className="relative flex min-w-0 flex-col items-center gap-3 rounded-card border border-border bg-card p-3 pt-4 text-center shadow-card transition-colors hover:border-accent/60"
                  >
                    {/* The whole card is the profile link (Garreth,
                        2026-11-13): stretched over the card, under the one
                        button, which sits above it. */}
                    <a
                      href={creatorProfileUrl(c.platform, c.handle)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open @${c.handle}`}
                      className="absolute inset-0 rounded-card"
                    />
                    <div className="relative">
                      <CreatorPhoto src={c.photoUrl} handle={c.handle} />
                      <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-border bg-card">
                        <PlatformIcon platform={c.platform} className="size-3.5 text-text-primary" />
                      </span>
                    </div>
                    <div className="flex w-full min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{c.displayName?.trim() || c.handle}</span>
                      <span className="truncate text-xs text-text-muted">@{c.handle}</span>
                      <span className="text-xs text-text-muted">{compact(c.followers)} followers</span>
                      {others > 0 && (
                        <span className="text-xs text-text-muted">
                          {others} of ours follow{others === 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 mt-auto flex w-full flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        disabled={busy.has(key)}
                        aria-pressed={isFollowed}
                        className={cn(
                          "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-60",
                          isFollowed
                            ? "border-ok/50 bg-card-raised text-ok"
                            : "border-border bg-card-raised text-text-muted hover:border-accent/50 hover:text-text-primary",
                        )}
                      >
                        {busy.has(key) ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : isFollowed ? (
                          <Check className="size-3.5" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )}
                        {isFollowed ? "Followed" : "Mark followed"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** Her photo, or her initial when there is none or the link fails. */
function CreatorPhoto({ src, handle }: { src: string | null; handle: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed storage links, not a static asset
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-14 rounded-full border border-border bg-card-raised object-cover"
      />
    );
  }
  return (
    <div className="flex size-14 items-center justify-center rounded-full border border-border bg-card-raised text-xl font-semibold text-text-muted uppercase">
      {handle.replace(/[^a-z0-9]/gi, "").charAt(0) || "?"}
    </div>
  );
}

function groupByPhone(accounts: FollowAccount[]): [string, FollowAccount[]][] {
  const m = new Map<string, FollowAccount[]>();
  for (const a of accounts) m.set(a.deviceName, [...(m.get(a.deviceName) ?? []), a]);
  return [...m];
}
