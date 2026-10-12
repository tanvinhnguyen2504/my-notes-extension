import { Task } from '@/src/core/types';
import { isDayKey } from '@/src/core/day_utils';
import { PRIORITY, isPriority, isRecord, newId } from '@/src/core/utils';
import { readDataByKeyFromStorage, writeKey } from './local';

export const TASKS_KEY = 'tasks.v1';

export function normalizeTasks(saved: unknown): Task[] {
  if (!Array.isArray(saved)) {
    return [];
  }
  return saved.map((raw: unknown): Task => {
    const task = isRecord(raw) ? raw : {};
    // Clamped: a stored 7 would match no CSS rule and no menu entry.
    const priority = Number(task.priority);
    return {
      // Only when absent: a fresh id on every load remounts every row.
      id: typeof task.id === 'string' && task.id ? task.id : newId(),
      text: String(task.text ?? ''),
      done: !!task.done,
      priority: isPriority(priority) ? priority : PRIORITY.LOW,
      updatedAt: Number(task.updatedAt) || null,
      dueDate: isDayKey(task.dueDate) ? task.dueDate : null,
    };
  });
}

export function loadTasks(): Promise<Task[]> {
  return readDataByKeyFromStorage(TASKS_KEY, normalizeTasks);
}

export function saveTasks(tasks: Task[]): void {
  writeKey(TASKS_KEY, tasks);
}
