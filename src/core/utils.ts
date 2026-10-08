import type {
  DayGroup,
  DayGroupEntry,
  DayGroupLabel,
  DayKey,
  Item,
  Priority,
  Settings,
  State,
  Theme,
  TimeOfDay,
  Width,
} from "./types.ts";

export const STORAGE_KEY = "checklist.v1";

export const PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
} as const;

export const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;

export const WIDTH = {
  COMPACT: "compact",
  WIDE: "wide",
} as const;

// Preferences that are not part of the list itself. `theme` is deliberately NOT
// in here: it predates this object, and moving it would reset the saved theme
// for everyone already using the extension.
export const DEFAULT_SETTINGS: Settings = {
  width: WIDTH.COMPACT,
  reminder: {
    enabled: false,
    time: "09:00",
  },
};

// Anything read back from storage arrives as `unknown`. This is the one place
// that walks it, so the narrowing lives here rather than at every field access.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const hasChromeStorage =
  typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;

export function loadState(): Promise<State> {
  return new Promise<State>((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.get([STORAGE_KEY], (result) =>
        resolve(normalizeState(result && result[STORAGE_KEY]))
      );
      return;
    }
    try {
      // getItem returns null when unset, and JSON.parse(null) coerces to
      // "null" at runtime but not in the type system -- hence the ?? "null".
      resolve(normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")));
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

// A reminder time is a local "HH:MM" string for the same reason dueDate is a day
// key: it is a time of day, not an instant, and <input type="time"> reads and
// writes exactly this format.
export function isTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function isPriority(value: unknown): value is Priority {
  return value === PRIORITY.LOW || value === PRIORITY.NORMAL || value === PRIORITY.HIGH;
}

// Always returns a complete settings object. Callers must never spread a partial
// saved value into live state -- a half-populated `reminder` would read as
// undefined at the point it matters and fail silently.
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
      // Validated against the three real levels rather than taken as any
      // number: a stored 7 used to survive as 7 and then match no CSS rule and
      // no menu entry. This is the gate that was supposed to catch that.
      const priority = Number(item.priority);
      return {
        text: String(item.text ?? ""),
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
  const isHighPriority = withoutDay.startsWith("!");
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
export const PRIORITY_ORDER = [
  PRIORITY.HIGH,
  PRIORITY.NORMAL,
  PRIORITY.LOW,
] as const;

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITY.HIGH]: "HIGH",
  [PRIORITY.NORMAL]: "MEDIUM",
  [PRIORITY.LOW]: "LOW",
};

// Orders the list HIGH -> MEDIUM -> LOW. Ranked through PRIORITY_ORDER rather than
// the raw constants, so the list order and the menu order cannot drift apart and
// the sort does not quietly depend on HIGH being the largest number.
//
// Array.prototype.sort is stable, which is the property that matters here: tasks
// of equal priority keep the order the user put them in. It is also why this needs
// no per-group logic -- groupByDay orders the *sections* by day and renders each
// section's items in array order, so one sort of the flat array leaves every group
// internally priority-ordered.
//
// Returns a new array, like moveItem() and setAllDone(). Stamps nothing: this
// changes list position, not the items.
export function sortByPriority(items: Item[]): Item[] {
  const rank = (item: Item) => PRIORITY_ORDER.indexOf(item.priority);
  return [...items].sort((a, b) => rank(a) - rank(b));
}

export function nextTheme(theme: Theme): Theme {
  return theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT;
}

export function nextWidth(width: Width): Width {
  return width === WIDTH.WIDE ? WIDTH.COMPACT : WIDTH.WIDE;
}

// The `typeof window` guard is load-bearing: background.ts imports this module,
// and a service worker has no window at all. Without it, normalizeState() throws
// a ReferenceError inside the worker on the empty-storage path.
//
// Note that the compiler cannot help here. tsconfig includes lib DOM, so `window`
// type-checks in this file regardless -- the guard is the only thing standing
// between this module and a silent worker failure.
export function preferredTheme(): Theme {
  const prefersDark =
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
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

// Leading-edge debounce: runs fn on the first call, then ignores further calls
// until `wait` ms of quiet have passed. Leading rather than trailing because
// callers here read live DOM values -- deferring the call would read the input
// as it is later, not as it was when the user acted.
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
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

// What the reminder is for: work that is flagged HIGH and still outstanding.
// Anything done no longer needs reminding about.
export function getHighPriorityItems(items: Item[]): Item[] {
  return items.filter((item) => item.priority === PRIORITY.HIGH && !item.done);
}

// Epoch ms of the next time the clock reads `time` ("HH:MM"). Today if that is
// still ahead, otherwise tomorrow. Local time throughout -- a reminder at 09:00
// means 09:00 where the user is, which is the same reasoning that makes dueDate a
// day key rather than a timestamp.
export function nextReminderTime(time: TimeOfDay, from: Date = new Date()): number {
  // Read by index rather than destructured: under noUncheckedIndexedAccess a
  // destructured element is `number | undefined`, and defaulting it would change
  // what a malformed time does. Number(undefined) is NaN, which is exactly what
  // the untyped version produced.
  const parts = time.split(":");
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

// Drives both halves of the mark-all / unmark-all toggle. Items already in the
// target state are returned untouched so a no-op cannot move their timestamp.
export function setAllDone(items: Item[], done: boolean): Item[] {
  return items.map((item) =>
    item.done === done ? item : { ...item, done, updatedAt: Date.now() }
  );
}

// Moves the item at `from` so it lands before position `to`, where `to` is an
// index in the ORIGINAL array. Returns a new array; unchanged if it is a no-op.
export function moveItem(items: Item[], from: number, to: number): Item[] {
  if (from < 0 || from >= items.length) {
    return items
  };
  if (to < 0 || to > items.length) {
    return items
  };
  if (to === from || to === from + 1) {
    return items
  };

  const next = items.slice();
  const moved = next.splice(from, 1)[0];
  // Unreachable: the bounds check above guarantees the splice removed an item.
  // Stated as a guard rather than a non-null assertion so it stays true if the
  // bounds check is ever changed.
  if (moved === undefined) {
    return items;
  }
  next.splice(to > from ? to - 1 : to, 0, moved);
  return next;
}

// Items saved before timestamps existed have no updatedAt; they render blank
// rather than claiming a made-up date.
export function formatDate(timestamp: number | null): string {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Records an edit to an item in place. Every content or state change goes
// through here so the displayed date cannot drift from reality.
export function touchItem(item: Item): Item {
  item.updatedAt = Date.now();
  return item;
}

// --- days -------------------------------------------------------------
// Days are stored as "YYYY-MM-DD" strings, not timestamps. A timestamp is a
// point in time and would land on a different calendar day depending on the
// reader's timezone; an assigned day has no time component at all.

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_TOKEN_PATTERN = /(?:^|\s)@(\S+)/i;

// Shape check for a value already known to be a string. Separate from isDayKey
// because DayKey is an alias for string: as a type predicate, isDayKey narrows
// the *failing* branch of an already-string value to `never`, which breaks any
// caller that keeps using the value after the check -- see parseDayInput.
function matchesDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value);
}

// For values off storage or the DOM, where the type really is unknown.
export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && matchesDayKey(value);
}

export function toDayKey(date: Date): DayKey {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function shiftDayKey(key: DayKey, days: number): DayKey {
  const parts = key.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return toDayKey(new Date(year, month - 1, day + days));
}

export function formatDayKey(key: string): string {
  if (!isDayKey(key)) {
    return "";
  }
  // isDayKey has already matched /^\d{4}-\d{2}-\d{2}$/, so all three parts
  // exist; the defaults are unreachable and only satisfy the compiler.
  const [year = "", month = "", day = ""] = key.split("-");
  return `${day}/${month}/${year}`;
}

// Row-width version of formatDayKey: the year is almost always the current one
// and the row has no space to spend restating it.
export function formatDayKeyShort(key: string): string {
  if (!isDayKey(key)) {
    return "";
  }
  const [, month = "", day = ""] = key.split("-");
  return `${day}/${month}`;
}

// "TODAY" / "TOMORROW" / "YESTERDAY" / "OVERDUE" read faster than a bare date
// when you are scanning for what to do now.
export function dayGroupLabel(
  key: DayKey | null,
  reference: DayKey = todayKey()
): DayGroupLabel {
  if (!isDayKey(key)) {
    return "UNSCHEDULED";
  }
  if (key === reference) {
    return "TODAY";
  }
  if (key === shiftDayKey(reference, 1)) {
    return "TOMORROW";
  }
  if (key === shiftDayKey(reference, -1)) {
    return "YESTERDAY";
  }
  return key < reference ? "OVERDUE" : "UPCOMING";
}

// Accepts "today", "tomorrow", "yesterday", "DD/MM" and "DD/MM/YYYY".
export function parseDayInput(value: unknown): DayKey | null {
  const text = String(value).trim().toLowerCase();
  if (!text) {
    return null;
  }
  if (text === "today") {
    return todayKey();
  }
  if (text === "tomorrow") {
    return shiftDayKey(todayKey(), 1);
  }
  if (text === "yesterday") {
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
  return { text: text.replace(match[0], " ").replace(/\s+/g, " ").trim(), dueDate };
}

// Section order, top to bottom. Today leads because it is the only section you
// almost always want to see without scrolling; a missed day still needs acting
// on, so OVERDUE sits directly under it rather than being buried.
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

// Groups items for display while keeping each item's index into the original
// array, because every row handler addresses state.items by index.
export function groupByDay(items: Item[], reference: DayKey = todayKey()): DayGroup[] {
  const groups = new Map<string, DayGroupEntry[]>();

  items.forEach((item, index) => {
    const key = isDayKey(item.dueDate) ? item.dueDate : "";
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
      // Soonest first, except inside OVERDUE where the most recently missed day
      // is the one you are most likely to still act on.
      const ascending = a.key < b.key ? -1 : 1;
      return groupRank(a.key, reference) === RANK.OVERDUE ? -ascending : ascending;
    });
}
