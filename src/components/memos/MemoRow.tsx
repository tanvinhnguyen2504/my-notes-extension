import { useEffect, useRef } from 'react';
import { firstLine, tokenizeMemoLine } from '@/src/core/memo_utils';
import { IMemo } from '@/src/core/types/memos';
import { CopyIcon } from '@/src/components/icons/CopyIcon';
import { PinIcon } from '@/src/components/icons/PinIcon';
import { ACTION, COPIED_PILL, COPIED_ROW, DANGER, IDLE, REVEAL } from '@/src/components/row_classes';
import { MemoLabel } from './MemoLabel';
import { MEMO_PROMPT_GLYPH, MEMO_TOKEN_CLASS } from './constants';
import { TrashIcon } from '../icons/TrashIcon';

type Props = {
  row: IMemo;
  copied: boolean;
  focused?: boolean;
  preview?: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onTogglePin?: () => void;
  onDelete: () => void;
};

export function MemoRow({
  row,
  copied,
  focused = false,
  preview = false,
  onCopy,
  onOpen,
  onTogglePin,
  onDelete,
}: Props): React.JSX.Element {
  const reveal = (shown: boolean): string => {
    if (preview) {
      return 'opacity-0';
    }
    if (shown) {
      return 'opacity-100';
    }
    return REVEAL;
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

  // The pill replaces the square action box rather than layering over it.
  const copyClass = copied ? COPIED_PILL : `${ACTION} ${IDLE}`;

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
          <span className="flex-none text-[11.5px] font-mono leading-none text-code-ghost">{MEMO_PROMPT_GLYPH[row.type]}</span>
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
        className={`${copyClass} ${reveal(copied || focused)}`}
        type="button"
        title={copied ? 'Copied' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
        disabled={preview}
        onClick={onCopy}
      >
        {copied ? <span className="leading-none">{'✓'} Copied</span> : <CopyIcon />}
      </button>
      <button className={`${ACTION} ${DANGER} ${REVEAL}`} type="button" title="Delete" onClick={onDelete}>
        <TrashIcon />
      </button>

      <button
        className={`${ACTION} ${reveal(row.isPinned || focused)} ${row.isPinned ? 'text-teal' : IDLE}`}
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
