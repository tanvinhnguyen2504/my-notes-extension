// Ticking here writes the shared storage key, which the popup picks up through
// chrome.storage.onChanged.

import { useEffect, useReducer } from 'react';
import { Action, reducer } from '../core/reducer.ts';
import { State } from '../core/types.ts';
import { loadState, normalizeState, saveState, sortByPriority } from '../core/utils.ts';
import { CHIP, CHIP_HOVER } from './Header.tsx';
import { NoteRow } from './NoteRow.tsx';

function usePageState(): [State, (action: Action) => void] {
  const [state, rawDispatch] = useReducer(reducer, null, () => {
    // Placeholder until loadState() resolves, so every field the render reads
    // exists from the first frame.
    return normalizeState(null);
  });

  // Persisting stays explicit rather than reactive: REPLACE_STATE carries state
  // that just arrived FROM storage, and an effect that saved on every change
  // would write it straight back. The reducer is pure, so the value to persist
  // is computed here rather than waiting for the next render.
  const dispatch = (action: Action): void => {
    rawDispatch(action);
    if (action.type !== 'REPLACE_STATE') {
      saveState(reducer(state, action));
    }
  };

  useEffect(() => {
    loadState().then((saved) => {
      rawDispatch({ type: 'REPLACE_STATE', state: saved });
    });
  }, []);

  return [state, dispatch];
}

export function ReminderPage(): React.JSX.Element {
  const [state, dispatch] = usePageState();

  // On <html>, outside the React root -- a contract with styles.css.
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        window.close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const outstanding = sortByPriority(
    state.items.filter((item) => {
      return !item.done;
    }),
  );

  // The rendered list is filtered and re-sorted, so a row's position here says
  // nothing about its index in state.items -- which is what the reducer
  // addresses. The id bridges the two.
  const tick = (id: string): void => {
    const index = state.items.findIndex((item) => {
      return item.id === id;
    });
    if (index === -1) {
      return;
    }
    dispatch({ type: 'TOGGLE_DONE', index });
  };

  return (
    <>
      <header className="flex items-center gap-[10px] pt-[14px] px-[16px] pb-[12px] bg-surface border-b border-line">
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-medium tracking-[-0.01em]">REMINDER!</div>
          <div className="mt-[3px] text-[10.5px] font-normal leading-none text-dim">
            <span id="reminder-count">{outstanding.length}</span> still outstanding
          </div>
        </div>
      </header>

      <main id="reminder-list" className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-[4px]">
        {outstanding.length === 0 ? (
          <div className="py-[46px] px-[24px] text-center text-dim">
            <strong className="block mb-[6px] text-ink font-medium text-[13.5px]">All clear</strong>
            <span className="text-[12px] leading-[1.5]">Nothing priority is outstanding.</span>
          </div>
        ) : (
          outstanding.map((item) => {
            return (
              <NoteRow
                key={item.id}
                item={item}
                boxTitle="Mark done"
                onToggle={() => {
                  tick(item.id);
                }}
              />
            );
          })
        )}
      </main>

      <footer className="compose flex items-center gap-[11px] py-[11px] px-[14px] bg-surface border-t border-line">
        <button
          id="btn-dismiss"
          className={`${CHIP} ${CHIP_HOVER}`}
          type="button"
          title="Close this reminder"
          onClick={() => {
            window.close();
          }}
        >
          DISMISS
        </button>
      </footer>
    </>
  );
}
