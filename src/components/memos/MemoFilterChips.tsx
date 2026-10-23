import { EMemoType, MEMO_TYPE_LABELS } from '@/src/core/types/memos';
import { MEMO_TYPE_DOT } from './constants';

const ORDER: readonly EMemoType[] = [EMemoType.GIT, EMemoType.DATABASE, EMemoType.CONFIG, EMemoType.SHELL, EMemoType.NOTE];

const CHIP = 'flex-none inline-flex items-center gap-[5px] h-[24px] px-[9px] rounded-[7px] border text-[10.5px] font-medium leading-none';
const COUNT = 'font-mono opacity-60';

type Props = {
  active: EMemoType | null;
  counts: Record<EMemoType, number>;
  total: number;
  onChange: (type: EMemoType | null) => void;
};

export function MemoFilterChips({ active, counts, total, onChange }: Props): React.JSX.Element {
  return (
    <div className="sticky top-20 z-11 flex items-center gap-[6px] overflow-x-auto">
      <button
        className={`${CHIP} ${active === null ? 'bg-ink text-surface border-ink' : 'border-line text-dim hover:text-ink'}`}
        type="button"
        onClick={() => {
          onChange(null);
        }}
      >
        All
        <span className={COUNT}>{total}</span>
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
            <span className={COUNT}>{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
