"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Film,
  ListChecks,
  Smartphone,
} from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { TodoCheck, TodoLogSheet, useTodoBoard } from "@/components/dashboard/todo-board";
import {
  accountProgress,
  deviceProgress,
  isItemFinished,
  linksOwed,
  sortItems,
  todoDayLabel,
  todoEmptyReason,
  type TodoAccount,
  type TodoDay,
  type TodoDevice,
  type TodoItem,
  type TodoState,
} from "@/lib/data/todo-placeholder";
import { cn } from "@/lib/utils";

/**
 * The To-do page — design ticket P2.
 *
 * Grouped by device, then by account, because Yurie works phone by phone: pick
 * one up, do everything on it, put it down (decision 1). Built for a 390px
 * screen held in one hand with a farm phone in the other, so every control is a
 * full tap target and nothing depends on hover.
 *
 * What this page decides, which P2 left open:
 *  - TICKING IS THE ACTION (Garreth, 2026-09-22). An item is ticked off and the
 *    sheet then asks what happened — the link, the minutes, or what went wrong.
 *    Download video and Copy caption stay on the row, at its right-hand end,
 *    because they are what you need BEFORE you go and post.
 *  - A PHONE FOLDS AWAY once it is dealt with, the same as on the dashboard
 *    card, but OPEN BY DEFAULT here: this page is the work itself, where the
 *    card is only a summary of it.
 *  - CARRIED-OVER ITEMS SIT ABOVE TODAY'S inside their account. They are the
 *    oldest work and the only work with a deadline of its own, since an item
 *    stops carrying over after three days.
 *  - LINKS STILL OWED GET A FILTER, not a section of their own, pinned to the
 *    far end of the filter row away from the phone picker.
 *  - A FINISHED ITEM STAYS, struck through, with the time it was finished, for
 *    the rest of the day.
 *  - ANY DAY IS ONE PRESS AWAY: "Today" with an arrow either side.
 *
 * Runs on placeholder data (`todo-placeholder.ts`) until PF-05 and PF-07 exist.
 */
export function TodoView({ state, initialDay }: { state: TodoState; initialDay: TodoDay }) {
  const [day, setDay] = useState<TodoDay>(initialDay);
  /** Empty means every phone. */
  const [picked, setPicked] = useState<string[]>([]);
  const [linksOnly, setLinksOnly] = useState(false);
  const board = useTodoBoard(state, day);

  const all = board.devices;
  const emptyReason = todoEmptyReason(state);
  const owed = linksOwed(all);

  const byDevice = picked.length === 0 ? all : all.filter((d) => picked.includes(d.id));
  const devices = linksOnly ? onlyLinksOwed(byDevice) : byDevice;

  const allFinished = all.length > 0 && all.every((device) => deviceProgress(device).finished);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">To-do</h1>
          <DayStepper day={day} onChange={setDay} />
        </div>

        {all.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <PhonePicker devices={all} picked={picked} onChange={setPicked} />
            {owed > 0 && (
              <button
                onClick={() => setLinksOnly((v) => !v)}
                aria-pressed={linksOnly}
                className={cn(
                  // Pinned to the far end: it is a different question from
                  // which phone you are holding (Garreth, 2026-09-22).
                  "tnum ml-auto inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-medium transition-colors",
                  linksOnly
                    ? "bg-accent-soft text-accent"
                    : "bg-pill-bg text-pill-yellow hover:text-text-primary",
                )}
              >
                {owed} {owed === 1 ? "link" : "links"} to add
              </button>
            )}
          </div>
        )}

        {emptyReason ? (
          <Card className="flex flex-col">
            <EmptyState icon={emptyReason === "noPhones" ? Smartphone : ListChecks}>
              {emptyReason === "noPhones" ? "No phones yet" : "Nothing due"}
            </EmptyState>
          </Card>
        ) : devices.length === 0 ? (
          <Card className="flex flex-col">
            <EmptyState icon={ListChecks}>Nothing here</EmptyState>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {allFinished && day === 0 && (
              <Card className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pill-bg text-accent">
                  <Check className="size-4" />
                </span>
                <p className="text-sm text-text-muted">All done for today</p>
              </Card>
            )}
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} onOpenItem={board.open} />
            ))}
          </div>
        )}
      </div>

      {board.target && (
        <TodoLogSheet
          target={board.target}
          onClose={board.close}
          onSave={board.save}
          onUndo={board.undo}
        />
      )}
    </>
  );
}

/**
 * Which phones to show. A dropdown rather than a row of pills (Garreth,
 * 2026-09-22), because more than one can be picked at a time — two phones
 * side by side on the desk is the ordinary case — and six pills do not fit a
 * phone screen anyway.
 */
