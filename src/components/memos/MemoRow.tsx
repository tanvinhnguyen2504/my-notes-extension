import { useEffect, useRef } from 'react';
import { firstLine, tokenizeMemoLine } from '@/src/core/memo_utils';
import { IMemo } from '@/src/core/types/memos';
import { CopyIcon } from '@/src/components/icons/CopyIcon';
import { PinIcon } from '@/src/components/icons/PinIcon';
import { MemoLabel } from './MemoLabel';
import { MEMO_PROMPT_GLYPH, MEMO_TOKEN_CLASS } from './constants';

const ACTION = 'flex-none inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px]';

// The copied tint has to read against --color-surface in both themes, so it is
// mixed from the teal token rather than being a second hard-coded colour.
const COPIED_ROW = 'bg-[color-mix(in_oklch,var(--color-teal)_7%,transparent)]';

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

  const rowState = (): string => {
    if (copied) {
      return COPIED_ROW;
    }
    if (focused) {
      return 'bg-hover outline outline-2 outline-teal -outline-offset-2 rounded-[10px]';
    }
    return '';
  };

  // No offset arithmetic here on purpose: `block: 'nearest'` asks the browser
  // to scroll the nearest scrollable ancestor by the minimum, and the gap it
  // leaves is set in CSS by scroll-mt / scroll-mb on this element. Safe now
  // that body is capped -- the popup viewport itself can no longer scroll.
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!focused) {
      return;
    }
    rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  const tokens = tokenizeMemoLine(firstLine(row.content), row.type);

  return (
    <div
      ref={rowRef}
      className={`group flex items-center gap-[4px] h-[64px] scroll-mt-[8px] scroll-mb-[8px] px-[12px] border-b border-hair last:border-b-0 transition-[background,color] duration-[150ms] ${rowState()}`}
      onContextMenu={(event) => {
        if (!onTogglePin) {
          return;
        }
        event.preventDefault();
        onTogglePin();
      }}
    >
      <button
        className="flex-1 min-w-0 flex flex-col items-stretch gap-[5px] py-[8px] pr-[6px] text-left cursor-pointer"
        type="button"
        title="Edit this memo"
        disabled={preview}
        onClick={onOpen}
      >
        <span className="flex items-center gap-[8px] w-full">
          <MemoLabel type={row.type} />
          <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">{row.label}</span>
        </span>

        <span className="flex items-center gap-[8px] w-full h-[28px] px-[10px] rounded-[7px] bg-code-bg border border-code-line overflow-hidden">
          <span className="flex-none text-[11.5px] font-mono leading-none text-code-ghost">
            {MEMO_PROMPT_GLYPH[row.type]}
          </span>
          <span className="flex-1 min-w-0 truncate text-[11.5px] font-mono leading-[28px]">
            {tokens.map((token, at) => {
              return (
                <span key={at} className={MEMO_TOKEN_CLASS[token.kind]}>
                  {token.text}
                </span>
              );
            })}
          </span>
        </span>
      </button>

      <button
        className={`${copied ? '' : ACTION} ${reveal(copied || focused)} ${
          copied
            ? 'flex-none inline-flex items-center justify-center gap-[5px] h-[26px] min-w-[72px] px-[10px] rounded-[7px] bg-teal border border-teal text-on-teal text-[11.5px] font-medium leading-none'
            : 'text-dim hover:text-ink hover:bg-chip'
        }`}
        type="button"
        title={copied ? 'Copied' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
        disabled={preview}
        onClick={onCopy}
      >
        {copied ? <span className="leading-none">{'✓'} Copied</span> : <CopyIcon />}
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
