// The single place state changes. Pure, DOM-free, and composed entirely from
// the transforms in utils.ts -- it adds no logic of its own, it just gives the
// existing transforms one entry point.
//
// Every case returns a NEW state, items array and item object where it changes
// one. The imperative renderer cannot tell the difference, but React can: a
// mutated-in-place item is a row that silently refuses to update.
//
// No-op actions return the SAME state reference, so a caller can skip a save
// and a render by identity.
//
// View state is deliberately absent: whether the clear button is armed, which
// row is being edited, and whether the settings panel is open are not
// persisted and do not belong here.

import { Item, Priority, State, TimeOfDay } from './types.ts';
import { isAllDone, isTimeOfDay, moveItem, nextWidth, parseDraft, setAllDone, sortByPriority, switchTheme } from './utils.ts';

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
  | { type: 'SET_REMINDER_ENABLED' }
  | { type: 'SET_REMINDER_TIME'; time: TimeOfDay }
  | { type: 'REPLACE_STATE'; state: State };

// Replaces one item with the result of `change`, stamping it. Returns the same
// array when the index is out of range, which makes every index-addressed
// action a no-op rather than a throw -- the indices come from rendered rows, so
// this should be unreachable.
function replaceItem(items: Item[], index: number, change: (item: Item) => Item): Item[] {
  const item = items[index];
  if (!item) {
    return items;
  }
  const next = items.slice();
  next[index] = { ...change(item), updatedAt: Date.now() };
  return next;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEM': {
      const item = parseDraft(action.text);
      // parseDraft returns null for empty or whitespace-only input.
      if (!item) {
        return state;
      }
      return { ...state, items: [...state.items, item] };
    }

    case 'DELETE_ITEM': {
      if (!state.items[action.index]) {
        return state;
      }
      return {
        ...state,
        items: state.items.filter((_, index) => {
          return index !== action.index;
        }),
      };
    }

    case 'TOGGLE_DONE': {
      const items = replaceItem(state.items, action.index, (item) => {
        return { ...item, done: !item.done };
      });
      if (items === state.items) {
        return state;
      }
      return { ...state, items };
    }

    case 'RENAME_ITEM': {
      const item = state.items[action.index];
      const text = action.text.trim();
      // An emptied field is a cancel, not a delete, and renaming to the same
      // text should not move the modified stamp.
      if (!item || !text || text === item.text) {
        return state;
      }
      return {
        ...state,
        items: replaceItem(state.items, action.index, (current) => {
          return { ...current, text };
        }),
      };
    }

    case 'SET_PRIORITY': {
      const item = state.items[action.index];
      if (!item || item.priority === action.priority) {
        return state;
      }
      // Mutate, stamp, sort -- in that order. The resort invalidates the index
      // every row handler closed over, which the following render re-derives.
      const stamped = replaceItem(state.items, action.index, (current) => {
        return { ...current, priority: action.priority };
      });
      return { ...state, items: sortByPriority(stamped) };
    }

    case 'SET_DAY': {
      const item = state.items[action.index];
      // Comparing through `|| null` because an unscheduled item stores null and
      // a cleared date input reports "".
      if (!item || (item.dueDate || null) === (action.dayKey || null)) {
        return state;
      }
      return {
        ...state,
        items: replaceItem(state.items, action.index, (current) => {
          return { ...current, dueDate: action.dayKey || null };
        }),
      };
    }

    case 'MOVE_ITEM': {
      // moveItem returns the input array for every no-op, including
      // to === from and to === from + 1.
      const items = moveItem(state.items, action.from, action.to);
      if (items === state.items) {
        return state;
      }
      // Reordering changes list position, not items, so nothing is stamped.
      return { ...state, items };
    }

    case 'MARK_ALL': {
      return { ...state, items: setAllDone(state.items, !isAllDone(state.items)) };
    }

    case 'CLEAR_ALL': {
      if (!state.items.length) {
        return state;
      }
      return { ...state, items: [] };
    }

    case 'SET_THEME': {
      return { ...state, theme: switchTheme(state.theme) };
    }

    case 'SET_WIDTH': {
      return { ...state, settings: { ...state.settings, width: nextWidth(state.settings.width) } };
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
      // The control reports "" when cleared. Keep the last good time rather
      // than writing something the service worker cannot schedule.
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

    // The two wholesale replacements: loadState()'s .then and the
    // chrome.storage.onChanged listener. A caller must NOT persist this -- the
    // state it carries just came from storage, and writing it back loops
    // against background.ts re-syncing the alarm on every write.
    case 'REPLACE_STATE': {
      return action.state;
    }
  }
}
