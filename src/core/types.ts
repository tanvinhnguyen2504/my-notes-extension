// The shapes that were previously only described in CLAUDE.md.
//
// The literal unions are derived from the const objects in utils.ts rather than
// restated here, so there is one source of truth and PRIORITY.* stays the only
// way to name a level. Those imports are `import type`, which erases completely
// -- there is no runtime cycle between this file and utils.ts.
import type { PRIORITY, THEME, WIDTH } from "./utils.ts";

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];
export type Theme = (typeof THEME)[keyof typeof THEME];
export type Width = (typeof WIDTH)[keyof typeof WIDTH];

// A "YYYY-MM-DD" day key. Deliberately a plain alias and not a branded type: a
// brand would force a cast at every <input type="date"> read, which is most of
// the call sites, and isDayKey() already does the enforcing. The alias is here
// to make signatures self-describing.
export type DayKey = string;

// A local "HH:MM" time of day, validated by isTimeOfDay(). Same reasoning.
export type TimeOfDay = string;

export interface Item {
  text: string;
  done: boolean;
  priority: Priority;
  // Epoch ms, or null for items that predate the field. normalizeState() does
  // not backfill it -- a missing stamp renders blank rather than claiming a date.
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

// `theme` sits alongside `settings` rather than inside it because it predates
// that object; moving it in would reset the saved theme for every existing user.
export interface State {
  items: Item[];
  theme: Theme;
  settings: Settings;
}

export type DayGroupLabel =
  | "TODAY"
  | "TOMORROW"
  | "YESTERDAY"
  | "OVERDUE"
  | "UPCOMING"
  | "UNSCHEDULED";

// Each entry keeps the item's index into the original array, because every row
// handler addresses state.items by index.
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
