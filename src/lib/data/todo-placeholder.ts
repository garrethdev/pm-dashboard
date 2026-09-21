import type { Platform } from "@/lib/platform";

/**
 * PLACEHOLDER DATA FOR THE P1 AND P2 DESIGN REVIEW — NOT LIVE DATA.
 *
 * Design tickets P1 (the dashboard card) and P2 (the full page) in
 * `docs/PHONE-FARM-DESIGN-TICKETS.md`. The real list comes from
 * `post_deliveries` (PF-05) read by PF-07, and neither exists yet: no phone has
 * been registered, no account has been moved to Physical, and the fleet is
 * paused. So there is nothing real to draw with, and the rule for a design
 * ticket is placeholder data anyway — invented phones, "Character 2", made-up
 * handles.
 *
 * The shapes below are deliberately the shapes PF-05 will hand back, so
 * swapping this file out for a query is a small change and not a redraw.
 *
 * DELETE THIS FILE when PF-07 lands.
 */

/** A post to make by hand, or a warmup session to run. */
export type TodoItemKind = "post" | "warmup";

/**
 * Every status a to-do item can be in (decision 7, Garreth 2026-09-19).
 *
 * `posted` and `postedNoLink` are the two that must be easy to tell apart at a
 * glance: a post can be marked done before its link is pasted, and the link is
 * the thing that closes the long-open attribution gap, so an item still owing
 * one is not finished.
 */
export type TodoItemStatus = "todo" | "posted" | "postedNoLink" | "logged" | "failed" | "skipped";

export type TodoItem = {
  id: string;
  kind: TodoItemKind;
  /** The content type for a post; which of the day's two sessions for a warmup. */
  label: string;
  /** Due time, already in the phone's own timezone. */
  due: string;
  status: TodoItemStatus;
  /** The day it was originally due, when it did not get finished then (decision 5). */
  carriedOverFrom?: string;
  /** When it was finished, for the line a finished item leaves behind. */
  doneAt?: string;
  /** Why a failed item failed. */
  reason?: string;
  /** Warmups only: the minutes that make the session done, and what is logged
   *  so far. A session logged short stays open and shows how far it got
   *  (Garreth, 2026-09-19: a session is 15 to 20 minutes, done from 15). */
  targetMinutes?: number;
  loggedMinutes?: number;
  /** Posts only: false when the video has not rendered, so Download cannot work. */
  videoReady?: boolean;
  /**
   * Warmups on an account set to Automated (P4). They stay on the list so the
   * day can be read in one place — and so a script that has stopped running
   * shows up as an item nobody can finish, rather than as silence (Garreth,
   * 2026-09-22). Nobody can tick one.
   */
  automated?: boolean;
};

export type TodoAccount = {
  id: string;
  handle: string;
  platform: Platform;
  character: string;
  items: TodoItem[];
};

export type TodoDevice = {
  id: string;
  name: string;
  model?: string;
  /** A phone switched off still owes its work; the list has to say so. */
  isActive: boolean;
  accounts: TodoAccount[];
};

/**
 * The states P1 and P2 have to be judged in. Live data will only ever produce
 * one of them at a time; the dashboard and the page pick one with `?todo=`.
 */
export type TodoState = "work" | "done" | "empty" | "noPhones" | "phoneOff" | "stress";

export const TODO_STATES: TodoState[] = [
  "work",
  "done",
  "empty",
  "noPhones",
  "phoneOff",
  "stress",
];

export function parseTodoState(raw: string | string[] | undefined): TodoState {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (TODO_STATES as string[]).includes(v ?? "") ? (v as TodoState) : "work";
}

/**
 * Which day is being looked at, as a number of days from today (Garreth,
 * 2026-09-22: a "Today" label with arrows either side, rather than a
 * Today / Tomorrow switch, because the list should step to any day).
 */
export type TodoDay = number;

export function parseTodoDay(raw: string | string[] | undefined): TodoDay {
  const v = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(v) ? Math.trunc(v) : 0;
}

/**
 * What the day reads as. Plain words rather than a date: a date would have to
 * be built from the clock, and the two days either side of today are the only
 * ones anybody steps to in practice.
 */
export function todoDayLabel(day: TodoDay): string {
  if (day === 0) return "Today";
  if (day === -1) return "Yesterday";
  if (day === 1) return "Tomorrow";
  return day > 0 ? `In ${day} days` : `${-day} days ago`;
}

const WARMUP_TARGET = 15;

