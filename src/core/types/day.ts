import { Task } from '../types.ts';

export type DayGroupLabel = 'TODAY' | 'TOMORROW' | 'YESTERDAY' | 'OVERDUE' | 'UPCOMING' | 'UNSCHEDULED';

// Entries keep their index into the original array: row handlers address
// state.items by index.
export interface DayGroupEntry {
  item: Task;
  index: number;
}

export interface DayGroup {
  key: string;
  label: DayGroupLabel;
  date: string;
  entries: DayGroupEntry[];
  done: number;
}
