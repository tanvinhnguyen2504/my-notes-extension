import { DayKey, Task } from './types';
import { DayGroup, DayGroupEntry, DayGroupLabel } from './types/day';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_TOKEN_PATTERN = /(?:^|\s)@(\S+)/i;

export function formatDate(timestamp: number | null): string {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// --- days -------------------------------------------------------------
// "YYYY-MM-DD", not timestamps: an instant would shift calendar day by timezone.

// Separate from isDayKey: DayKey aliases string, so that predicate narrows a
// failing already-string value to `never`.
function matchesDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value);
}

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
  // isDayKey matched, so the defaults only satisfy the compiler.
  const [year = '', month = '', day = ''] = key.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDayKeyShort(key: string): string {
  if (!isDayKey(key)) {
    return '';
  }
  const [, month = '', day = ''] = key.split('-');
  return `${day}/${month}`;
}

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

// Accepts "today", "tomorrow", "yesterday", "DD/MM", "DD/MM/YYYY".
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
  // Rejects 31/02, which Date silently rolls forward.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return toDayKey(date);
}

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

// Keeps each item's original index: row handlers address state.tasks by index.
export function groupByDay(items: Task[], reference: DayKey = todayKey()): DayGroup[] {
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
      // Soonest first, except OVERDUE which runs most-recently-missed first.
      const ascending = a.key < b.key ? -1 : 1;
      return groupRank(a.key, reference) === RANK.OVERDUE ? -ascending : ascending;
    });
}
