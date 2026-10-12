import { firstLine } from '@/src/core/memo_utils';
import { IMemo } from '@/src/core/types/memos';
import { MemoLabel } from './MemoLabel';

type Props = {
  row: IMemo;
  copied: boolean;
  focused?: boolean;
  preview?: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onTogglePin?: () => void;
};

export function MemoRow({ row, copied, focused = false, preview = false, onCopy, onOpen, onTogglePin }: Props): React.JSX.Element {
  return (
    <div
      className={`flex items-center gap-[10px] min-h-[44px] px-[12px] border-b border-teal last:border-b-0 ${focused ? 'bg-hover' : ''}`}
      onContextMenu={(event) => {
        if (!onTogglePin) {
          return;
        }
        event.preventDefault();
        onTogglePin();
      }}
    >
      <button
        className="flex-1 min-w-0 flex flex-col items-start gap-[3px] py-[8px] text-left cursor-pointer"
        type="button"
        title="Edit this memo"
        disabled={preview}
        onClick={onOpen}
      >
        <span className="flex items-center gap-[8px] w-full">
          <MemoLabel type={row.type} />
          {row.isPinned ? <span className="flex-none text-[9px] text-dim">PINNED</span> : null}
          <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{row.label}</span>
        </span>
        <span className="w-full truncate text-[11px] font-mono text-ink">{firstLine(row.content)}</span>
      </button>

      <button
        className={`flex-none h-[26px] px-[9px] rounded-[7px] border text-[10.5px] font-medium leading-none ${
          copied ? 'border-teal text-teal' : 'border-line text-dim hover:text-ink hover:bg-chip'
        }`}
        type="button"
        title="Copy to clipboard"
        disabled={preview}
        onClick={onCopy}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}
