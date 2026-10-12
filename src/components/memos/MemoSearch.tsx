type Props = {
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
};

export function MemoSearch({ value, inputRef, onChange }: Props): React.JSX.Element {
  return (
    <footer className="flex-none flex items-center gap-[11px] py-[11px] px-[14px] bg-surface border-t border-line focus-within:border-teal">
      <input
        id="memo-search"
        ref={inputRef}
        className="flex-1 min-w-0 border-0 outline-0 bg-transparent [font:inherit] text-ink placeholder:text-dim"
        type="text"
        placeholder="Search snippets"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <span className="flex-none h-[20px] min-w-[20px] px-[6px] inline-flex items-center justify-center rounded-[5px] border border-line font-mono text-[10px] text-dim">
        /
      </span>
    </footer>
  );
}
