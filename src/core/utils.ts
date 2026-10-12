import { extractDayToken, todayKey } from './day_utils';
import { Priority, Settings, Task, Theme, TimeOfDay, Width } from './types';

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

// Chrome clips a popup wider than 800; MAX keeps headroom under that.
export const WIDE_WIDTH_PROPERTY = '--wide-width';

export const WIDE_WIDTH = {
  MIN: 380,
  MAX: 780,
  DEFAULT: 720,
} as const;

// `theme` is absent: its default is the OS preference, resolved in the normalizer.
export const DEFAULT_SETTINGS: Omit<Settings, 'theme'> = {
  width: WIDTH.COMPACT,
  wideWidth: WIDE_WIDTH.DEFAULT,
  mode: 'tasks',
  reminder: {
    enabled: false,
    time: '09:00',
  },
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

// randomUUID needs a secure context, which the service worker may lack.
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isPriority(value: unknown): value is Priority {
  return value === PRIORITY.LOW || value === PRIORITY.NORMAL || value === PRIORITY.HIGH;
}

// "!buy milk" -> a high-priority item.
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
    dueDate: dueDate || todayKey(),
  };
}

export const PRIORITY_ORDER = [PRIORITY.HIGH, PRIORITY.NORMAL, PRIORITY.LOW] as const;

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITY.HIGH]: 'HIGH',
  [PRIORITY.NORMAL]: 'MEDIUM',
  [PRIORITY.LOW]: 'LOW',
};

// Ranked through PRIORITY_ORDER so list and menu order cannot drift. Stable,
// so equal-priority tasks keep the user's order.
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

// The single gate, used by both the normalizer and the reducer.
export function clampWideWidth(value: unknown): number {
  const width = Math.round(Number(value));
  if (!Number.isFinite(width)) {
    return WIDE_WIDTH.DEFAULT;
  }
  if (width < WIDE_WIDTH.MIN) {
    return WIDE_WIDTH.MIN;
  }
  if (width > WIDE_WIDTH.MAX) {
    return WIDE_WIDTH.MAX;
  }
  return width;
}

// The `typeof window` guard is load-bearing: the worker has no window, and the
// compiler cannot catch it -- lib DOM makes `window` type-check here regardless.
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

// Leading-edge: fires immediately, then ignores calls until `wait` ms of quiet.
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

export function getHighPriorityItems(items: Task[]): Task[] {
  return items.filter((item) => item.priority === PRIORITY.HIGH && !item.done);
}

export function getUndoneItems(items: Task[]): Task[] {
  return items.filter((item: Task) => !item.done);
}

// Local throughout: 09:00 means 09:00 where the user is.
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
