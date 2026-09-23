"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Film,
  LinkSimple,
  ListChecks,
  Rows,
  Smartphone,
  SquaresFour,
} from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import {
  AutomatedMark,
  BanCleanupGroup,
  TodoCheck,
  TodoLogSheet,
  useCleanupTicks,
  useTodoBoard,
  type SheetTarget,
} from "@/components/dashboard/todo-board";
import {
  accountProgress,
  todoAnchor,
  deviceProgress,
  isItemFinished,
  sortItems,
  todoDayLabel,
  todoEmptyReason,
  type TodoAccount,
  type TodoDay,
  type TodoDevice,
  type TodoItem,
  type TodoState,
} from "@/lib/data/todo-placeholder";
import type { TodoExtras } from "@/lib/data/todo";
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
 *  - WHAT HAPPENED TO A TASK IS SAID BESIDE ITS NAME (Garreth, 2026-09-22),
 *    with the Automated label — Link needed, Failed, Skipped — and a failed
 *    post also turns its own mark red. The right-hand end of the row is for
 *    the two things you fetch before posting, and nothing else.
 *  - A LINK STILL OWED IS MARKED ON ITS PHONE (Garreth, 2026-09-22). The
 *    phone's icon becomes a yellow link when any account on it owes one, so
 *    the phone that needs attention is obvious while scanning the list, and
 *    says what it is owed rather than only that something is due. This
 *    replaced a "n links to add" filter at the top of the page: one more
 *    control to press, when the thing it found could simply be pointed at.
 *  - A FINISHED ITEM STAYS, struck through, with the time it was finished, for
 *    the rest of the day.
 *  - ANY DAY IS ONE PRESS AWAY: "Today" with an arrow either side.
 *  - GRID OR LIST (Garreth, 2026-09-22). List is one phone per full-width
 *    row, as before, and is the default. Grid stands the phones side by side,
 *    three across on a wide screen, for the morning look at how the whole
 *    farm stands. The switch is the same pair of glyphs as the Carousel
 *    Generator's render screen (D5), so one control means one thing across
 *    the app. It only appears from `md:` up: below that there is no room for
 *    a second column, and a switch that does nothing is worse than no switch.
 *    It sits at the right of the filter row, in the place the links filter
 *    used to hold. A phone card sizes ITS OWN contents with container queries rather
 *    than the window's width, so the same card reads correctly full-width and
 *    in a third of the page.
 *
 * Runs on placeholder data (`todo-placeholder.ts`) until PF-05 and PF-07 exist.
 */
export function TodoView({
  state,
  initialDay,
  live,
}: {
  state: TodoState;
  initialDay: TodoDay;
  /** The server's answer for `initialDay`. Absent on a `?todo=` design state,
   *  where the page draws `todo-placeholder.ts` and saves nothing. */
  live?: { initial: TodoDevice[]; extras: TodoExtras; initialDay: TodoDay };
}) {
  const [day, setDay] = useState<TodoDay>(initialDay);
  /** Empty means every phone. */
  const [picked, setPicked] = useState<string[]>([]);
  const [layout, setLayout] = useState<TodoLayout>("list");
  const board = useTodoBoard(state, day, live);

  const all = board.devices;
  // On the real list the reason comes from the list itself: no phones at all
  // reads differently from a phone with nothing due. The placeholder states
  // keep saying which one they are drawing.
  const emptyReason = board.live
    ? board.devices.length === 0
      ? "noPhones"
      : board.devices.every(
            (d) => d.accounts.every((a) => a.items.length === 0) && !(d.cleanups?.length),
          )
        ? "nothingDue"
        : null
    : todoEmptyReason(state);

  const devices = picked.length === 0 ? all : all.filter((d) => picked.includes(d.id));

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
            {/* The far end of this row, where the links filter used to sit
                (Garreth, 2026-09-22). */}
            <div className="ml-auto">
              <LayoutSwitch layout={layout} onChange={setLayout} />
            </div>
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
            <div
              className={cn(
                layout === "grid"
                  ? // `items-start` so a phone with one task keeps its own
                    // height instead of being stretched to match the phone
                    // beside it.
                    "grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3"
                  : "flex flex-col gap-3",
              )}
            >
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onOpenItem={board.open}
                  onStepSaved={board.live ? board.reload : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {board.target && (
        <TodoLogSheet
          extras={board.extras}
          live={board.live}
          target={board.target}
          onClose={board.close}
          onSave={board.save}
          onUndo={board.undo}
        />
      )}
    </>
  );
}

/** One phone per row, or the phones side by side. */
type TodoLayout = "grid" | "list";

/**
 * Grid or List, in the app's segmented-pill style, carrying the same two
 * glyphs as the Carousel Generator's render screen (Garreth, 2026-09-22).
 * It sits at the far end of the filter row, the place the "n links to add"
 * filter held before a phone's own icon took that job over (Garreth,
 * 2026-09-22).
 *
 * Hidden below `md:`, where a second column will not fit: on a phone the grid
 * would draw exactly the same single stack as the list, and a switch that
 * changes nothing is a broken switch. Wrapped rather than given a `hidden`
 * class of its own, because the pills set their own display.
 */
