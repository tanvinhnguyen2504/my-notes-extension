import { EMemoType, MEMO_TYPE_LABELS } from '@/src/core/types/memos';
import { MEMO_TYPE_DOT } from './constants';

const ORDER: readonly EMemoType[] = [
  EMemoType.GIT,
  EMemoType.DATABASE,
  EMemoType.CONFIG,
  EMemoType.SHELL,
  EMemoType.NOTE,
];

const CHIP = 'flex-none inline-flex items-center gap-[5px] h-[24px] px-[9px] rounded-[7px] border text-[10.5px] font-medium leading-none';

type Props = {
  active: EMemoType | null;
  onChange: (type: EMemoType | null) => void;
};

export function MemoFilterChips({ active, onChange }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-[6px] overflow-x-auto">
      <button
        className={`${CHIP} ${active === null ? 'bg-ink text-surface border-ink' : 'border-line text-dim hover:text-ink'}`}
        type="button"
        onClick={() => {
          onChange(null);
        }}
      >
        All
      </button>

      {ORDER.map((type) => {
        const on = active === type;
        return (
          <button
            key={type}
            className={`${CHIP} ${on ? 'bg-ink text-surface border-ink' : 'border-line text-dim hover:text-ink'}`}
            type="button"
            onClick={() => {
              onChange(on ? null : type);
            }}
          >
            <span className={`flex-none w-[6px] h-[6px] rounded-full ${MEMO_TYPE_DOT[type]}`} />
            {MEMO_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
