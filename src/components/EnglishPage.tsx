import { useEffect, useRef, useState } from 'react';
import {
  countEnglishByType,
  filterEnglish,
  findDuplicate,
  groupEnglishByType,
  newEnglishItem,
  stripBrackets,
} from '@/src/core/english_utils';
import { Action } from '@/src/core/reducer';
import { State } from '@/src/core/types';
import { ENGLISH_TYPE_LABELS, ENGLISH_TYPE_ORDER, EnglishItem, EnglishType } from '@/src/core/types/english';
import { EnglishAddBar } from './english-memos/EnglishAddBar';
import { EnglishEmptyState } from './english-memos/EnglishMemoEmptyState';
import { EnglishMemoGroup } from './english-memos/EnglishMemoGroup';
import { EnglishMemoRow } from './english-memos/EnglishMemoRow';
import { EnglishMemoSearch } from './english-memos/EnglishMemoSearch';
import { EnglishMemoToolbar } from './english-memos/EnglishMemoToolbar';
import { UndoToast } from './english-memos/UndoToast';
import { speakEnglish } from './english-memos/speak';

const COPIED_MS = 1200;
const UNDO_MS = 5000;
const HIGHLIGHT_MS = 1200;

interface EnglishPageProps {
  state: State;
  dispatch: (action: Action) => boolean;
}

export function EnglishPage({ state, dispatch }: EnglishPageProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<EnglishType | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<EnglishItem | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [draftEn, setDraftEn] = useState('');
  const [draftVi, setDraftVi] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const addRef = useRef<HTMLInputElement | null>(null);

  // The keydown listener is registered once, so it cannot close over `query`.
  const queryRef = useRef(query);
  queryRef.current = query;

  const counts = countEnglishByType(state.english);
  const matched = filterEnglish(state.english, activeType, query);
  const groups = groupEnglishByType(matched);

  useEffect(() => {
    if (copiedId === null) {
      return;
    }
    const timer = setTimeout(() => {
      setCopiedId(null);
    }, COPIED_MS);
    // Radix unmounts this panel on a tab switch, and a setState from a stray
    // timer after that is a console warning and a lost undo.
    return () => {
      clearTimeout(timer);
    };
  }, [copiedId]);

  useEffect(() => {
    if (pendingUndo === null) {
      return;
    }
    const timer = setTimeout(() => {
      setPendingUndo(null);
    }, UNDO_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [pendingUndo]);

  useEffect(() => {
    if (highlightId === null) {
      return;
    }
    const timer = setTimeout(() => {
      setHighlightId(null);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlightId]);

  const revealRow = (id: string): void => {
    setHighlightId(id);
    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-id="${id}"]`);
      row?.scrollIntoView({ block: 'nearest' });
    });
  };

  const save = (): void => {
    const existing = findDuplicate(state.english, draftEn);
    if (existing) {
      revealRow(existing.id);
      return;
    }

    const item = newEnglishItem(draftEn, draftVi);
    if (!dispatch({ type: 'ADD_ENGLISH_ITEM', item })) {
      return;
    }

    setDraftEn('');
    setDraftVi('');
    addRef.current?.focus();
    if (activeType !== null && activeType !== item.type) {
      setActiveType(item.type);
    }
    revealRow(item.id);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key !== 'Escape') {
        return;
      }
      if (!queryRef.current) {
        return;
      }
      event.preventDefault();
      setQuery('');
      searchRef.current?.blur();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const copy = (item: EnglishItem): void => {
    navigator.clipboard
      .writeText(stripBrackets(item.en))
      .then(() => {
        setCopiedId(item.id);
      })
      .catch(() => {
        setCopiedId(null);
      });
  };

  const remove = (item: EnglishItem): void => {
    dispatch({ type: 'DELETE_ENGLISH_ITEM', id: item.id });
    setExpandedId(null);
    setPendingUndo(item);
  };

  const undo = (): void => {
    if (!pendingUndo) {
      return;
    }
    dispatch({ type: 'RESTORE_ENGLISH_ITEM', item: pendingUndo });
    setPendingUndo(null);
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <EnglishMemoToolbar active={activeType} counts={counts} total={state.english.length} onTypeChange={setActiveType} />

      <main className="flex-1 min-h-0 overflow-y-auto px-[10px] pb-[10px]">
        {matched.length === 0 ? (
          <EnglishEmptyState query={state.english.length === 0 ? '' : query} />
        ) : (
          ENGLISH_TYPE_ORDER.map((type) => {
            const rows = groups[type];
            return (
              <EnglishMemoGroup key={type} label={ENGLISH_TYPE_LABELS[type].toUpperCase()} count={rows.length}>
                {rows.map((item) => {
                  return (
                    <EnglishMemoRow
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      highlighted={highlightId === item.id}
                      copied={copiedId === item.id}
                      onToggle={() => {
                        setExpandedId(expandedId === item.id ? null : item.id);
                      }}
                      onListen={() => {
                        speakEnglish(item.en);
                      }}
                      onCopy={() => {
                        copy(item);
                      }}
                      onDelete={() => {
                        remove(item);
                      }}
                    />
                  );
                })}
              </EnglishMemoGroup>
            );
          })
        )}
      </main>

      <section className="relative z-10 flex-none w-full">
        {pendingUndo ? <UndoToast item={pendingUndo} onUndo={undo} /> : null}
        <EnglishMemoSearch value={query} inputRef={searchRef} onChange={setQuery} />
        <EnglishAddBar en={draftEn} vi={draftVi} enRef={addRef} onEnChange={setDraftEn} onViChange={setDraftVi} onSave={save} />
      </section>
    </div>
  );
}