/** An ordinary working morning: one phone part-done, one finished, one behind. */
const WORK: TodoDevice[] = [
  {
    id: "d1",
    name: "iPhone 1",
    model: "iPhone 12",
    isActive: true,
    accounts: [
      {
        id: "a1",
        handle: "@character2.daily",
        platform: "tiktok",
        character: "Character 2",
        items: [
          {
            id: "i1",
            kind: "post",
            label: "Celebrity verdict",
            due: "09:00",
            status: "posted",
            doneAt: "09:12",
            videoReady: true,
          },
          {
            id: "i2",
            kind: "post",
            label: "Before and after",
            due: "13:00",
            status: "postedNoLink",
            doneAt: "13:04",
            videoReady: true,
          },
          {
            id: "i3",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:30",
            status: "logged",
            doneAt: "08:41",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 17,
          },
          {
            id: "i4",
            kind: "warmup",
            label: "Warmup, evening",
            due: "19:00",
            status: "todo",
            targetMinutes: WARMUP_TARGET,
          },
        ],
      },
      {
        id: "a2",
        handle: "@character2.clips",
        platform: "instagram",
        character: "Character 2",
        items: [
          {
            id: "i5",
            kind: "post",
            label: "Peptide myth",
            due: "11:00",
            status: "todo",
            videoReady: true,
          },
          {
            // Logged short of its target: still open, and says how far it got.
            id: "i6",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:30",
            status: "todo",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 8,
          },
          {
            id: "i7",
            kind: "warmup",
            label: "Warmup, evening",
            due: "19:00",
            status: "todo",
            targetMinutes: WARMUP_TARGET,
          },
        ],
      },
    ],
  },
  {
    id: "d2",
    name: "iPhone 2",
    model: "iPhone 12",
    isActive: true,
    accounts: [
      {
        id: "a3",
        handle: "@character3.lab",
        platform: "tiktok",
        character: "Character 3",
        items: [
          {
            id: "i8",
            kind: "post",
            label: "Celebrity verdict",
            due: "10:00",
            status: "posted",
            doneAt: "10:06",
            videoReady: true,
          },
          {
            id: "i9",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:00",
            status: "logged",
            doneAt: "08:19",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 19,
          },
          {
            id: "i10",
            kind: "warmup",
            label: "Warmup, evening",
            due: "18:30",
            status: "logged",
            doneAt: "18:47",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 16,
          },
        ],
      },
    ],
  },
  {
    id: "d3",
    name: "iPhone 3",
    model: "iPhone 13",
    isActive: true,
    accounts: [
      {
        id: "a4",
        handle: "@character4.notes",
        platform: "facebook",
        character: "Character 4",
        items: [
          {
            id: "i11",
            kind: "post",
            label: "Before and after",
            due: "16:00",
            status: "todo",
            carriedOverFrom: "yesterday",
            videoReady: true,
          },
          {
            // Two days behind: the last day it will carry over.
            id: "i11b",
            kind: "post",
            label: "Celebrity verdict",
            due: "16:00",
            status: "todo",
            carriedOverFrom: "2 days ago",
            videoReady: true,
          },
          {
            id: "i12",
            kind: "post",
            label: "Peptide myth",
            due: "12:00",
            status: "failed",
            doneAt: "12:26",
            reason: "Upload kept spinning",
            videoReady: true,
          },
          {
            // The video never rendered, so Download cannot work.
            id: "i12b",
            kind: "post",
            label: "ASMR routine",
            due: "17:00",
            status: "todo",
            videoReady: false,
          },
          {
            // The script did this one.
            id: "i12c",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:30",
            status: "logged",
            doneAt: "09:14",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 15,
            automated: true,
          },
          {
            // The script has not run this one yet. Nobody can tick it, so a
            // script that has died stays visible instead of going quiet.
            id: "i12d",
            kind: "warmup",
            label: "Warmup, evening",
            due: "19:00",
            status: "todo",
            targetMinutes: WARMUP_TARGET,
            automated: true,
          },
        ],

      },
    ],
  },
];

