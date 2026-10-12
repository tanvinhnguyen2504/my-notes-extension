import { EMemoType, MEMO_SUBTYPES, MemoSubType } from '@/src/core/types/memos';
import { MEMO_OPTION_LABELS, MEMO_SUBTYPE_LABELS } from './constants';

type Props = {
  type: EMemoType;
  subType: MemoSubType;
  onChange: (subType: MemoSubType) => void;
};

export function MemoOptionRow({ type, subType, onChange }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="text-[10px] font-mono tracking-[0.12em] text-dim">{MEMO_OPTION_LABELS[type]}</div>
      <div className="flex flex-wrap items-center gap-[6px]">
        {MEMO_SUBTYPES[type].map((option) => {
          const on = option === subType;
          return (
            <button
              key={option}
              className={`flex-none h-[24px] px-[9px] rounded-[7px] border font-mono text-[10.5px] leading-none ${
                on ? 'border-teal text-teal bg-chip' : 'border-line text-dim hover:text-ink'
              }`}
              type="button"
              onClick={() => {
                onChange(option);
              }}
            >
              {MEMO_SUBTYPE_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
