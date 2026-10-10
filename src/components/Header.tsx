// `armed` is view state and lives here rather than in the reducer -- it must
// never be persisted.

import { useEffect, useState } from 'react';
import { State } from '../core/types.ts';
import { countDone, isAllDone } from '../core/utils.ts';

const CLEAR_CONFIRM_MS = 3000;

// Padding and font size are deliberately NOT in the base: a utility conflict is
// resolved by Tailwind's own property ordering, not by the order the classes
// are written, so `p-0` next to `px-[9px]` is a coin toss. Each variant states
// its own.
const CHIP_BASE =
  'flex items-center gap-[6px] h-[28px] border border-line rounded-[8px] bg-chip ' +
  'font-medium leading-none text-dim disabled:opacity-[0.35] disabled:cursor-default';

export const CHIP = `${CHIP_BASE} px-[9px] text-[10.5px]`;

// Icon-only chips carry their meaning in title/aria-label, so they drop the
// text padding and go square -- the header has no room to spare at 380px.
export const CHIP_ICON = `${CHIP_BASE} p-0 w-[28px] justify-center text-[13px]`;

// Two variants deep, which outranks the single-variant hover by specificity
// rather than by source order.
export const CHIP_HOVER = 'hover:text-ink disabled:hover:text-dim';

export interface HeaderProps {
  state: State;
  settings: React.ReactNode;
  onMarkAll: () => void;
  onClearAll: () => void;
  onExport: () => void;
}

export function Header({ state, settings, onMarkAll, onClearAll, onExport }: HeaderProps): React.JSX.Element {
  const [armed, setArmed] = useState(false);
  const isEmpty = state.tasks.length === 0;
  const allDone = isAllDone(state.tasks);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => {
      setArmed(false);
    }, CLEAR_CONFIRM_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [armed]);

  useEffect(() => {
    if (isEmpty) {
      setArmed(false);
    }
  }, [isEmpty]);

  return (
    <header className="flex items-center gap-[10px] pt-[14px] px-[16px] pb-[12px] bg-surface border-b border-line">
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium tracking-[-0.01em]">Checklist</div>
        <div className="mt-[3px] text-[10.5px] font-normal leading-none text-dim">
          <span id="count">
            {countDone(state.tasks)} of {state.tasks.length}
          </span>{' '}
          done
        </div>
      </div>

      <button
        id="btn-check-all"
        className={`${CHIP} ${CHIP_HOVER}`}
        type="button"
        title={allDone ? 'Clear every tick' : 'Mark everything done'}
        data-all-done={String(allDone)}
        disabled={isEmpty}
        onClick={() => {
          setArmed(false);
          onMarkAll();
        }}
      >
        {allDone ? '✕ UNMARK ALL' : '✓ MARK ALL'}
      </button>

      {/* The armed colour must beat the hover colour, and both are one variant
          deep, so the hover is scoped to the unarmed state instead of racing it. */}
      <button
        id="btn-clear-all"
        className={`${CHIP} data-[armed=false]:hover:text-ink disabled:hover:text-dim data-[armed=true]:text-clay-ink data-[armed=true]:border-clay`}
        type="button"
        title="Remove every item"
        data-armed={String(armed)}
        disabled={isEmpty}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          onClearAll();
        }}
      >
        {armed ? 'SURE?' : 'CLEAR'}
      </button>

      <button
        id="btn-export-csv"
        className={`${CHIP_ICON} ${CHIP_HOVER}`}
        type="button"
        title="Download the list as CSV"
        aria-label="Download the list as CSV"
        disabled={isEmpty}
        onClick={onExport}
      >
        ↓
      </button>

      {settings}
    </header>
  );
}