function PhonePicker({
  devices,
  picked,
  onChange,
}: {
  devices: TodoDevice[];
  picked: string[];
  onChange: (ids: string[]) => void;
}) {
  const label =
    picked.length === 0
      ? "All phones"
      : picked.length === 1
        ? (devices.find((d) => d.id === picked[0])?.name ?? "1 phone")
        : `${picked.length} phones`;

  const toggle = (id: string) =>
    onChange(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);

  return (
    <Dropdown
      label={label}
      icon={<Smartphone className="size-3.5" />}
      badge={picked.length > 1 ? picked.length : undefined}
    >
      {() => (
        <div className="flex flex-col gap-0.5">
          <PickerRow label="All phones" checked={picked.length === 0} onClick={() => onChange([])} />
          <span className="my-1 h-px bg-border" />
          {devices.map((d) => (
            <PickerRow
              key={d.id}
              label={d.name}
              checked={picked.includes(d.id)}
              onClick={() => toggle(d.id)}
            />
          ))}
        </div>
      )}
    </Dropdown>
  );
}

function PickerRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={checked}
      className="flex h-10 items-center gap-2.5 rounded-nested px-2 text-left text-sm transition-colors hover:bg-card-raised"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          checked ? "border-accent bg-accent/15 text-accent" : "border-border text-transparent",
        )}
      >
        <Check className="size-3" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

/**
 * "Today", with a day either side (Garreth, 2026-09-22). It replaced a
 * Today / Tomorrow switch, which could only ever see two days; the list has to
 * be able to step back to a day that was missed as well as forward to the load
 * that is coming.
 */
function DayStepper({ day, onChange }: { day: TodoDay; onChange: (d: TodoDay) => void }) {
  const step = (by: number) => onChange(Math.max(-7, Math.min(14, day + by)));

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => step(-1)}
        aria-label="The day before"
        className="flex size-9 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary"
      >
        <ChevronLeft className="size-4" />
      </button>
      {/* Wide enough for the longest label so the arrows do not shuffle, and
          no wider (Garreth, 2026-09-22). */}
      <span className="min-w-20 text-center text-sm font-medium">{todoDayLabel(day)}</span>
      <button
        onClick={() => step(1)}
        aria-label="The day after"
        className="flex size-9 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/** Keep only the posts that were marked done without their link. */
function onlyLinksOwed(devices: TodoDevice[]): TodoDevice[] {
  return devices
    .map((device) => ({
      ...device,
      accounts: device.accounts
        .map((a) => ({ ...a, items: a.items.filter((i) => i.status === "postedNoLink") }))
        .filter((a) => a.items.length > 0),
    }))
    .filter((d) => d.accounts.length > 0);
}

function DeviceCard({
  device,
  onOpenItem,
}: {
  device: TodoDevice;
  onOpenItem: (t: { item: TodoItem; handle: string }) => void;
}) {
  // Open by default: this page is the work, not a summary of it.
  const [open, setOpen] = useState(true);
  const progress = deviceProgress(device);

  return (
    <Card className="flex flex-col gap-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-left"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full bg-pill-bg",
            progress.finished ? "text-accent" : "text-text-muted",
          )}
        >
          {progress.finished ? <Check className="size-4" /> : <Smartphone className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span className="truncate text-sm font-medium">{device.name}</span>
          {device.model && (
            <span className="truncate text-xs text-text-muted">{device.model}</span>
          )}
        </span>
        {!device.isActive && <StatusPill tone="warn">Off</StatusPill>}
        {/* The count only. A link still owed shows as the yellow box on its own
            row, and as the filter at the top of the page (Garreth,
            2026-09-22). */}
        <span className="tnum shrink-0 text-xs text-text-muted">
          {progress.done} of {progress.total}
        </span>
        <span className="shrink-0 text-text-muted">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-2">
          {device.accounts.map((account) => (
            <AccountGroup key={account.id} account={account} onOpenItem={onOpenItem} />
          ))}
        </div>
      )}
    </Card>
  );
}

function AccountGroup({
  account,
  onOpenItem,
}: {
  account: TodoAccount;
  onOpenItem: (t: { item: TodoItem; handle: string }) => void;
}) {
  const progress = accountProgress(account);

  return (
    // Its own quiet panel, so two accounts on one phone do not run together
    // (Garreth, 2026-09-22).
    <div className="min-w-0 rounded-nested bg-card-raised/50 px-3 pt-4 pb-3">
      {/* The account's own line needs room to breathe above and below before
          its tasks start (Garreth, 2026-09-22). */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border pb-3.5">
        <PlatformIcon platform={account.platform} />
        <span className="min-w-0 truncate text-sm font-medium">{account.handle}</span>
        <span className="shrink-0 text-xs text-text-muted">{account.character}</span>
        {/* How the account stands for the day, without reading every row
            (Garreth, 2026-09-22). */}
        {/* Left with everything else on a phone; pushed right only once
            there is room for it (Garreth, 2026-09-22). */}
        <span className="flex shrink-0 items-center gap-1.5 sm:ml-auto">
          <KindStatus label="Posts" of={progress.posts} />
          <KindStatus label="Warmup" of={progress.warmups} />
        </span>
      </div>

      <ul className="flex flex-col pt-1.5">
        {sortItems(account.items).map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onOpen={() => onOpenItem({ item, handle: account.handle })}
          />
        ))}
      </ul>
    </div>
  );
}

