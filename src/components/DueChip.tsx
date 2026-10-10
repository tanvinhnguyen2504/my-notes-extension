// Radix has no date picker: the chip is the visible control and a real
// <input type="date"> sits off-screen purely to host the browser's calendar.

import { useRef } from 'react';
import { formatDayKeyShort, isDayKey } from '../core/day_utils.ts';
import { DayKey, Task } from '../core/types.ts';
import { DUE_CLASS } from './NoteRow.tsx';

// data-unset is paired with not-done for the same reason the priority colours
// are: the CSS this replaced relied on the done rule coming last.
const UNSET =
  'data-[unset=true]:group-data-[done=false]:text-clay-ink ' +
  'data-[unset=true]:group-data-[done=false]:bg-transparent ' +
  'data-[unset=true]:group-data-[done=false]:shadow-[inset_0_0_0_1px_var(--color-dash)]';

export interface DueChipProps {
  item: Task;
  onPick: (dayKey: DayKey | null) => void;
}

export function DueChip({ item, onPick }: DueChipProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  // showPicker() needs a rendered element and a user gesture, and the chip
  // click is both. focus() is the fallback where it is missing.
  const openPicker = (): void => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  return (
    <>
      <button
        className={`${DUE_CLASS} hover:text-ink ${UNSET}`}
        type="button"
        title="Change date"
        data-unset={String(!item.dueDate)}
        onClick={openPicker}
      >
        {item.dueDate ? formatDayKeyShort(item.dueDate) : 'SET DAY'}
      </button>
      {/* Present but invisible: showPicker() needs a real, rendered input.
          Note that it renders inside the row body, whose 11px flex gap reserves
          a column for it even at zero width -- see the loose end in CLAUDE.md. */}
      <input
        ref={inputRef}
        className="flex-none w-0 m-0 p-0 border-0 opacity-0 pointer-events-none"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={item.dueDate ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          onPick(isDayKey(value) ? value : null);
        }}
      />
    </>
  );
}
