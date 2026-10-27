import { ENGLISH_TYPE_LABELS, ENGLISH_TYPE_ORDER, EnglishType } from '@/src/core/types/english';

const CHIP =
  'flex-none inline-flex items-center gap-[5px] h-[26px] px-[9px] rounded-[7px] border text-[10.5px] font-medium leading-none';
const ON = 'bg-ink text-surface border-ink';
const OFF = 'border-line text-dim hover:text-ink';
const COUNT = 'font-mono opacity-60';

type Props = {
  active: EnglishType | null;
  counts: Record<EnglishType, number>;
  total: number;
  onChange: (type: EnglishType | null) => void;
};

export function EnglishFilter({ active, counts, total, onChange }: Props): React.JSX.Element {
  return (
    <div className="flex-none flex items-center gap-[6px]" role="group" aria-label="Filter by type">
      <button
        id="btn-english-all"
        className={`${CHIP} ${active === null ? ON : OFF}`}
        type="button"
        aria-pressed={active === null}
        onClick={() => {
          onChange(null);
        }}
      >
        All
        <span className={COUNT}>{total}</span>
      </button>

      {ENGLISH_TYPE_ORDER.map((type) => {
        const on = active === type;
        return (
          <button
            key={type}
            id={`btn-english-${type}`}
            className={`${CHIP} ${on ? ON : OFF}`}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onChange(on ? null : type);
            }}
          >
            {ENGLISH_TYPE_LABELS[type]}
            <span className={COUNT}>{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
