import { DayGroup, DayGroupEntry, DayGroupLabel, DayKey, Item, Priority, Settings, State, Theme, TimeOfDay, Width } from './types.ts';

export const STORAGE_KEY = 'checklist.v1';

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

// `theme` is deliberately NOT in here: it predates this object, and moving it
// would reset the saved theme for every existing user.
export const DEFAULT_SETTINGS: Settings = {
  width: WIDTH.COMPACT,
  reminder: {
    enabled: false,
    time: '09:00',
  },
};

// Storage returns `unknown`; this is the one place that walks it.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

export function loadState(): Promise<State> {
  return new Promise<State>((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.get([STORAGE_KEY], (result) => resolve(normalizeState(result && result[STORAGE_KEY])));
      return;
    }
    try {
      // JSON.parse(null) coerces at runtime but not in the type system.
      resolve(normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')));
    } catch (_) {
      resolve(normalizeState(null));
    }
  });
}

export function saveState(state: State): void {
  if (hasChromeStorage) {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// A time of day, not an instant -- same reasoning as dueDate, and exactly what
// <input type="time"> reads and writes.
export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

export function isPriority(value: unknown): value is Priority {
  return value === PRIORITY.LOW || value === PRIORITY.NORMAL || value === PRIORITY.HIGH;
}

// Always complete. Never spread a partial saved value into live state: a missing
// nested field reads as undefined exactly where it matters.
export function normalizeSettings(saved: unknown): Settings {
  const source = isRecord(saved) ? saved : {};
  const reminder = isRecord(source.reminder) ? source.reminder : {};
  return {
    width: source.width === WIDTH.WIDE ? WIDTH.WIDE : WIDTH.COMPACT,
    reminder: {
      enabled: !!reminder.enabled,
      time: isTimeOfDay(reminder.time) ? reminder.time : DEFAULT_SETTINGS.reminder.time,
    },
  };
}

// Accepts anything read back from storage and returns a usable state object.
export function normalizeState(saved: unknown): State {
  if (!isRecord(saved) || !Array.isArray(saved.items)) {
    return { items: [], theme: preferredTheme(), settings: normalizeSettings(null) };
  }
  return {
    items: saved.items.map((raw: unknown): Item => {
      const item = isRecord(raw) ? raw : {};
      // Clamped to the three real levels: a stored 7 used to survive and then
      // match no CSS rule and no menu entry.
      const priority = Number(item.priority);
      return {
        text: String(item.text ?? ''),
        done: !!item.done,
        priority: isPriority(priority) ? priority : PRIORITY.LOW,
        updatedAt: Number(item.updatedAt) || null,
        dueDate: isDayKey(item.dueDate) ? item.dueDate : null,
      };
    }),
    theme: saved.theme === THEME.DARK ? THEME.DARK : THEME.LIGHT,
    settings: normalizeSettings(saved.settings),
  };
}

// "!buy milk" -> a high-priority item. Returns null for empty input.
export function parseDraft(rawText: string): Item | null {
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
export function sortByPriority(items: Item[]): Item[] {
  const rank = (item: Item) => PRIORITY_ORDER.indexOf(item.priority);
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

export function countDone(items: Item[]): number {
  return items.filter((item) => item.done).length;
}

export function progressPercent(items: Item[]): number {
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
export function getHighPriorityItems(items: Item[]): Item[] {
  return items.filter((item) => item.priority === PRIORITY.HIGH && !item.done);
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

export function isAllDone(items: Item[]): boolean {
  return items.length > 0 && countDone(items) === items.length;
}

// Both halves of the mark-all toggle. Items already in the target state are
// returned untouched, so a no-op cannot move their timestamp.
export function setAllDone(items: Item[], done: boolean): Item[] {
  return items.map((item) => (item.done === done ? item : { ...item, done, updatedAt: Date.now() }));
}

// Moves the item at `from` so it lands before position `to`, where `to` is an
// index in the ORIGINAL array. Returns a new array; unchanged if it is a no-op.
export function moveItem(items: Item[], from: number, to: number): Item[] {
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

// Items predating updatedAt render blank rather than a made-up date.
export function formatDate(timestamp: number | null): string {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Every content or state change goes through here, so the displayed date cannot
// drift.
export function touchItem(item: Item): Item {
  item.updatedAt = Date.now();
  return item;
}

// --- days -------------------------------------------------------------
// Stored as "YYYY-MM-DD", not timestamps: an assigned day has no time
// component, and an instant would shift calendar day by timezone.

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_TOKEN_PATTERN = /(?:^|\s)@(\S+)/i;

// For values already known to be strings. Separate from isDayKey because DayKey
// aliases string, so the predicate narrows a failing already-string value to
// `never` -- which broke parseDayInput.
function matchesDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value);
}

// For values off storage or the DOM, where the type really is unknown.
export function isDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && matchesDayKey(value);
}

export function toDayKey(date: Date): DayKey {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function shiftDayKey(key: DayKey, days: number): DayKey {
  const parts = key.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return toDayKey(new Date(year, month - 1, day + days));
}

export function formatDayKey(key: string): string {
  if (!isDayKey(key)) {
    return '';
  }
  // isDayKey has matched, so all three parts exist; the defaults only satisfy
  // the compiler.
  const [year = '', month = '', day = ''] = key.split('-');
  return `${day}/${month}/${year}`;
}

// Row-width: the year is almost always the current one and costs space.
export function formatDayKeyShort(key: string): string {
  if (!isDayKey(key)) {
    return '';
  }
  const [, month = '', day = ''] = key.split('-');
  return `${day}/${month}`;
}

// Words read faster than dates when scanning for what to do now.
export function dayGroupLabel(key: DayKey | null, reference: DayKey = todayKey()): DayGroupLabel {
  if (!isDayKey(key)) {
    return 'UNSCHEDULED';
  }
  if (key === reference) {
    return 'TODAY';
  }
  if (key === shiftDayKey(reference, 1)) {
    return 'TOMORROW';
  }
  if (key === shiftDayKey(reference, -1)) {
    return 'YESTERDAY';
  }
  return key < reference ? 'OVERDUE' : 'UPCOMING';
}

// Accepts "today", "tomorrow", "yesterday", "DD/MM" and "DD/MM/YYYY".
export function parseDayInput(value: unknown): DayKey | null {
  const text = String(value).trim().toLowerCase();
  if (!text) {
    return null;
  }
  if (text === 'today') {
    return todayKey();
  }
  if (text === 'tomorrow') {
    return shiftDayKey(todayKey(), 1);
  }
  if (text === 'yesterday') {
    return shiftDayKey(todayKey(), -1);
  }
  if (matchesDayKey(text)) {
    return text;
  }

  const parts = text.split(/[/.-]/);
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = parts.length === 3 ? Number(parts[2]) : new Date().getFullYear();
  if (!day || !month || !year || month > 12 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  // Rejects impossible dates like 31/02, which Date silently rolls forward.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return toDayKey(date);
}

// Pulls an "@day" token out of the draft text, returning the text without it.
export function extractDayToken(text: string): { text: string; dueDate: DayKey | null } {
  const match = text.match(DAY_TOKEN_PATTERN);
  if (!match) {
    return { text, dueDate: null };
  }

  const dueDate = parseDayInput(match[1]);
  if (!dueDate) {
    return { text, dueDate: null };
  }
  return { text: text.replace(match[0], ' ').replace(/\s+/g, ' ').trim(), dueDate };
}

// Section order. Today leads because it is the one section you always want
// without scrolling; OVERDUE sits directly under it rather than being buried.
const RANK = { TODAY: 0, OVERDUE: 1, UPCOMING: 2, UNSCHEDULED: 3 } as const;

function groupRank(key: string, reference: DayKey): number {
  if (!key) {
    return RANK.UNSCHEDULED;
  }
  if (key === reference) {
    return RANK.TODAY;
  }
  return key < reference ? RANK.OVERDUE : RANK.UPCOMING;
}

// Keeps each item's index into the original array: row handlers address
// state.items by index.
export function groupByDay(items: Item[], reference: DayKey = todayKey()): DayGroup[] {
  const groups = new Map<string, DayGroupEntry[]>();

  items.forEach((item, index) => {
    const key = isDayKey(item.dueDate) ? item.dueDate : '';
    let entries = groups.get(key);
    if (!entries) {
      entries = [];
      groups.set(key, entries);
    }
    entries.push({ item, index });
  });

  return [...groups.entries()]
    .map(([key, entries]) => ({
      key,
      label: dayGroupLabel(key || null, reference),
      date: formatDayKey(key),
      entries,
      done: entries.filter(({ item }) => item.done).length,
    }))
    .sort((a, b) => {
      const byRank = groupRank(a.key, reference) - groupRank(b.key, reference);
      if (byRank !== 0) {
        return byRank;
      }
      if (a.key === b.key) {
        return 0;
      }
      // Soonest first, except in OVERDUE where the most recently missed day is
      // the one you are likeliest to act on.
      const ascending = a.key < b.key ? -1 : 1;
      return groupRank(a.key, reference) === RANK.OVERDUE ? -ascending : ascending;
    });
}
