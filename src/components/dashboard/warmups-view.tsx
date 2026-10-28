"use client";

/**
 * Warmups (Garreth, 2026-10-28): the warmup robot at a glance, so an account
 * whose warmups keep stopping is seen without opening every account page, and
 * a stop can be handed to Claude in one press.
 *
 * Drawn in the Carousel Generator Overview's language at his request (D16):
 * the dot-faded number tiles, two columns of sections, and cards with a ring
 * on the left. Mostly pictures, few words: today's numbers, the accounts that
 * need a look beside the warmups running now, fourteen days of bars beside why
 * they stop, then every account as a strip of squares, one per warmup.
 *
 * Read-only. Every report opens the same diary window as the account page,
 * where Analyze and Copy for Claude live.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, SectionHead, ago } from "@/components/carousel/kit";
import { WarmupDiarySheet } from "@/components/dashboard/warmup-report-log";
import {
  ChatCircleDots,
  CheckCircle2,
  ChevronRight,
  Compass,
  Hourglass,
  Power,
  Robot,
  ShieldAlert,
  SmartphoneOff,
  Sparkle,
  UserSwitch,
} from "@/components/ui/icons";
import { FilterPills } from "@/components/ui/filter-pills";
import { PlatformIcon } from "@/components/ui/platform-icon";
import {
  STOP_LABEL,
  type NeedsLook,
  type OverviewAccount,
  type OverviewReport,
  type StopKind,
  type WarmupOverview,
} from "@/lib/data/warmup-overview-rules";
import { cn } from "@/lib/utils";

const STOP_ICON: Record<StopKind, React.ComponentType<{ className?: string }>> = {
  phone: SmartphoneOff,
  wrong_account: UserSwitch,
  warning: ShieldAlert,
  lost: Compass,
  popup: ChatCircleDots,
  feed: Hourglass,
  shut_down: Power,
  other: Robot,
};

/** How often the page reads again while it is on screen. */
const REFRESH_MS = 60_000;

/** "@maya_journey8"; a Facebook page number gives way to the profile's name. */
function handle(a: OverviewAccount): string {
  if (a.username && !/^\d+$/.test(a.username)) return `@${a.username}`;
  return a.displayName ?? a.profile ?? (a.username ? `@${a.username}` : `Account ${a.id}`);
}

/** How many "needs a look" cards show before "Show all". */
const LOOK_FIRST = 6;

const ALL_PHONES = "__all";
const NO_PHONE = "No phone";

/**
 * The phone filter's pills (Garreth, 2026-10-28): All, then each phone with
 * an account that needs a look, by name. No counts: the cards are the count
 * (his call, the same day). A phone with nothing to look at gets no pill; a
 * filter that can only empty the list is noise.
 */
function phoneOptions(looks: NeedsLook[]): { value: string; label: string }[] {
  const phones = [...new Set(looks.map((n) => n.account.deviceName ?? NO_PHONE))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
  return [{ value: ALL_PHONES, label: "All" }, ...phones.map((p) => ({ value: p, label: p }))];
}

function Tile({ label, value, tone, ring }: { label: string; value: string; tone?: "danger" | "accent"; ring?: number | null }) {
  return (
    <div className="dot-fade flex flex-col justify-between gap-2.5 overflow-hidden rounded-nested border border-border bg-card-raised px-5 py-4 text-text-muted">
      <span className="relative z-10 text-xs">{label}</span>
      <span className="relative z-10 flex items-end justify-between gap-3">
        <span
          className={cn(
            "text-[40px] leading-none font-semibold tracking-[-0.02em] tnum",
            tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-text-primary",
          )}
        >
          {value}
        </span>
        {ring != null && <RateRing value={ring} />}
      </span>
    </div>
  );
}

/** The finish rate as a ring: green for what finished, red for the rest. */
function RateRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="4" className="stroke-danger/70" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="4"
        strokeDasharray={`${c * value} ${c}`}
        className="stroke-ok"
      />
    </svg>
  );
}

/** The reason's icon in a red ring: the Overview's task ring, for a stop. */
function StopRing({ kind }: { kind: StopKind }) {
  const Icon = STOP_ICON[kind];
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden className="absolute inset-0">
        <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="3" className="text-danger/35" />
      </svg>
      <Icon className="size-[18px] text-danger" />
    </span>
  );
}

const CHEVRON = Array.from({ length: 9 }, (_, i) => (Math.floor(i / 3) === 1 ? 0 : 90) + (i % 3) * 90);