function LayoutSwitch({
  layout,
  onChange,
}: {
  layout: TodoLayout;
  onChange: (l: TodoLayout) => void;
}) {
  return (
    <div className="hidden md:block">
      <FilterPills
        inline
        value={layout}
        onChange={onChange}
        options={[
          { value: "grid", label: "Grid", icon: <SquaresFour className="size-3.5" /> },
          { value: "list", label: "List", icon: <Rows className="size-3.5" /> },
        ]}
      />
    </div>
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

  // 28px, the height of the Grid / List pills, so the page's two switches
  // read as the same weight of control (Garreth, 2026-09-22). The hit area is
  // kept at 44px by the ::after inset below, which is invisible.
  const arrow =
    "relative flex size-7 items-center justify-center rounded-full border border-border text-text-muted transition-colors after:absolute after:-inset-2 after:content-[''] hover:border-text-muted/50 hover:text-text-primary";

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => step(-1)} aria-label="The day before" className={arrow}>
        <ChevronLeft className="size-3.5" />
      </button>
      {/* Wide enough for the longest label so the arrows do not shuffle, and
          no wider (Garreth, 2026-09-22). */}
      <span className="min-w-20 text-center text-sm font-medium">{todoDayLabel(day)}</span>
      <button onClick={() => step(1)} aria-label="The day after" className={arrow}>
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}

