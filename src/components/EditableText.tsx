import { useEffect, useRef } from 'react';

export interface EditableTextProps {
  initial: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function EditableText({ initial, onCommit, onCancel }: EditableTextProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  // Commit-on-blur and commit-on-Enter can both fire for one interaction. A
  // ref, not state: settling must not trigger a render of its own.
  const settled = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const settle = (commit: boolean): void => {
    if (settled.current) {
      return;
    }
    settled.current = true;
    const text = inputRef.current?.value ?? '';
    if (commit) {
      onCommit(text);
      return;
    }
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      className="flex-1 min-w-0 m-0 py-[2px] px-[6px] border border-teal rounded-[6px] outline-0 bg-surface [font:inherit] text-ink"
      type="text"
      defaultValue={initial}
      spellCheck={false}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          settle(true);
        } else if (event.key === 'Escape') {
          settle(false);
        }
      }}
      onBlur={() => {
        settle(true);
      }}
    />
  );
}
