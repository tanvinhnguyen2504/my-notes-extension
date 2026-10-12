// Every case returns a NEW state, array and item where it changes one -- a
// mutated-in-place item is a row that silently refuses to update. No-op actions
// return the SAME reference, so callers skip a save and a render by identity.

import { touchMemo } from './memo_utils';
import { Task, Priority, PopupMode, State, TimeOfDay } from './types';
import { IMemo } from './types/memos';
import { clampWideWidth, isAllDone, isTimeOfDay, moveItem, nextWidth, parseDraft, setAllDone, sortByPriority, switchTheme } from './utils';

export type Action =
  | { type: 'ADD_ITEM'; text: string }
  | { type: 'DELETE_ITEM'; index: number }
  | { type: 'TOGGLE_DONE'; index: number }
  | { type: 'RENAME_ITEM'; index: number; text: string }
  | { type: 'SET_PRIORITY'; index: number; priority: Priority }
  | { type: 'SET_DAY'; index: number; dayKey: string | null }
  | { type: 'MOVE_ITEM'; from: number; to: number }
  | { type: 'MARK_ALL' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_THEME' }
  | { type: 'SET_WIDTH' }
  | { type: 'SET_WIDE_WIDTH'; width: number }
  | { type: 'SET_REMINDER_ENABLED' }
  | { type: 'SET_REMINDER_TIME'; time: TimeOfDay }
  | { type: 'SET_MODE'; mode: PopupMode }
  | { type: 'ADD_MEMO'; memo: IMemo }
  | { type: 'UPDATE_MEMO'; id: string; changes: Partial<Omit<IMemo, 'id'>> }
  | { type: 'DELETE_MEMO'; id: string }
  | { type: 'TOGGLE_MEMO_PIN'; id: string }
  | { type: 'COUNT_MEMO_COPY'; id: string }
  | { type: 'REPLACE_STATE'; state: State };

function replaceItem(items: Task[], index: number, change: (item: Task) => Task): Task[] {
  const item = items[index];
  if (!item) {
    return items;
  }
  const next = items.slice();
  next[index] = { ...change(item), updatedAt: Date.now() };
  return next;
}

function replaceMemo(memos: IMemo[], id: string, change: (memo: IMemo) => IMemo): IMemo[] {
  const index = memos.findIndex((memo) => {
    return memo.id === id;
  });
  const memo = memos[index];
  if (!memo) {
    return memos;
  }
  const next = memos.slice();
  next[index] = touchMemo(change(memo));
  return next;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEM': {
      const item = parseDraft(action.text);
      if (!item) {
        return state;
      }
      return { ...state, tasks: [...state.tasks, item] };
    }

    case 'DELETE_ITEM': {
      if (!state.tasks[action.index]) {
        return state;
      }
      return {
        ...state,
        tasks: state.tasks.filter((_, index) => {
          return index !== action.index;
        }),
      };
    }

    case 'TOGGLE_DONE': {
      const items = replaceItem(state.tasks, action.index, (item) => {
        return { ...item, done: !item.done };
      });
      if (items === state.tasks) {
        return state;
      }
      return { ...state, tasks: items };
    }

    case 'RENAME_ITEM': {
      const item = state.tasks[action.index];
      const text = action.text.trim();
      if (!item || !text || text === item.text) {
        return state;
      }
      return {
        ...state,
        tasks: replaceItem(state.tasks, action.index, (current) => {
          return { ...current, text };
        }),
      };
    }

    case 'SET_PRIORITY': {
      const item = state.tasks[action.index];
      if (!item || item.priority === action.priority) {
        return state;
      }
      const stamped = replaceItem(state.tasks, action.index, (current) => {
        return { ...current, priority: action.priority };
      });
      return { ...state, tasks: sortByPriority(stamped) };
    }

    case 'SET_DAY': {
      const item = state.tasks[action.index];
      // An unscheduled item stores null; a cleared date input reports "".
      if (!item || (item.dueDate || null) === (action.dayKey || null)) {
        return state;
      }
      return {
        ...state,
        tasks: replaceItem(state.tasks, action.index, (current) => {
          return { ...current, dueDate: action.dayKey || null };
        }),
      };
    }

    case 'MOVE_ITEM': {
      const items = moveItem(state.tasks, action.from, action.to);
      if (items === state.tasks) {
        return state;
      }
      return { ...state, tasks: items };
    }

    case 'MARK_ALL': {
      return { ...state, tasks: setAllDone(state.tasks, !isAllDone(state.tasks)) };
    }

    case 'CLEAR_ALL': {
      if (!state.tasks.length) {
        return state;
      }
      return { ...state, tasks: [] };
    }

    case 'SET_THEME': {
      return { ...state, settings: { ...state.settings, theme: switchTheme(state.settings.theme) } };
    }

    case 'SET_WIDTH': {
      return { ...state, settings: { ...state.settings, width: nextWidth(state.settings.width) } };
    }

    case 'SET_WIDE_WIDTH': {
      const wideWidth = clampWideWidth(action.width);
      if (wideWidth === state.settings.wideWidth) {
        return state;
      }
      return { ...state, settings: { ...state.settings, wideWidth } };
    }

    case 'SET_REMINDER_ENABLED': {
      return {
        ...state,
        settings: {
          ...state.settings,
          reminder: { ...state.settings.reminder, enabled: !state.settings.reminder.enabled },
        },
      };
    }

    case 'SET_REMINDER_TIME': {
      if (!isTimeOfDay(action.time) || action.time === state.settings.reminder.time) {
        return state;
      }
      return {
        ...state,
        settings: {
          ...state.settings,
          reminder: { ...state.settings.reminder, time: action.time },
        },
      };
    }

    case 'SET_MODE': {
      if (action.mode === state.settings.mode) {
        return state;
      }
      return { ...state, settings: { ...state.settings, mode: action.mode } };
    }

    case 'ADD_MEMO': {
      if (!action.memo.content.trim()) {
        return state;
      }
      return { ...state, memos: [...state.memos, touchMemo(action.memo)] };
    }

    case 'UPDATE_MEMO': {
      const memos = replaceMemo(state.memos, action.id, (memo) => {
        return { ...memo, ...action.changes };
      });
      if (memos === state.memos) {
        return state;
      }
      return { ...state, memos };
    }

    case 'DELETE_MEMO': {
      const memos = state.memos.filter((memo) => {
        return memo.id !== action.id;
      });
      if (memos.length === state.memos.length) {
        return state;
      }
      return { ...state, memos };
    }

    case 'TOGGLE_MEMO_PIN': {
      const memos = replaceMemo(state.memos, action.id, (memo) => {
        return { ...memo, isPinned: !memo.isPinned };
      });
      if (memos === state.memos) {
        return state;
      }
      return { ...state, memos };
    }

    case 'COUNT_MEMO_COPY': {
      const memos = replaceMemo(state.memos, action.id, (memo) => {
        return { ...memo, uses: memo.uses + 1 };
      });
      if (memos === state.memos) {
        return state;
      }
      return { ...state, memos };
    }
    case 'REPLACE_STATE': {
      return action.state;
    }
  }
}
