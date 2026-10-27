import { useEffect, useRef } from 'react';
import { stripBrackets } from '@/src/core/english_utils';
import { ENGLISH_TYPE, EnglishItem } from '@/src/core/types/english';
import { CopyIcon } from '../icons/CopyIcon';
import { SpeakerIcon } from '../icons/SpeakerIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { MarkedText } from './MarkedText';

const EN_WORD = 'text-[17px] font-semibold leading-[1.3]';
const EN_SENTENCE = 'text-[16px] font-normal leading-[1.35]';

// memos/MemoRow's action size, so the two tabs' rows read as one component.
const ACTION = 'flex-none inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px]';
const IDLE = 'text-dim hover:text-ink hover:bg-chip';
const DANGER = 'text-danger-ink hover:bg-chip';
const COPIED_PILL =
  'flex-none inline-flex items-center justify-center gap-[5px] h-[26px] min-w-[72px] px-[10px] rounded-[7px] ' +
  'bg-teal border border-teal text-on-teal text-[11.5px] font-medium leading-none';

// The copied tint has to read against --color-surface in both themes, so it is
// mixed from the teal token rather than being a second hard-coded colour.
const COPIED_ROW = 'bg-[color-mix(in_oklch,var(--color-teal)_7%,transparent)]';

// Reveal-on-hover, as in MemoRow. The copied pill opts out by not using it:
// an action that is currently *doing* something stays visible.
const REVEAL = 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100';

type Props = {
  item: EnglishItem;
  expanded: boolean;
  highlighted: boolean;
  copied: boolean;
  onToggle: () => void;
  onListen: () => void;
  onCopy: () => void;
  onDelete: () => void;
};

export function EnglishMemoRow({
  item,
  expanded,
  highlighted,
  copied,
  onToggle,
  onListen,
  onCopy,
  onDelete,
}: Props): React.JSX.Element {
  const isWord = item.type === ENGLISH_TYPE.WORD;
  const panelId = `english-panel-${item.id}`;
  const plain = stripBrackets(item.en);

  const rowState = (): string => {
    if (copied) {
      return COPIED_ROW;
    }
    if (highlighted) {
      return 'bg-hover outline outline-2 outline-teal -outline-offset-2 rounded-[8px]';
    }
    return '';
  };

  // scroll-mt / scroll-mb leave the gap, so `block: 'nearest'` can stay
  // arithmetic-free -- the same arrangement MemoRow uses.
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlighted) {
      return;
    }
    rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  return (
    // No fixed height, unlike MemoRow's h-[64px]: these two lines wrap, and a
    // capped row would clip a long sentence in compact width.
    <div
      ref={rowRef}
      className={`group scroll-mt-[8px] scroll-mb-[8px] px-[12px] border-b border-hair last:border-b-0 transition-[background,color] duration-[150ms] ${rowState()}`}
      data-id={item.id}
      data-type={item.type}
      data-expanded={String(expanded)}
    >
      <div className="flex items-start gap-[4px] py-[8px]">
        {/* A real button with aria-expanded. The action buttons are its
            SIBLINGS, never its children: nested buttons resolve the click to
            the outer one, so Copy would also expand the row. */}
        <button
          className="flex-1 min-w-0 flex flex-col items-stretch gap-[3px] pr-[6px] text-left cursor-pointer"
          type="button"
          title="Show the example"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className={`block ${isWord ? EN_WORD : EN_SENTENCE}`}>
            <MarkedText en={item.en} />
            {isWord && item.pos ? <span className="ml-[6px] text-[11px] font-normal text-dim">{item.pos}</span> : null}
          </span>
          {item.vi ? (
            <span className="block text-[12.5px] leading-[1.4] text-dim" lang="vi">
              {item.vi}
            </span>
          ) : null}
        </button>

        <button
          className={`${ACTION} ${IDLE} ${REVEAL}`}
          type="button"
          title="Listen"
          aria-label={`Listen to "${plain}"`}
          onClick={onListen}
        >
          <SpeakerIcon />
        </button>

        <button
          className={copied ? COPIED_PILL : `${ACTION} ${IDLE} ${REVEAL}`}
          type="button"
          title={copied ? 'Copied' : 'Copy to clipboard'}
          aria-label={copied ? 'Copied' : 'Copy to clipboard'}
          onClick={onCopy}
        >
          {copied ? <span className="leading-none">✓ Copied</span> : <CopyIcon />}
        </button>

        <button
          className={`${ACTION} ${DANGER} ${REVEAL}`}
          type="button"
          title="Delete"
          aria-label={`Delete "${plain}"`}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>

      {expanded ? (
        <div id={panelId} className="pb-[10px]">
          <p className="m-0 text-[12px] italic leading-[1.45] text-soft">{item.example ?? 'No example yet.'}</p>
        </div>
      ) : null}
    </div>
  );
}