/** The pixel grid the Overview gives a batch at work. */
function Working() {
  return (
    <span aria-hidden className="grid size-11 shrink-0 grid-cols-3 content-center justify-center gap-0.5">
      {CHEVRON.map((d, i) => (
        <span
          key={i}
          className="size-1.5 animate-[px16on_650ms_ease-in-out_infinite] rounded-[1px] bg-accent motion-reduce:animate-none motion-reduce:opacity-60"
          style={{ animationDelay: `${d}ms`, opacity: 0.12 }}
        />
      ))}
    </span>
  );
}

const cardClass =
  "relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-[20px] border border-border bg-card px-4 py-3.5 shadow-card sm:px-[18px] sm:py-3";

function NeedsLookCard({ n, onOpen, onAnalyze }: { n: NeedsLook; onOpen: () => void; onAnalyze: () => void }) {
  return (
    <div className={cn(cardClass, "transition-colors hover:border-text-muted/40 hover:bg-card-raised")}>
      <StopRing kind={n.kind} />
      {/* The whole card opens the diary; Analyze sits above that press. */}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-col gap-0.5 text-left after:absolute after:inset-0 after:rounded-[20px]">
        <span className="flex min-w-0 items-center gap-1.5">
          <PlatformIcon platform={n.account.platform} />
          <span className="truncate text-[15px] font-semibold leading-[22px] tracking-[-0.01em]">{handle(n.account)}</span>
          {n.stopsThisWeek > 1 && (
            <span className="tnum shrink-0 rounded-full bg-danger/15 px-1.5 text-[11px] font-semibold leading-[18px] text-danger">
              {n.stopsThisWeek}×
            </span>
          )}
        </span>
        <span className="truncate text-[13px] leading-[18px] text-text-muted">
          {STOP_LABEL[n.kind]} · {n.account.deviceName ?? "No phone"} · {ago(n.latest.endedAt)}
        </span>
        {n.latest.reviewSummary && (
          <span className="mt-1 flex min-w-0 items-start gap-1.5 text-[13px] leading-[18px]">
            <Sparkle className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span className="line-clamp-2">{n.latest.reviewSummary}</span>
          </span>
        )}
      </button>
      <span className="relative z-10">
        {n.latest.reviewSummary ? (
          <ChevronRight className="size-3.5 text-text-muted" />
        ) : (
          // Outlined, not the accent: a dozen cyan buttons down one column is
          // the accent spent on every row, and then it marks nothing.
          <Btn line onClick={onAnalyze}>
            <Sparkle className="size-3.5 text-accent" /> Analyze
          </Btn>
        )}
      </span>
    </div>
  );
}

function Empty({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <p className="flex min-h-[116px] flex-1 items-center justify-center gap-2 rounded-[20px] border border-dashed border-border bg-card-sunken p-4 text-[13px] text-text-muted">
      {ok && <CheckCircle2 className="size-4 text-ok" />}
      {children}
    </p>
  );
}

function shortDay(day: string): string {
  return String(Number(day.slice(8)));
}

function weekday(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
}

