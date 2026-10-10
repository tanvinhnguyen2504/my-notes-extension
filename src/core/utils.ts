import { extractDayToken, todayKey } from './day_utils.ts';
import { Priority, Settings, Task, Theme, TimeOfDay, Width } from './types.ts';

export const PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
} as const;

export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const WIDTH = {
  COMPACT: 'compact',
  WIDE: 'wide',
} as const;

// Only the fallbacks normalizeSettings needs. `theme` is resolved there rather
// than here, because its default is the OS preference, not a constant.
export const DEFAULT_SETTINGS: Omit<Settings, 'theme'> = {
  width: WIDTH.COMPACT,
  reminder: {
    enabled: false,
    time: '09:00',
  },
};

// Storage returns `unknown`; this is the one place that walks it.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// A time of day, not an instant -- same reasoning as dueDate, and exactly what
// <input type="time"> reads and writes.
export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

// Guarded like preferredTheme(): this module is imported by the service worker,
// and randomUUID needs a secure context. The fallback is not
// cryptographically meaningful and does not need to be -- it only has to be
// unique within one list.
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isPriority(value: unknown): value is Priority {
  return value === PRIORITY.LOW || value === PRIORITY.NORMAL || value === PRIORITY.HIGH;
}

// "!buy milk" -> a high-priority item. Returns null for empty input.
export function parseDraft(rawText: string): Task | null {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return null;
  }

  const { text: withoutDay, dueDate } = extractDayToken(trimmed);
  const isHighPriority = withoutDay.startsWith('!');
  const text = (isHighPriority ? withoutDay.slice(1) : withoutDay).trim();
  if (!text) {
    return null;
  }

  return {
    id: newId(),
    text,
    done: false,
    priority: isHighPriority ? PRIORITY.HIGH : PRIORITY.NORMAL,
    updatedAt: Date.now(),
    // New tasks land on today unless an @day token says otherwise.
    dueDate: dueDate || todayKey(),
  };
}

// Menu order: most urgent first. Drives both the popover and its labels.
export const PRIORITY_ORDER = [PRIORITY.HIGH, PRIORITY.NORMAL, PRIORITY.LOW] as const;

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITY.HIGH]: 'HIGH',
  [PRIORITY.NORMAL]: 'MEDIUM',
  [PRIORITY.LOW]: 'LOW',
};

// Ranked through PRIORITY_ORDER, not the raw constants, so list and menu order
// cannot drift and the sort does not depend on HIGH being the largest number.
//
// sort is stable, so equal-priority tasks keep the user's order -- which is also
// why no per-group logic is needed: groupByDay renders each section in array
// order, so one sort of the flat array leaves every group ordered.
//
// Returns a new array and stamps nothing: this changes position, not items.
export function sortByPriority(items: Task[]): Task[] {
  const rank = (item: Task) => PRIORITY_ORDER.indexOf(item.priority);
  return [...items].sort((a, b) => rank(a) - rank(b));
}

export function switchTheme(theme: Theme): Theme {
  return theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT;
}

export function nextWidth(width: Width): Width {
  return width === WIDTH.WIDE ? WIDTH.COMPACT : WIDTH.WIDE;
}

// The `typeof window` guard is load-bearing: a service worker has no window, and
// without it normalizeState() throws inside the worker on the empty-storage
// path. The compiler cannot help -- lib DOM makes `window` type-check here
// regardless, so the guard is the only protection.
export function preferredTheme(): Theme {
  const prefersDark = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? THEME.DARK : THEME.LIGHT;
}

export function countDone(items: Task[]): number {
  return items.filter((item) => item.done).length;
}

export function progressPercent(items: Task[]): number {
  if (!items.length) {
    return 0;
  }
  return Math.round((countDone(items) / items.length) * 100);
}

// Leading-edge: runs fn immediately, then ignores calls until `wait` ms of quiet.
// Leading because callers read live DOM values, which deferring would re-read.
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    const isIdle = timer === null;
    clearTimeout(timer ?? undefined);
    timer = setTimeout(() => {
      timer = null;
    }, wait);
    if (isIdle) {
      fn(...args);
    }
  };
}

// What the reminder is for: HIGH and still outstanding.
export function getHighPriorityItems(items: Task[]): Task[] {
  return items.filter((item) => item.priority === PRIORITY.HIGH && !item.done);
}

export function getUndoneItems(items: Task[]): Task[] {
  return items.filter((item: Task) => !item.done);
}

// Epoch ms of the next time the clock reads `time`: today if still ahead, else
// tomorrow. Local throughout -- 09:00 means 09:00 where the user is.
export function nextReminderTime(time: TimeOfDay, from: Date = new Date()): number {
  // Indexed, not destructured: defaulting a `number | undefined` would change
  // what a malformed time does. Number(undefined) is NaN, as before.
  const parts = time.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= from.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

export function isAllDone(items: Task[]): boolean {
  return items.length > 0 && countDone(items) === items.length;
}

// Both halves of the mark-all toggle. Items already in the target state are
// returned untouched, so a no-op cannot move their timestamp.
export function setAllDone(items: Task[], done: boolean): Task[] {
  return items.map((item) => (item.done === done ? item : { ...item, done, updatedAt: Date.now() }));
}

// Moves the item at `from` so it lands before position `to`, where `to` is an
// index in the ORIGINAL array. Returns a new array; unchanged if it is a no-op.
export function moveItem(items: Task[], from: number, to: number): Task[] {
  if (from < 0 || from >= items.length) {
    return items;
  }
  if (to < 0 || to > items.length) {
    return items;
  }
  if (to === from || to === from + 1) {
    return items;
  }

  const next = items.slice();
  const moved = next.splice(from, 1)[0];
  // Unreachable given the bounds check, but a guard rather than an assertion so
  // it stays true if that check changes.
  if (moved === undefined) {
    return items;
  }
  next.splice(to > from ? to - 1 : to, 0, moved);
  return next;
}

// Every content or state change goes through here, so the displayed date cannot
// drift.
export function touchItem(item: Task): Task {
  item.updatedAt = Date.now();
  return item;
}