function DeviceCard({
  device,
  onOpenItem,
  onStepSaved,
}: {
  device: TodoDevice;
  onOpenItem: (t: SheetTarget) => void;
  /** On the live list: re-read it once a tick has saved. Absent on a `?todo=`
   *  design state, where a tick is held here and saved nowhere. */
  onStepSaved?: () => Promise<void>;
}) {
  // Open by default: this page is the work, not a summary of it.
  const [open, setOpen] = useState(true);
  // Ticks on a ban's clean-up steps, shown the instant they are pressed and
  // saved on the live list (PF-11). Shared with the dashboard card.
  const { cleanups, toggleStep, stepError } = useCleanupTicks(device, onStepSaved);
  const progress = deviceProgress({ ...device, cleanups });

  return (
    // `@container`: everything inside sizes itself against THIS CARD, not the
    // window, so the same card is right full-width and at a third of the page
    // in Grid (Garreth, 2026-09-22). `@lg` is 32rem — a third-width column on
    // a 1440 screen lands under it and stacks, exactly as a phone does.
    <Card className="@container flex flex-col gap-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-left"
      >
        {/* The phone's icon IS the attention mark (Garreth, 2026-09-22): a
            yellow LINK in place of the phone whenever an account on it has a
            post that owes its link, so the phone to go back to is obvious
            while scanning, and says what it wants rather than only that it
            wants something. A phone cannot be both finished and owing a link
            — an item without its link is not counted done — so the three
            states never clash. */}
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            progress.linksToAdd > 0
              ? "bg-pill-yellow/15"
              : cn("bg-pill-bg", progress.finished ? "text-accent" : "text-text-muted"),
          )}
        >
          {progress.linksToAdd > 0 ? (
            <>
              <LinkSimple className="size-4 text-pill-yellow" />
              <span className="sr-only">
                {progress.linksToAdd} {progress.linksToAdd === 1 ? "link" : "links"} to add
              </span>
            </>
          ) : progress.finished ? (
            <Check className="size-4" />
          ) : (
            <Smartphone className="size-4" />
          )}
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
          {/* A ban's clean-up comes first: it is the oldest work on the phone,
              and until it is done the phone still carries a banned account's
              sign-in (P8). */}
          {cleanups.map((c) => (
            <BanCleanupGroup key={c.accountId} cleanup={c} onToggle={toggleStep} />
          ))}
          {stepError && <p className="px-1 text-sm text-danger">{stepError}</p>}
          {device.accounts.map((account) => (
            <AccountGroup
              key={account.id}
              account={account}
              deviceId={Number(device.id)}
              onOpenItem={onOpenItem}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function AccountGroup({
  account,
  deviceId,
  onOpenItem,
}: {
  account: TodoAccount;
  /** The phone this account sits on, carried into the sheet so a warmup
   *  logged from the list records where it was done (PF-04). */
  deviceId?: number;
  onOpenItem: (t: SheetTarget) => void;
}) {
  const progress = accountProgress(account);

  return (
    // Its own quiet panel, so two accounts on one phone do not run together
    // (Garreth, 2026-09-22).
    // The id is what a device page's pill links to (P5, round three). It draws
    // nothing; `scroll-mt-4` just keeps the panel off the top edge on arrival.
    <div
      id={todoAnchor(account.id)}
      className="min-w-0 scroll-mt-4 rounded-nested bg-card-raised/50 px-3 pt-4 pb-3"
    >
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
        <span className="flex shrink-0 items-center gap-1.5 @lg:ml-auto">
          <KindStatus label="Posts" of={progress.posts} />
          <KindStatus label="Warmup" of={progress.warmups} />
        </span>
      </div>

      <ul className="flex flex-col pt-1.5">
        {sortItems(account.items).map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onOpen={() => onOpenItem({ item, handle: account.handle, deviceId })}
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

/**
 * What you need before you go and post. Not an outcome — that is the tick.
 *
 * On a narrow card (a Grid column) the two of these **share one line across
 * the whole row**, half each, rather than stacking (Garreth, 2026-09-22).
 * The full label does not fit in half a row that narrow, so there it
 * shortens to its noun and an icon carries the verb. At `@lg` the button is
 * exactly what it always was: its own width, its own words, no icon.
 */
function RowButton({
  icon,
  short,
  children,
  disabled,
}: {
  /** Stands in for the verb where the label is cut to its noun. */
  icon: React.ReactNode;
  short: string;
  children: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      aria-label={children}
      className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-border px-1.5 text-[11px] font-medium text-text-muted transition-colors disabled:opacity-40 enabled:hover:border-text-muted/50 enabled:hover:text-text-primary @lg:flex-none @lg:shrink-0 @lg:gap-1.5 @lg:px-2.5"
    >
      <span className="shrink-0 @lg:hidden">{icon}</span>
      <span className="truncate @lg:hidden">{short}</span>
      <span className="hidden @lg:inline">{children}</span>
    </button>
  );
}

function ItemRow({ item, onOpen }: { item: TodoItem; onOpen: () => void }) {
  const finished = isItemFinished(item);
  const isPost = item.kind === "post";

  return (
    /* Four columns on a phone (Garreth, 2026-09-22): the tick, the mark, the
       time it is due, and then the task itself. Each of the first three sits
       in the row's 36px first band, so they line up with the name.

       The row WRAPS: where the card is narrow the two fetch buttons drop to a
       line of their own across the WHOLE row, edge to edge, rather than being
       squeezed into the column beside the name (Garreth, 2026-09-22). Once
       the card is wide (`@lg:`, the card's own width — it may be sitting in a
       third of the page in Grid) the row stops wrapping and the buttons
       return to its right-hand end, on its centre line. */
    <li className="flex flex-wrap items-start gap-2 border-b border-border/60 py-2 last:border-0 last:pb-0 @lg:flex-nowrap @lg:gap-3">
      <TodoCheck item={item} onOpen={onOpen} />

      <span className={cn("flex h-9 shrink-0 items-center", finished && "opacity-55")}>
        {/* One circle for both kinds, the same size whatever the row height.
            It turns red on a failed post (Garreth, 2026-09-22) so the row
            that went wrong is findable without reading the pills. */}
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-card-raised",
            item.status === "failed" ? "text-pill-red" : "text-text-muted",
          )}
        >
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

      <div className={cn("flex min-w-0 flex-1 flex-col", finished && "opacity-55")}>
        {/* The status belongs beside the name, with the Automated label
            (Garreth, 2026-09-22): what happened to a task is part of reading
            the task, not something to look for at the other end of the row. */}
        <span className="flex min-h-9 min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("min-w-0 text-sm font-medium break-words", finished && "line-through")}>
            {item.label}
          </span>
          {item.automated && <AutomatedMark />}
          <ItemStatus item={item} />
        </span>
        <ItemDetail item={item} />
      </div>

      {!finished && isPost && item.status !== "postedNoLink" && (
        // `w-full` is what breaks the line: a child that wide cannot sit
        // beside anything, so the pair takes the row's whole width. At `@lg:`
        // it hugs its buttons again and centres against the row.
        <div className="flex w-full min-w-0 items-center gap-2 @lg:w-auto @lg:shrink-0 @lg:self-center">
          <RowButton
            icon={<Download className="size-3.5" />}
            short="Video"
            disabled={item.videoReady === false}
          >
            Download video
          </RowButton>
          <RowButton icon={<Copy className="size-3.5" />} short="Caption">
            Copy caption
          </RowButton>
        </div>
      )}
    </li>
  );
}

function ItemStatus({ item }: { item: TodoItem }) {
  if (item.status === "postedNoLink") return <StatusPill tone="warn">Link needed</StatusPill>;
  if (item.status === "failed") return <StatusPill tone="danger">Failed</StatusPill>;
  if (item.status === "skipped") return <StatusPill tone="gray">Skipped</StatusPill>;
  // Only while it is still open: once posted, it is no longer late (P12).
  if (item.overdueFor && !isItemFinished(item)) return <StatusPill tone="danger">Overdue</StatusPill>;
  return null;
}

/** The second line: why it is late, how far a warmup got, why it failed. */
function ItemDetail({ item }: { item: TodoItem }) {
  const bits: string[] = [];

  if (item.carriedOverFrom) bits.push(`Due ${item.carriedOverFrom}`);
  // The last day says what matters more than how long: tomorrow it is gone
  // from the list (P12).
  if (!isItemFinished(item)) {
    if (item.lastDay) bits.push("last day on the list");
    else if (item.overdueFor) bits.push(`waiting\u00a0${item.overdueFor}`);
  }
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
