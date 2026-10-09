// No isComposing guard: the suspected IME duplicate-Enter is a documented,
// unconfirmed loose end, and fixing it here would hide a behaviour change
// inside a migration.

import { useState } from 'react';

export interface ComposeProps {
  onAdd: (text: string) => boolean;
  autoFocus: boolean;
}

export function Compose({ onAdd, autoFocus }: ComposeProps): React.JSX.Element {
  const [draft, setDraft] = useState('');

  const submit = (): void => {
    if (onAdd(draft)) {
      setDraft('');
    }
  };

  return (
    <footer className="compose flex items-center gap-[11px] py-[11px] px-[14px] bg-surface border-t border-line">
      <input
        id="draft"
        className="flex-1 min-w-0 border-0 outline-0 bg-transparent [font:inherit] text-ink placeholder:text-dim"
        type="text"
        placeholder="Add an item, Enter to save"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            submit();
          }
        }}
      />
      <button
        id="add"
        className="flex-none py-[6px] px-[8px] rounded-[6px] text-[11px] font-medium leading-none text-dim hover:bg-chip hover:text-ink"
        type="button"
        title="Add"
        onClick={submit}
      >
        Enter ↵
      </button>
    </footer>
  );
}
