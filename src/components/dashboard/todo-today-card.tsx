"use client";

import { useState } from "react";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Check,
  ChevronDown,
  ChevronRight,
  LinkSimple,
  ListChecks,
  Smartphone,
} from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { PlatformIcon } from "@/components/ui/platform-icon";
import {
  AutomatedMark,
  TodoCheck,
  TodoLogSheet,
  useTodoBoard,
} from "@/components/dashboard/todo-board";
import {
  deviceProgress,
  sortItems,
  todoEmptyReason,
  type TodoAccount,
  type TodoDevice,
  type TodoItem,
  type TodoState,
} from "@/lib/data/todo-placeholder";
import { cn } from "@/lib/utils";

/**
 * "To-do" on the Physical dashboard — design ticket P1.
 *
 * EVERY PHONE IS ONE COLLAPSED LINE until it is opened (Garreth, 2026-09-22).
 * The card's job on the dashboard is to say how the day stands — which phone
 * still owes work — not to lay the whole day out; six phones' worth of items
 * made it a wall of text in the corner of the homepage. Opening a phone shows
 * its accounts and items, and an item is ticked off here exactly as it is on
 * the full page.
 *
 * Each phone sits in its own quiet container (Garreth, 2026-09-22), so an
 * opened phone reads as one block rather than running into the next.
 *
 * Runs on placeholder data (`todo-placeholder.ts`) until PF-05 and PF-07 exist.
 */
export function TodoTodayCard({
  state = "work",
  className,
}: {
  state?: TodoState;
  className?: string;
}) {
  const board = useTodoBoard(state, 0);
  const emptyReason = todoEmptyReason(state);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const allDone =
    board.devices.length > 0 &&
    board.devices.every((device) => deviceProgress(device).finished);

  return (
    <>
      <DashCard title="To-do" viewAllHref="/todo" className={className}>
        {emptyReason ? (
          <EmptyState icon={emptyReason === "noPhones" ? Smartphone : ListChecks} compact>
            {emptyReason === "noPhones" ? "No phones yet" : "Nothing due today"}
          </EmptyState>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {board.devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  open={open[device.id] ?? false}
                  onToggle={() =>
                    setOpen((prev) => ({ ...prev, [device.id]: !(prev[device.id] ?? false) }))
                  }
                  onOpenItem={board.open}
                />
              ))}
            </ul>
            {allDone && (
              <EmptyState icon={Check} compact>
                All done for today
              </EmptyState>
            )}
          </>
        )}
      </DashCard>

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

function DeviceRow({
  device,
  open,
  onToggle,
  onOpenItem,
}: {
  device: TodoDevice;
  open: boolean;
  onToggle: () => void;
  onOpenItem: (t: { item: TodoItem; handle: string }) => void;
}) {
  const progress = deviceProgress(device);

  return (
    <li className="overflow-hidden rounded-nested bg-card-raised/60">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:text-text-primary"
      >
        {/* The phone's own icon carries how it stands, the same three ways as
            on the To-do page (Garreth, 2026-09-22): a cyan tick when the day
            is finished, a yellow link when an account on it has a post that
            owes one, the phone itself otherwise. */}
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-nested",
            progress.linksToAdd > 0
              ? "bg-pill-yellow/15 text-pill-yellow"
              : cn("bg-pill-bg", progress.finished ? "text-accent" : "text-text-muted"),
          )}
        >
          {progress.linksToAdd > 0 ? (
            <>
              <LinkSimple className="size-3.5" />
              <span className="sr-only">
                {progress.linksToAdd} {progress.linksToAdd === 1 ? "link" : "links"} to add
              </span>
            </>
          ) : progress.finished ? (
            <Check className="size-3.5" />
          ) : (
            <Smartphone className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{device.name}</span>
        {!device.isActive && <StatusPill tone="warn">Off</StatusPill>}
        {/* The count only. A link still owed shows as the yellow box on its
            own row once the phone is opened, which is enough (Garreth,
            2026-09-22). */}
        <span className="tnum shrink-0 text-xs text-text-muted">
          {progress.done} of {progress.total}
        </span>
        <span className="shrink-0 text-text-muted">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-5 px-3 pt-1 pb-4">
          {device.accounts.map((account) => (
            <AccountGroup key={account.id} account={account} onOpenItem={onOpenItem} />
          ))}
        </div>
      )}
    </li>
  );
}

function AccountGroup({
  account,
  onOpenItem,
}: {
  account: TodoAccount;
  onOpenItem: (t: { item: TodoItem; handle: string }) => void;
}) {
  return (
    <div className="min-w-0">
      {/* The handle and its platform only. The character is on the account's
          own screens; here it was a third thing to read on every line
          (Garreth, 2026-09-22). */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center">
          <PlatformIcon platform={account.platform} />
        </span>
        <span className="min-w-0 truncate text-xs font-medium text-text-primary">
          {account.handle}
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {sortItems(account.items).map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <TodoCheck
              compact
              item={item}
              onOpen={() => onOpenItem({ item, handle: account.handle })}
            />
            {/* Every leading mark — the phone icon, the platform mark and this
                tick — is 24px wide, so the phone name, the handle and the times
                all start at the same x (Garreth, 2026-09-22). */}
            <span className="tnum w-11 shrink-0 text-left text-xs text-text-muted">
              {item.due}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                item.status === "todo" ? "text-text-primary" : "text-text-muted line-through",
              )}
            >
              {item.label}
              {item.carriedOverFrom && (
                <span className="no-underline"> · from {item.carriedOverFrom}</span>
              )}
            </span>
            {item.automated && <AutomatedMark side="left" />}
            {item.status === "postedNoLink" && <StatusPill tone="warn">Link</StatusPill>}
            {item.status === "failed" && <StatusPill tone="danger">Failed</StatusPill>}
          </li>
        ))}
      </ul>

    </div>
  );
}