/** "Posts done" or "Posts 1 of 2" — one word on how that half of the day went. */
function KindStatus({ label, of }: { label: string; of: { done: number; total: number } }) {
  if (of.total === 0) return null;
  const done = of.done === of.total;
  return (
    <StatusPill tone={done ? "ok" : "gray"}>
      {done ? `${label} done` : `${label} ${of.done} of ${of.total}`}
    </StatusPill>
  );
}

/** What you need before you go and post. Not an outcome — that is the tick. */
function RowButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 text-[11px] font-medium text-text-muted transition-colors disabled:opacity-40 enabled:hover:border-text-muted/50 enabled:hover:text-text-primary"
    >
      {children}
    </button>
  );
}

function ItemRow({ item, onOpen }: { item: TodoItem; onOpen: () => void }) {
  const finished = isItemFinished(item);
  const isPost = item.kind === "post";

  return (
    /* Four columns on a phone (Garreth, 2026-09-22): the tick, the mark, the
       time it is due, and then everything about the task itself — its name,
       its detail, its status and its buttons — stacked in one left-aligned
       column rather than strung out beside the name. Each of the first three
       sits in the row's 36px first band, so they line up with the name. From
       `sm:` up the last column opens back out into a row, with the status and
       buttons at the right-hand end. */
    <li className="flex items-start gap-2 border-b border-border/60 py-2 last:border-0 last:pb-0 sm:gap-3">
      <TodoCheck item={item} onOpen={onOpen} />

      <span className={cn("flex h-9 shrink-0 items-center", finished && "opacity-55")}>
        {/* One circle for both kinds, the same size whatever the row height. */}
        <span className="flex size-8 items-center justify-center rounded-full bg-card-raised text-text-muted">
          {isPost ? <Film className="size-4" /> : <ListChecks className="size-4" />}
        </span>
      </span>

      <span
        className={cn(
          "tnum flex h-9 w-11 shrink-0 items-center text-xs text-text-muted",
          finished && "opacity-55",
        )}
      >
        {item.due}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
        <div className={cn("flex min-w-0 flex-1 flex-col", finished && "opacity-55")}>
          <span className="flex min-h-9 min-w-0 items-center gap-x-2">
            <span className={cn("min-w-0 text-sm font-medium break-words", finished && "line-through")}>
              {item.label}
            </span>
            {item.automated && (
              <span className="shrink-0 rounded-full bg-pill-bg px-2 py-0.5 text-[10px] font-medium text-text-muted">
                Automated
              </span>
            )}
          </span>
          <ItemDetail item={item} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1 sm:h-9 sm:shrink-0 sm:pb-0">
          <ItemStatus item={item} />
          {!finished && isPost && item.status !== "postedNoLink" && (
            <>
              <RowButton disabled={item.videoReady === false}>Download video</RowButton>
              <RowButton>Copy caption</RowButton>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function ItemStatus({ item }: { item: TodoItem }) {
  if (item.status === "postedNoLink") return <StatusPill tone="warn">Link needed</StatusPill>;
  if (item.status === "failed") return <StatusPill tone="danger">Failed</StatusPill>;
  if (item.status === "skipped") return <StatusPill tone="gray">Skipped</StatusPill>;
  return null;
}

/** The second line: why it is late, how far a warmup got, why it failed. */
function ItemDetail({ item }: { item: TodoItem }) {
  const bits: string[] = [];

  if (item.carriedOverFrom) bits.push(`Due ${item.carriedOverFrom}`);
  if (item.kind === "warmup" && item.targetMinutes) {
    bits.push(
      item.loggedMinutes && !isItemFinished(item)
        ? `${item.loggedMinutes} of ${item.targetMinutes} min logged`
        : item.loggedMinutes
          ? `${item.loggedMinutes} min`
          : `${item.targetMinutes} min`,
    );
  }
  if (item.videoReady === false) bits.push("Video not ready");
  if (item.doneAt) bits.push(item.status === "failed" ? `Failed ${item.doneAt}` : item.doneAt);
  if (item.reason) bits.push(item.reason);

  if (bits.length === 0) return null;
  return <p className="tnum text-xs text-text-muted">{bits.join(" · ")}</p>;
}
