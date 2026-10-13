import { firstLine } from '@/src/core/memo_utils';
import { IMemo } from '@/src/core/types/memos';
import { CopyIcon } from '@/src/components/icons/CopyIcon';
import { PinIcon } from '@/src/components/icons/PinIcon';
import { MemoLabel } from './MemoLabel';

const ACTION = 'flex-none inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px]';

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
  const reveal = (shown: boolean): string => {
    if (preview) {
      return 'opacity-0';
    }
    if (shown) {
      return 'opacity-100';
    }
    return 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100';
  };

  return (
    <div
      className={`group flex items-center gap-[4px] min-h-[44px] px-[12px] border-b border-teal last:border-b-0 ${
        focused ? 'bg-hover' : ''
      }`}
      onContextMenu={(event) => {
        if (!onTogglePin) {
          return;
        }
        event.preventDefault();
        onTogglePin();
      }}
    >
      <button
        className="flex-1 min-w-0 flex flex-col items-start gap-[3px] py-[8px] pr-[6px] text-left cursor-pointer"
        type="button"
        title="Edit this memo"
        disabled={preview}
        onClick={onOpen}
      >
        <span className="flex items-center gap-[8px] w-full">
          <MemoLabel type={row.type} />
          <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{row.label}</span>
        </span>
        <span className="w-full truncate text-[11px] font-mono text-ink">{firstLine(row.content)}</span>
      </button>

      <button
        className={`${ACTION} ${reveal(copied || focused)} ${copied ? 'text-teal' : 'text-dim hover:text-ink hover:bg-chip'}`}
        type="button"
        title={copied ? 'Copied' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
        disabled={preview}
        onClick={onCopy}
      >
        {copied ? <span className="text-[13px] leading-none">✓</span> : <CopyIcon />}
      </button>

      <button
        className={`${ACTION} ${reveal(row.isPinned || focused)} ${row.isPinned ? 'text-teal' : 'text-dim hover:text-ink hover:bg-chip'}`}
        type="button"
        title={row.isPinned ? 'Unpin' : 'Pin to the top'}
        aria-label={row.isPinned ? 'Unpin' : 'Pin to the top'}
        aria-pressed={row.isPinned}
        disabled={preview || !onTogglePin}
        onClick={onTogglePin}
      >
        <PinIcon filled={row.isPinned} />
      </button>
    </div>
  );
}
