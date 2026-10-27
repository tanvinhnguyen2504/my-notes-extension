// Deliberately the same shape as memos/MemoSearch: a bordered footer whose
// border turns teal on focus-within, holding a BORDERLESS input. The `outline-0`
// utility on that input is dead weight -- the unlayered `:focus-visible` rule in
// styles.css beats every outline utility -- so the input keeps its ring AND the
// footer turns teal, exactly as the Dev tab does. Kept for that parity.

type Props = {
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
};

export function EnglishMemoSearch({ value, inputRef, onChange }: Props): React.JSX.Element {
  return (
    <footer className="flex-none flex items-center gap-[11px] py-[11px] px-[14px] bg-surface border-t border-line focus-within:border-teal">
      <input
        id="english-search"
        ref={inputRef}
        className="flex-1 min-w-0 border-0 outline-0 bg-transparent [font:inherit] text-ink placeholder:text-dim"
        type="text"
        placeholder="Search English or Vietnamese"
        aria-label="Search English or Vietnamese"
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