/** Everything today has been done, links and all. */
const DONE: TodoDevice[] = [
  {
    id: "d1",
    name: "iPhone 1",
    model: "iPhone 12",
    isActive: true,
    accounts: [
      {
        id: "a1",
        handle: "@character2.daily",
        platform: "tiktok",
        character: "Character 2",
        items: [
          {
            id: "i1",
            kind: "post",
            label: "Celebrity verdict",
            due: "09:00",
            status: "posted",
            doneAt: "09:12",
            videoReady: true,
          },
          {
            id: "i3",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:30",
            status: "logged",
            doneAt: "08:41",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 17,
          },
          {
            id: "i4",
            kind: "warmup",
            label: "Warmup, evening",
            due: "19:00",
            status: "logged",
            doneAt: "19:22",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 15,
          },
        ],
      },
    ],
  },
  {
    id: "d2",
    name: "iPhone 2",
    model: "iPhone 12",
    isActive: true,
    accounts: [
      {
        id: "a3",
        handle: "@character3.lab",
        platform: "instagram",
        character: "Character 3",
        items: [
          {
            id: "i8",
            kind: "post",
            label: "Peptide myth",
            due: "10:00",
            status: "posted",
            doneAt: "10:06",
            videoReady: true,
          },
          {
            id: "i9",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:00",
            status: "logged",
            doneAt: "08:19",
            targetMinutes: WARMUP_TARGET,
            loggedMinutes: 19,
          },
        ],
      },
    ],
  },
];

/** A phone switched off that still holds accounts with work owing. */
const PHONE_OFF: TodoDevice[] = [
  {
    id: "d1",
    name: "iPhone 1",
    model: "iPhone 12",
    isActive: true,
    accounts: [
      {
        id: "a1",
        handle: "@character2.daily",
        platform: "tiktok",
        character: "Character 2",
        items: [
          {
            id: "i1",
            kind: "post",
            label: "Celebrity verdict",
            due: "09:00",
            status: "posted",
            doneAt: "09:12",
            videoReady: true,
          },
          {
            id: "i4",
            kind: "warmup",
            label: "Warmup, evening",
            due: "19:00",
            status: "todo",
            targetMinutes: WARMUP_TARGET,
          },
        ],
      },
    ],
  },
  {
    id: "d4",
    name: "iPhone 4",
    model: "iPhone 13",
    isActive: false,
    accounts: [
      {
        id: "a5",
        handle: "@character5.asmr",
        platform: "tiktok",
        character: "Character 5",
        items: [
          {
            id: "i13",
            kind: "post",
            label: "ASMR routine",
            due: "14:00",
            status: "todo",
            videoReady: true,
          },
          {
            id: "i14",
            kind: "warmup",
            label: "Warmup, morning",
            due: "08:30",
            status: "todo",
            targetMinutes: WARMUP_TARGET,
          },
        ],
      },
    ],
  },
];

/**
 * The layout under load, which P2 asks to see: a very long handle, a very long
 * content type name, and one phone carrying three accounts with six items each.
 */
const STRESS: TodoDevice[] = [
  {
    id: "d1",
    name: "iPhone 1",
    model: "iPhone 12",
    isActive: true,
    accounts: [
      {
        id: "a1",
        handle: "@character2.the.longest.handle.anyone.has.ever.registered",
        platform: "tiktok",
        character: "Character 2",
        items: [
          {
            id: "s1",
            kind: "post",
            label: "Celebrity peptide gone wrong, the long form version",
            due: "09:00",
            status: "todo",
            videoReady: true,
          },
          { id: "s2", kind: "post", label: "Before and after", due: "11:00", status: "todo", videoReady: true },
          { id: "s3", kind: "post", label: "Peptide myth", due: "13:00", status: "todo", videoReady: true },
          { id: "s4", kind: "post", label: "ASMR routine", due: "15:00", status: "todo", videoReady: true },
          { id: "s5", kind: "warmup", label: "Warmup, morning", due: "08:30", status: "todo", targetMinutes: WARMUP_TARGET },
          { id: "s6", kind: "warmup", label: "Warmup, evening", due: "19:00", status: "todo", targetMinutes: WARMUP_TARGET },
        ],
      },
      {
        id: "a2",
        handle: "@character3.clips",
        platform: "instagram",
        character: "Character 3",
        items: [
          { id: "s7", kind: "post", label: "Celebrity verdict", due: "09:30", status: "todo", videoReady: true },
          { id: "s8", kind: "post", label: "Before and after", due: "11:30", status: "todo", videoReady: true },
          { id: "s9", kind: "post", label: "Peptide myth", due: "13:30", status: "todo", videoReady: true },
          { id: "s10", kind: "post", label: "ASMR routine", due: "15:30", status: "todo", videoReady: true },
          { id: "s11", kind: "warmup", label: "Warmup, morning", due: "08:45", status: "todo", targetMinutes: WARMUP_TARGET },
          { id: "s12", kind: "warmup", label: "Warmup, evening", due: "19:30", status: "todo", targetMinutes: WARMUP_TARGET },
        ],
      },
      {
        id: "a3",
        handle: "@character4.notes",
        platform: "facebook",
        character: "Character 4",
        items: [
          { id: "s13", kind: "post", label: "Celebrity verdict", due: "10:00", status: "todo", videoReady: true },
          { id: "s14", kind: "post", label: "Before and after", due: "12:00", status: "todo", videoReady: true },
          { id: "s15", kind: "post", label: "Peptide myth", due: "14:00", status: "todo", videoReady: true },
          { id: "s16", kind: "post", label: "ASMR routine", due: "16:00", status: "todo", videoReady: true },
          { id: "s17", kind: "warmup", label: "Warmup, morning", due: "09:00", status: "todo", targetMinutes: WARMUP_TARGET },
          { id: "s18", kind: "warmup", label: "Warmup, evening", due: "20:00", status: "todo", targetMinutes: WARMUP_TARGET },
        ],
      },
    ],
  },
];

