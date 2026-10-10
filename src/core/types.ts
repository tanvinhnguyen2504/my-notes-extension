// Unions are derived from utils.ts's const objects rather than restated, so
// PRIORITY.* stays the only way to name a level.
import { PRIORITY, THEME, WIDTH } from './utils.ts';

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];
export type Theme = (typeof THEME)[keyof typeof THEME];
export type Width = (typeof WIDTH)[keyof typeof WIDTH];

// "YYYY-MM-DD". A plain alias, not branded: a brand would force a cast at every
// <input type="date"> read, and isDayKey() already enforces the shape.
export type DayKey = string;

// Local "HH:MM", validated by isTimeOfDay(). Same reasoning.
export type TimeOfDay = string;

export interface Task {
  // Backfilled by normalizeTasks. A React key, NOT an addressing scheme --
  // handlers, groupByDay and moveItem all still work in array indices.
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  updatedAt: number | null;
  // null only for legacy items or a drop on UNSCHEDULED.
  dueDate: DayKey | null;
}

export interface ReminderSettings {
  enabled: boolean;
  time: TimeOfDay;
}

// `theme` lives here, not beside `settings`.
export interface Settings {
  theme: Theme;
  width: Width;
  reminder: ReminderSettings;
}

// Reserved for a future feature. Persisted, but nothing reads or writes one;
// the shape is provisional.
export interface Memo {
  id: string;
  text: string;
  updatedAt: number | null;
}

// One storage key per slice, so a write to one cannot clobber another.
export interface State {
  tasks: Task[];
  settings: Settings;
  memos: Memo[];
}
