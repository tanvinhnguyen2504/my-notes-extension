// The popup. Owns the reducer, the storage subscription, and the view state
// that must never be persisted (which row is editing, whether settings is open).

import { useEffect, useReducer, useRef, useState } from 'react';
import { Action, reducer } from '../core/reducer.ts';
import { DayKey } from '../core/types.ts';
import { downloadCsv } from '../features/export.ts';
import { useDragDrop } from '../hooks/useDragDrop.ts';
import { groupByDay } from '../core/day_utils.ts';
import { progressPercent } from '../core/utils.ts';
import { SETTINGS_KEY, normalizeSettings } from '../storages/settings.ts';
import { emptyState, loadState, persistChanged } from '../storages/state.ts';
import { TASKS_KEY, normalizeTasks } from '../storages/tasks.ts';
import { Compose } from './Compose.tsx';
import { DayGroupSection } from './DayGroupSection.tsx';
import { EmptyState } from './EmptyState.tsx';
import { Header } from './Header.tsx';
import { PopupRow } from './PopupRow.tsx';
import { Progress } from './Progress.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';

export function PopupPage(): React.JSX.Element {
  const [state, rawDispatch] = useReducer(reducer, null, () => {
    return emptyState();
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // The reducer is pure, so `dispatch` can compute what to persist rather than
  // waiting for the next render. Persisting stays explicit rather than
  // reactive: REPLACE_STATE carries state that just arrived FROM storage, and
  // an effect saving on every change would write it straight back -- which,
  // with background.ts re-syncing the alarm on every write, is a loop.
  //
  // Returns whether anything changed, because a no-op returns the same state
  // and some callers need to know (an add that parsed to nothing, say).
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = (action: Action): boolean => {
    const current = stateRef.current;
    const next = reducer(current, action);
    if (next === current) {
      return false;
    }
    stateRef.current = next;
    rawDispatch(action);
    if (action.type !== 'REPLACE_STATE') {
      // Only changed slices: a settings toggle no longer rewrites `tasks`.
      persistChanged(current, next);
    }
    return true;
  };

  useEffect(() => {
    loadState().then((saved) => {
      dispatch({ type: 'REPLACE_STATE', state: saved });
    });
    // Deliberately once, on mount.
  }, []);

  // The reminder window writes the tasks key. Without this, a tick there is
  // undone by the popup's next save. Replacing only the arrived slice keeps the
  // other references intact, so persistChanged stays accurate.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return;
    }
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      if (area !== 'local') {
        return;
      }
      const current = stateRef.current;
      const tasksChange = changes[TASKS_KEY];
      const settingsChange = changes[SETTINGS_KEY];
      if (!tasksChange && !settingsChange) {
        return;
      }
      const incoming = {
        ...current,
        tasks: tasksChange ? normalizeTasks(tasksChange.newValue) : current.tasks,
        settings: settingsChange ? normalizeSettings(settingsChange.newValue) : current.settings,
      };
      // Fires for this popup's own writes too, and re-rendering would destroy
      // an open editor for nothing.
      if (JSON.stringify(incoming) === JSON.stringify(current)) {
        return;
      }
      dispatch({ type: 'REPLACE_STATE', state: incoming });
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  // Both appearance preferences are attributes on <html>, outside the React
  // root -- a contract with styles.css.
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.width = state.settings.width;
  }, [state.settings.theme, state.settings.width]);

  const { rowProps, groupProps } = useDragDrop({
    onRowDrop: ({ from, to, dayKey }) => {
      dispatch({ type: 'SET_DAY', index: from, dayKey });
      dispatch({ type: 'MOVE_ITEM', from, to });
    },
    onGroupDrop: ({ from, dayKey }) => {
      dispatch({ type: 'SET_DAY', index: from, dayKey });
    },
  });

  const groups = groupByDay(state.tasks);

  return (
    <>
      <Header
        state={state}
        onMarkAll={() => {
          dispatch({ type: 'MARK_ALL' });
        }}
        onClearAll={() => {
          dispatch({ type: 'CLEAR_ALL' });
        }}
        onExport={() => {
          downloadCsv(state.tasks);
        }}
        settings={
          <SettingsPanel
            state={state}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onToggleTheme={() => {
              dispatch({ type: 'SET_THEME' });
            }}
            onToggleWidth={() => {
              dispatch({ type: 'SET_WIDTH' });
            }}
            onToggleReminder={() => {
              dispatch({ type: 'SET_REMINDER_ENABLED' });
            }}
            onPickReminderTime={(time) => {
              dispatch({ type: 'SET_REMINDER_TIME', time });
            }}
          />
        }
      />

      <Progress percent={progressPercent(state.tasks)} />

      {/* min-h-0 is what actually lets a flex child shrink below its content
          and scroll; flex-1 alone is not enough. The sticky group headers key
          off this element being the scroll container. */}
      <main id="list" className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-[4px]">
        {state.tasks.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((group) => {
            const dayKey: DayKey | null = group.key || null;
            return (
              <DayGroupSection key={group.key} group={group} headProps={groupProps(dayKey)}>
                {group.entries.map(({ item, index }) => {
                  return (
                    <PopupRow
                      key={item.id}
                      item={item}
                      index={index}
                      dayKey={dayKey}
                      editing={editingId === item.id}
                      onStartEditing={() => {
                        setEditingId(item.id);
                      }}
                      onStopEditing={() => {
                        setEditingId(null);
                      }}
                      onToggle={() => {
                        dispatch({ type: 'TOGGLE_DONE', index });
                      }}
                      onDelete={() => {
                        dispatch({ type: 'DELETE_ITEM', index });
                      }}
                      onRename={(text) => {
                        dispatch({ type: 'RENAME_ITEM', index, text });
                      }}
                      onSetPriority={(priority) => {
                        dispatch({ type: 'SET_PRIORITY', index, priority });
                      }}
                      onSetDay={(key) => {
                        dispatch({ type: 'SET_DAY', index, dayKey: key });
                      }}
                      dragHandlers={rowProps(index, dayKey)}
                    />
                  );
                })}
              </DayGroupSection>
            );
          })
        )}
      </main>

      <Compose
        autoFocus
        onAdd={(text) => {
          return dispatch({ type: 'ADD_ITEM', text });
        }}
      />
    </>
  );
}
