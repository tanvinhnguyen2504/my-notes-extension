import { PopupMode } from '@/src/core/types';

const CAP =
  'inline-flex items-center justify-center min-w-[18px] px-[5px] py-[2px] rounded-[4px] border border-teal bg-teal font-mono text-[10px] leading-none text-on-teal';

export type HintMode = Exclude<PopupMode, 'tasks'>;

interface Hint {
  keys: readonly string[];
  description: string;
}

interface HintSection {
  heading: string;
  hints: readonly Hint[];
}

const MEMO_HINTS: readonly HintSection[] = [
  {
    heading: 'Keyboard',
    hints: [
      { keys: ['/'], description: 'focus the search box' },
      { keys: ['Esc'], description: 'clear the search' },
      { keys: ['↑', '↓'], description: 'move the row cursor' },
      { keys: ['↵'], description: 'copy the focused snippet' },
      { keys: ['E'], description: 'edit the focused memo' },
      { keys: ['N'], description: 'new memo' },
    ],
  },
  {
    heading: 'Mouse',
    hints: [
      { keys: ['Click'], description: 'open the memo for editing' },
      { keys: ['Right-click'], description: 'pin or unpin the row' },
    ],
  },
];

const ENGLISH_HINTS: readonly HintSection[] = [
  {
    heading: 'Keyboard',
    hints: [
      { keys: ['/'], description: 'focus the search box' },
      { keys: ['Esc'], description: 'clear the search' },
      { keys: ['↵'], description: 'save from either add field' },
    ],
  },
  {
    heading: 'Mouse',
    hints: [
      { keys: ['Click'], description: 'expand or collapse the item' },
      { keys: ['Speaker'], description: 'hear the English read out' },
      { keys: ['Copy'], description: 'copy the English without brackets' },
      { keys: ['Bin'], description: 'delete, with 5s to undo' },
    ],
  },
];

const SECTIONS: Record<HintMode, readonly HintSection[]> = {
  memos: MEMO_HINTS,
  english: ENGLISH_HINTS,
};

interface HintToastProps {
  mode: HintMode;
  onClose: () => void;
}

export function HintToast({ mode, onClose }: HintToastProps): React.JSX.Element {
  return (
    // top: clears the sticky header that the Hint button lives in.
    <div
      id="hint-toast"
      className="absolute left-[12px] right-[12px] top-[54px] z-30 flex flex-col gap-[8px] p-[12px] rounded-[10px] bg-surface border border-line shadow-menu"
      role="status"
    >
      <div className="flex items-center gap-[8px]">
        <span className="flex-1 text-[12px] font-semibold text-ink">{mode === 'memos' ? 'Dev snippets' : 'English memos'}</span>
        <button
          id="btn-close-hint"
          className="flex-none w-[20px] h-[20px] rounded-[6px] text-[12px] leading-none text-dim hover:text-ink hover:bg-chip"
          type="button"
          title="Hide hints"
          aria-label="Hide hints"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {SECTIONS[mode].map((section) => {
        return (
          <div key={section.heading} className="flex flex-col gap-[10px]">
            <span className="text-[10px] font-semibold tracking-[0.06em] text-dim">{section.heading.toUpperCase()}</span>
            {section.hints.map((hint) => {
              return (
                <span key={hint.description} className="flex items-center gap-[7px] text-[11.5px] text-ink">
                  <span className="flex-none inline-flex items-center gap-[3px]">
                    {hint.keys.map((key) => {
                      return (
                        <span key={key} className={CAP}>
                          {key}
                        </span>
                      );
                    })}
                  </span>
                  <span className="flex-1 min-w-0 text-dim italic">{hint.description}</span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
