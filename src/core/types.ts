import { EnglishItem } from './types/english';
import { IMemo } from './types/memos';
import { PRIORITY, THEME, WIDTH } from './utils';

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];
export type Theme = (typeof THEME)[keyof typeof THEME];
export type Width = (typeof WIDTH)[keyof typeof WIDTH];

// Not branded: a brand would force a cast at every <input type="date"> read.
export type DayKey = string;

export type TimeOfDay = string;

export interface Task {
  // A React key, NOT an addressing scheme: tasks are addressed by index.
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  updatedAt: number | null;
  dueDate: DayKey | null;
}

export interface ReminderSettings {
  enabled: boolean;
  time: TimeOfDay;
}

// A view preference, so it sits beside `theme` rather than taking a fourth key.
export type PopupMode = 'tasks' | 'memos' | 'english';

export interface Settings {
  theme: Theme;
  width: Width;
  wideWidth: number;
  mode: PopupMode;
  reminder: ReminderSettings;
}

export interface State {
  tasks: Task[];
  settings: Settings;
  memos: IMemo[];
  english: EnglishItem[];
}
