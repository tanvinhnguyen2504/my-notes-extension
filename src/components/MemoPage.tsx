import { useCallback, useEffect, useRef, useState } from 'react';
import { useMemoKeyboard } from '@/src/hooks/useMemoKeyboard';
import { countMemosByType, filterMemos, newMemo, splitPinned } from '@/src/core/memo_utils';
import { Action } from '@/src/core/reducer';
import { State } from '@/src/core/types';
import { EMemoType, IMemo } from '@/src/core/types/memos';
import { MemoEditor } from './memos/MemoEditor';
import { MemoEmptyState } from './memos/MemoEmptyState';
import { MemoFilterChips } from './memos/MemoFilterChips';
import { MemoGroup } from './memos/MemoGroup';
import { MemoHints } from './memos/MemoHints';
import { MemoRow } from './memos/MemoRow';
import { MemoSearch } from './memos/MemoSearch';

const COPIED_MS = 1200;

interface MemosPageProps {
  state: State;
  dispatch: (action: Action) => boolean;
}

export function MemosPage({ state, dispatch }: MemosPageProps): React.JSX.Element {
  const [activeType, setActiveType] = useState<EMemoType | null>(null);
  const [query, setQuery] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<IMemo | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Counts come from state.memos, never from `matched`, so they stay put while
  // the user types -- but still follow a pin, an add or a delete.
  const counts = countMemosByType(state.memos);
  const matched = filterMemos(state.memos, activeType, query);
  const { pinned, recent } = splitPinned(matched);
  const visible = [...pinned, ...recent];

  const closeEditor = useCallback(() => {
    setDraft(null);
  }, []);

  const copy = useCallback(
    (memo: IMemo): void => {
      navigator.clipboard
        .writeText(memo.content)
        .then(() => {
          setCopiedId(memo.id);
          dispatch({ type: 'COUNT_MEMO_COPY', id: memo.id });
        })
        .catch(() => {
          setCopiedId(null);
        });
    },
    [dispatch],
  );

  const onSaveMemo = (memo: IMemo, isExist: boolean) => {
    if (isExist) {
      const { id, ...changes } = memo;
      dispatch({ type: 'UPDATE_MEMO', id, changes });
      return;
    }
    dispatch({ type: 'ADD_MEMO', memo });
  };

  useEffect(() => {
    if (copiedId === null) {
      return;
    }
    const timer = setTimeout(() => {
      setCopiedId(null);
    }, COPIED_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [copiedId]);

  useMemoKeyboard({
    enabled: draft === null,
    searchRef,
    query,
    onQueryChange: setQuery,
    rows: visible,
    focusedId,
    onFocusChange: setFocusedId,
    onEnter: copy,
    onNew: () => {
      setDraft(newMemo(EMemoType.GIT));
    },
    onEdit: setDraft,
  });

  if (draft) {
    const isExist = state.memos.some((saved) => {
      return saved.id === draft.id;
    });
    return (
      <MemoEditor
        draft={draft}
        editing={isExist}
        onBack={closeEditor}
        onDelete={() => {
          dispatch({ type: 'DELETE_MEMO', id: draft.id });
          closeEditor();
        }}
        onSave={(memo) => onSaveMemo(memo, isExist)}
      />
    );
  }

  const renderRow = (memo: IMemo): React.JSX.Element => {
    return (
      <MemoRow
        key={memo.id}
        row={memo}
        copied={copiedId === memo.id}
        focused={focusedId === memo.id}
        onCopy={() => {
          copy(memo);
        }}
        onOpen={() => {
          setDraft(memo);
        }}
        onTogglePin={() => {
          dispatch({ type: 'TOGGLE_MEMO_PIN', id: memo.id });
        }}
      />
    );
  };

  return (
    <>
      <div className="group flex-none flex items-center gap-[8px] px-[12px] pb-[10px]">
        <MemoFilterChips active={activeType} counts={counts} total={state.memos.length} onChange={setActiveType} />
        <button
          id="btn-new-memo"
          className="flex-none w-[28px] h-[28px] rounded-[8px] border border-line text-[15px] leading-none text-dim hover:text-ink hover:bg-chip"
          type="button"
          title="New memo"
          aria-label="New memo"
          onClick={() => {
            setDraft(newMemo(EMemoType.GIT));
          }}
        >
          +
        </button>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto px-[10px] pb-[10px]">
        {matched.length === 0 ? (
          <MemoEmptyState filtered={state.memos.length > 0} />
        ) : (
          <>
            <MemoGroup label="PINNED" count={pinned.length}>
              {pinned.map(renderRow)}
            </MemoGroup>
            <MemoGroup label="RECENT" count={recent.length}>
              {recent.map(renderRow)}
            </MemoGroup>
          </>
        )}
      </main>

      <section className="z-10 sticky bottom-0 w-full">
        <MemoSearch value={query} inputRef={searchRef} onChange={setQuery} />
      </section>
    </>
  );
}