/** Fourteen days of warmups as stacked bars: finished below, stopped above. */
function DayBars({ days }: { days: WarmupOverview["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.finished + d.stopped));
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-[20px] border border-border bg-card p-4 shadow-card sm:px-[18px]">
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-ok" /> Finished</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-danger" /> Stopped</span>
      </div>
      <div className="grid h-40 flex-1 items-end gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const total = d.finished + d.stopped;
          return (
            <div
              key={d.day}
              title={`${d.day}: ${d.finished} finished, ${d.stopped} stopped`}
              className="flex h-full flex-col justify-end"
            >
              {total === 0 ? (
                <i className="block h-1 rounded-full bg-card-raised" />
              ) : (
                <div className="flex flex-col overflow-hidden rounded-[6px]" style={{ height: `${(total / max) * 100}%` }}>
                  <i className="block bg-danger" style={{ flexGrow: d.stopped }} />
                  <i className="block bg-ok" style={{ flexGrow: d.finished }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid gap-1.5 text-center text-[11px] text-text-muted tnum sm:gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d, i) => (
          <span key={d.day} className={cn(i === days.length - 1 && "font-semibold text-text-primary")}>
            <span className="block">{weekday(d.day)}</span>
            {shortDay(d.day)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Reasons({ reasons }: { reasons: WarmupOverview["reasons"] }) {
  const max = Math.max(1, ...reasons.map((r) => r.count));
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 rounded-[20px] border border-border bg-card p-4 shadow-card sm:px-[18px]">
      {reasons.map((r) => {
        const Icon = STOP_ICON[r.kind];
        return (
          <div key={r.kind} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5">
            <Icon className="size-4 text-text-muted" />
            <span className="truncate text-[13px]">{STOP_LABEL[r.kind]}</span>
            <span className="tnum text-[13px] font-semibold">{r.count}</span>
            <span className="col-span-2 col-start-2 h-1.5 overflow-hidden rounded-full bg-card-raised">
              <i className="block h-full rounded-full bg-danger" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Every account the robot works, a square per warmup, two a day. */
function Strips({
  strips,
  days,
  onOpen,
}: {
  strips: WarmupOverview["strips"];
  days: WarmupOverview["days"];
  onOpen: (r: OverviewReport) => void;
}) {
  const cols = `repeat(${days.length}, minmax(14px, 1fr))`;
  return (
    <div className="overflow-x-auto rounded-[20px] border border-border bg-card shadow-card">
      <div className="min-w-[640px] p-4 sm:px-[18px]">
        <div className="grid grid-cols-[minmax(150px,220px)_minmax(0,1fr)_56px] items-end gap-x-4 pb-2 text-[11px] text-text-muted">
          <span />
          <span className="grid gap-1" style={{ gridTemplateColumns: cols }}>
            {days.map((d, i) => (
              <span key={d.day} className={cn("text-center tnum", i === days.length - 1 && "font-semibold text-text-primary")}>
                {shortDay(d.day)}
              </span>
            ))}
          </span>
          <span />
        </div>
        {strips.map((s) => (
          <div key={s.account.id} className="grid grid-cols-[minmax(150px,220px)_minmax(0,1fr)_56px] items-center gap-x-4 border-t border-border py-2">
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <PlatformIcon platform={s.account.platform} />
                {s.account.profile ? (
                  <Link
                    href={`/accounts/${encodeURIComponent(s.account.profile)}` as never}
                    className="truncate text-[13px] font-medium underline decoration-transparent underline-offset-4 transition-colors hover:decoration-text-muted"
                  >
                    {handle(s.account)}
                  </Link>
                ) : (
                  <span className="truncate text-[13px] font-medium">{handle(s.account)}</span>
                )}
              </span>
              <span className="truncate pl-5 text-[11px] text-text-muted">{s.account.deviceName ?? "No phone"}</span>
            </span>
            <span className="grid gap-1" style={{ gridTemplateColumns: cols }}>
              {days.map((d) => (
                <span key={d.day} className="flex flex-col gap-1">
                  {s.cells
                    .filter((c) => c.day === d.day)
                    .map((c) => {
                      const r = c.report;
                      const cls = cn(
                        "block h-3.5 w-full rounded-[4px]",
                        c.running
                          ? "animate-pulse bg-accent motion-reduce:animate-none"
                          : r?.outcome === "finished"
                            ? "bg-ok/80"
                            : r?.outcome === "stopped"
                              ? "bg-danger"
                              : "bg-card-raised",
                      );
                      return r ? (
                        <button
                          key={c.sessionNo}
                          type="button"
                          onClick={() => onOpen(r)}
                          title={`Warmup ${c.sessionNo}, ${d.day}: ${r.outcome === "finished" ? "finished" : (r.note ?? "stopped")}`}
                          aria-label={`Open warmup ${c.sessionNo} of ${d.day} for ${handle(s.account)}`}
                          className={cn(cls, "transition-transform hover:scale-110 focus-visible:scale-110")}
                        />
                      ) : (
                        <span key={c.sessionNo} className={cls} />
                      );
                    })}
                </span>
              ))}
            </span>
            <span className="text-right text-[13px] tnum">
              {s.stopped > 0 ? (
                <span className="font-semibold text-danger">{s.stopped}</span>
              ) : (
                <span className="text-text-muted">0</span>
              )}
              <span className="text-text-muted"> / {s.finished + s.stopped}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WarmupsView({ data }: { data: WarmupOverview }) {
  const router = useRouter();
  const [open, setOpen] = useState<{ report: OverviewReport; analyze: boolean } | null>(null);
  const [allLooks, setAllLooks] = useState(false);
  const [phone, setPhone] = useState(ALL_PHONES);

  // Running warmups and fresh stops arrive on their own; read again every
  // minute while the page is in front of someone, and not while a diary is
  // open, which would have it re-read under the reader's eyes.
  useEffect(() => {
    if (open) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [open, router]);

  const { today } = data;
  const rate = today.finishRate;
  const phones = phoneOptions(data.needsLook);
  // A phone that has since been cleared (the page reads itself every minute)
  // falls back to All rather than leaving an empty list behind no pill.
  const phoneShown = phones.some((o) => o.value === phone) ? phone : ALL_PHONES;
  const looks =
    phoneShown === ALL_PHONES
      ? data.needsLook
      : data.needsLook.filter((n) => (n.account.deviceName ?? NO_PHONE) === phoneShown);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Warmups</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Finished today" value={String(today.finished)} />
        <Tile label="Stopped today" value={String(today.stopped)} tone={today.stopped > 0 ? "danger" : undefined} />
        <Tile label="Running now" value={String(today.running)} tone={today.running > 0 ? "accent" : undefined} />
        <Tile label="Finish rate · 7 days" value={rate == null ? "–" : `${Math.round(rate * 100)}%`} ring={rate} />
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-w-0 flex-col gap-2.5">
          {/* SectionHead's row, with the phone filter beside the title (Garreth,
              2026-10-28). Below `sm:` the pills wrap onto a row of their own,
              since a phone is too narrow for both. Shown only when the list
              spans more than one phone. */}
          <div className="flex min-h-[30px] flex-wrap items-center gap-x-3 gap-y-2 px-0.5">
            <h2 className="text-sm font-semibold tracking-[-0.01em]">Needs a look</h2>
            {data.needsLook.length > 0 && (
              <span className="-ml-1 text-xs text-text-muted tnum">{data.needsLook.length}</span>
            )}
            {phones.length > 2 && (
              <FilterPills
                inline
                options={phones}
                value={phoneShown}
                onChange={setPhone}
                className="order-last basis-full sm:order-none sm:basis-auto"
              />
            )}
            {looks.length > LOOK_FIRST && (
              <button
                type="button"
                onClick={() => setAllLooks((v) => !v)}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                {allLooks ? "Show fewer" : `Show all ${looks.length}`}
              </button>
            )}
          </div>
          {looks.length ? (
            <div className="flex flex-1 flex-col gap-2.5">
              {(allLooks ? looks : looks.slice(0, LOOK_FIRST)).map((n) => (
                <NeedsLookCard
                  key={n.account.id}
                  n={n}
                  onOpen={() => setOpen({ report: n.latest, analyze: false })}
                  onAnalyze={() => setOpen({ report: n.latest, analyze: true })}
                />
              ))}
            </div>
          ) : (
            <Empty ok>All clear</Empty>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-2.5">
          <SectionHead title="Running now" note={data.running.length ? String(data.running.length) : undefined} />
          {data.running.length ? (
            <div className="flex flex-1 flex-col gap-2.5">
              {data.running.map((r) => (
                <div key={`${r.accountId}-${r.sessionNo}`} className={cardClass}>
                  <Working />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <PlatformIcon platform={r.account.platform} />
                      <span className="truncate text-[15px] font-semibold leading-[22px]">{handle(r.account)}</span>
                    </span>
                    <span className="truncate text-[13px] text-text-muted">
                      Warmup {r.sessionNo} · {r.account.deviceName ?? "No phone"}
                    </span>
                  </span>
                  <span className="text-xs whitespace-nowrap text-text-muted tnum">{ago(r.startedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Nothing running</Empty>
          )}
        </section>
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <SectionHead title="Last 14 days" />
          <DayBars days={data.days} />
        </section>
        <section className="flex min-w-0 flex-col gap-2.5">
          <SectionHead title="Why they stop" note="7 days" />
          {data.reasons.length ? <Reasons reasons={data.reasons} /> : <Empty ok>No stops</Empty>}
        </section>
      </div>

      <section className="flex min-w-0 flex-col gap-2.5">
        <SectionHead title="Accounts" note={String(data.strips.length)} />
        {data.strips.length ? (
          <Strips strips={data.strips} days={data.days} onOpen={(r) => setOpen({ report: r, analyze: false })} />
        ) : (
          <Empty>No account is set to Automated</Empty>
        )}
      </section>

      {open && (
        <WarmupDiarySheet
          key={open.report.id}
          report={open.report}
          analyzeOnOpen={open.analyze}
          onClose={() => setOpen(null)}
          onReviewed={() => router.refresh()}
        />
      )}
    </div>
  );
}
