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

export interface Item {
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

export interface Settings {
  width: Width;
  reminder: ReminderSettings;
}

// `theme` sits outside `settings` because it predates it; moving it in would
// reset the saved theme for every existing user.
export interface State {
  items: Item[];
  theme: Theme;
  settings: Settings;
}

export type DayGroupLabel = 'TODAY' | 'TOMORROW' | 'YESTERDAY' | 'OVERDUE' | 'UPCOMING' | 'UNSCHEDULED';

// Entries keep their index into the original array: row handlers address
// state.items by index.
export interface DayGroupEntry {
  item: Item;
  index: number;
}

export interface DayGroup {
  // The day key, or "" for the unscheduled group.
  key: string;
  label: DayGroupLabel;
  date: string;
  entries: DayGroupEntry[];
  done: number;
}
