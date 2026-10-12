import { EMemoType } from '@/src/core/types/memos';
import { MEMO_BODY_HINTS, MEMO_BODY_LABELS } from './constants';

type Props = {
  type: EMemoType;
  value: string;
  onChange: (value: string) => void;
};

export function MemoBodyField({ type, value, onChange }: Props): React.JSX.Element {
  const lines = value === '' ? 0 : value.split('\n').length;

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-[0.12em] text-dim">{MEMO_BODY_LABELS[type]}</span>
        <span className="text-[10px] font-mono text-dim">
          {lines} {lines === 1 ? 'line' : 'lines'}
        </span>
      </div>
      <textarea
        id="memo-body"
        className="w-full min-h-[112px] resize-y rounded-[7px] bg-code-bg px-[10px] py-[9px] font-mono text-[11.5px] leading-[1.5] text-code-ink outline-0"
        value={value}
        spellCheck={false}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <div className="text-[10.5px] text-dim">{MEMO_BODY_HINTS[type]}</div>
    </div>
  );
}
