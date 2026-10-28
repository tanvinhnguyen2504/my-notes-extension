import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Action, reducer } from '@/src/core/reducer';
import { ENGLISH_KEY, normalizeEnglish } from '@/src/storages/english';
import { MEMOS_KEY, normalizeMemos } from '@/src/storages/memo';
import { SETTINGS_KEY, normalizeSettings } from '@/src/storages/settings';
import { emptyState, loadState, persistChanged } from '@/src/storages/state';
import { WIDE_WIDTH_PROPERTY, WIDTH, clampWideWidth } from '@/src/core/utils';
import { useWidthDrag } from '@/src/hooks/useWidthDrag';
import { TASKS_KEY, normalizeTasks } from '@/src/storages/tasks';
import { EnglishPage } from './EnglishPage';
import { HintMode, HintToast } from './HintToast';
import { MemosPage } from './MemoPage';
import { SettingDetailsPanel } from './SettingDetailsPanel';
import { CHIP_HOVER, CHIP_ICON } from './TaskHeader';
import { WidthGrip } from './WidthGrip';
import { Tab } from './Tab';
import { TasksPage } from './TasksPage';
import { PopupMode } from '../core/types';

// Radix unmounts the inactive panel, which is fine: no page owns storage.
const PANEL = 'flex-1 min-h-0 flex flex-col';

const HINT_MS = 8000;

export function PopupPage(): React.JSX.Element {
  const [state, rawDispatch] = useReducer(reducer, null, () => {
    return emptyState();
  });

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
      persistChanged(current, next);
    }
    return true;
  };

  useEffect(() => {
    loadState().then((saved) => {
      dispatch({ type: 'REPLACE_STATE', state: saved });
    });
  }, []);

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
      const memosChange = changes[MEMOS_KEY];
      const englishChange = changes[ENGLISH_KEY];
      if (!tasksChange && !settingsChange && !memosChange && !englishChange) {
        return;
      }
      const incoming = {
        ...current,
        tasks: tasksChange ? normalizeTasks(tasksChange.newValue) : current.tasks,
        settings: settingsChange ? normalizeSettings(settingsChange.newValue) : current.settings,
        memos: memosChange ? normalizeMemos(memosChange.newValue) : current.memos,
        english: englishChange ? normalizeEnglish(englishChange.newValue) : current.english,
      };
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

  // On <html>, not a wrapper: Radix portals menus to document.body.
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.width = state.settings.width;
    document.documentElement.style.setProperty(WIDE_WIDTH_PROPERTY, `${state.settings.wideWidth}px`);
  }, [state.settings.theme, state.settings.width, state.settings.wideWidth]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    setHintOpen(false);
  }, [state.settings.mode]);

  useEffect(() => {
    if (!hintOpen) {
      return;
    }
    const timer = setTimeout(() => {
      setHintOpen(false);
    }, HINT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [hintOpen]);

  const gripHandlers = useWidthDrag({
    width: state.settings.wideWidth,
    clamp: clampWideWidth,
    onCommit: (next: number) => {
      dispatch({ type: 'SET_WIDE_WIDTH', width: next });
    },
  });

  const isWide = state.settings.width === WIDTH.WIDE;
  const hintMode = state.settings.mode === 'tasks' ? null : (state.settings.mode satisfies HintMode);

  const isInvalidTab = (value: PopupMode): boolean => {
    return value !== 'tasks' && value !== 'memos' && value !== 'english';
  };

  return (
    <>
      {isWide ? <WidthGrip side="left" handlers={gripHandlers('left')} /> : null}
      {isWide ? <WidthGrip side="right" handlers={gripHandlers('right')} /> : null}

      <Tabs.Root
        className="relative flex-1 min-h-0 flex flex-col"
        value={state.settings.mode}
        onValueChange={(value: string) => {
          if (isInvalidTab(value as PopupMode)) {
            return;
          }
          dispatch({ type: 'SET_MODE', mode: value as PopupMode });
        }}
      >
        <div className="sticky top-0 z-10 flex items-center gap-[10px] px-[16px] pt-[12px] pb-[10px] bg-surface">
          <Tab />
          {hintMode ? (
            <button
              id="btn-hint"
              className={`${CHIP_ICON} ${CHIP_HOVER}`}
              type="button"
              title="How to use this tab"
              aria-label="How to use this tab"
              aria-expanded={hintOpen}
              aria-controls="hint-toast"
              onClick={() => {
                setHintOpen(!hintOpen);
              }}
            >
              ?
            </button>
          ) : null}
          <button
            id="btn-settings"
            className={`${CHIP_ICON} ${CHIP_HOVER}`}
            type="button"
            title="Settings"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            aria-controls="settings-panel"
            onClick={() => {
              setSettingsOpen(!settingsOpen);
            }}
          >
            ⚙
          </button>
        </div>

        {hintOpen && hintMode ? (
          <HintToast
            mode={hintMode}
            onClose={() => {
              setHintOpen(false);
            }}
          />
        ) : null}

        {settingsOpen ? (
          <SettingDetailsPanel
            state={state}
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
        ) : null}
        {state.settings.mode === 'tasks' ? (
          <Tabs.Content className={PANEL} value="tasks">
            <TasksPage state={state} dispatch={dispatch} />
          </Tabs.Content>
        ) : null}
        {state.settings.mode === 'memos' ? (
          <Tabs.Content className={PANEL} value="memos">
            <MemosPage state={state} dispatch={dispatch} />
          </Tabs.Content>
        ) : null}
        {state.settings.mode === 'english' ? (
          <Tabs.Content className={PANEL} value="english">
            <EnglishPage state={state} dispatch={dispatch} />
          </Tabs.Content>
        ) : null}
      </Tabs.Root>
    </>
  );
}