/** Tomorrow: the same phones, nothing started, so the load can be seen. */
const TOMORROW: TodoDevice[] = WORK.map((device) => ({
  ...device,
  accounts: device.accounts.map((account) => ({
    ...account,
    items: account.items
      .filter((item) => !item.carriedOverFrom)
      .map((item) => ({
        id: `${item.id}-t`,
        kind: item.kind,
        label: item.label,
        due: item.due,
        status: "todo" as const,
        targetMinutes: item.targetMinutes,
        videoReady: item.videoReady,
      })),
  })),
}));

export function todoPlaceholder(state: TodoState, day: TodoDay = 0): TodoDevice[] {
  if (state === "empty" || state === "noPhones") return [];
  // A day still to come has nothing done on it yet; a day gone by is closed.
  if (day > 0) return TOMORROW;
  if (day < 0) return DONE;
  if (state === "done") return DONE;
  if (state === "phoneOff") return PHONE_OFF;
  if (state === "stress") return STRESS;
  return WORK;
}

/** Whether the emptiness is "no phones at all" or "phones, nothing due". */
export function todoEmptyReason(state: TodoState): "noPhones" | "nothingDue" | null {
  if (state === "noPhones") return "noPhones";
  if (state === "empty") return "nothingDue";
  return null;
}

/** An item nobody has to touch again. A post still owing its link is NOT done. */
export function isItemFinished(item: TodoItem): boolean {
  return item.status === "posted" || item.status === "logged" || item.status === "skipped";
}

export function isItemOpen(item: TodoItem): boolean {
  return !isItemFinished(item);
}

/**
 * Carried-over items sit ABOVE today's, inside their account (P2's open
 * question, decided here): they are the oldest work and the only work with a
 * deadline of its own, since an item stops carrying over after three days.
 * Otherwise, time order.
 */
export function sortItems(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.carriedOverFrom) !== Boolean(b.carriedOverFrom)) {
      return a.carriedOverFrom ? -1 : 1;
    }
    return a.due.localeCompare(b.due);
  });
}

export type DeviceProgress = {
  done: number;
  total: number;
  /** Posts marked done that still owe a link — counted done, but called out. */
  linksToAdd: number;
  finished: boolean;
};

/**
 * The count on a device block. It has to say which kind of done it is counting
 * (P1): "7 of 7 · 2 links to add" is a finished phone that still owes links.
 */
export function deviceProgress(device: TodoDevice): DeviceProgress {
  const items = device.accounts.flatMap((a) => a.items);
  const done = items.filter(isItemFinished).length;
  const linksToAdd = items.filter((i) => i.status === "postedNoLink").length;
  return { done, total: items.length, linksToAdd, finished: done === items.length };
}

export type AccountProgress = {
  posts: { done: number; total: number };
  warmups: { done: number; total: number };
};

/**
 * How an account stands for the day, at a glance (Garreth, 2026-09-22):
 * whether its posting is done and whether its warmups are, without reading
 * every row.
 */
export function accountProgress(account: TodoAccount): AccountProgress {
  const count = (kind: TodoItemKind) => {
    const items = account.items.filter((i) => i.kind === kind);
    return { done: items.filter(isItemFinished).length, total: items.length };
  };
  return { posts: count("post"), warmups: count("warmup") };
}

/** Every post across the fleet that was marked done without its link. */
export function linksOwed(devices: TodoDevice[]): number {
  return devices.reduce((n, d) => n + deviceProgress(d).linksToAdd, 0);
}
