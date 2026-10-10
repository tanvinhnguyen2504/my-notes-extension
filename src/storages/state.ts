// Assembles the slices into one State, and writes back only what changed.

import { State } from '../core/types.ts';
import { loadMemos, saveMemos } from './memo.ts';
import { loadSettings, normalizeSettings, saveSettings } from './settings.ts';
import { loadTasks, saveTasks } from './tasks.ts';

// First-frame placeholder, before loadState() resolves.
export function emptyState(): State {
  return { tasks: [], settings: normalizeSettings(null), memos: [] };
}

export async function loadState(): Promise<State> {
  // Independent keys, so these are genuinely parallel.
  const [tasks, settings, memos] = await Promise.all([loadTasks(), loadSettings(), loadMemos()]);
  return { tasks, settings, memos };
}

// The reducer returns a NEW reference for a slice it changed and the SAME one
// otherwise, which makes this comparison exact rather than merely fast. This is
// the point of three keys: saving settings cannot clobber a task tick.
export function persistChanged(previous: State, next: State): void {
  if (next.tasks !== previous.tasks) {
    saveTasks(next.tasks);
  }
  if (next.settings !== previous.settings) {
    saveSettings(next.settings);
  }
  if (next.memos !== previous.memos) {
    saveMemos(next.memos);
  }
}
