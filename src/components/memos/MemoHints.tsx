const CAP = 'inline-flex items-center justify-center px-[5px] py-[2px] rounded-[4px] border border-line font-mono text-[10px] leading-none';

const HINTS: readonly { key: string; word: string }[] = [
  { key: '↑↓', word: 'move' },
  { key: '↵', word: 'copy' },
  { key: 'E', word: 'edit' },
];

type Props = {
  total: number;
};

export function MemoHints({ total }: Props): React.JSX.Element {
  return (
    <div className="flex-none flex items-center gap-[16px] py-[9px] px-[14px] bg-surface border-t border-line text-[11px] text-dim">
      {HINTS.map((hint) => {
        return (
          <span key={hint.word} className="inline-flex items-center gap-[6px]">
            <span className={CAP}>{hint.key}</span>
            {hint.word}
          </span>
        );
      })}
      <span className="flex-1" />
      <span className="font-mono">
        {total} {total === 1 ? 'snippet' : 'snippets'}
      </span>
    </div>
  );
}
