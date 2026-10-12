import { EMemoType, MEMO_TYPE_LABELS } from '@/src/core/types/memos';
import { MEMO_TYPE_DOT } from './constants';

type Props = {
  type: EMemoType;
};

export function MemoLabel({ type }: Props): React.JSX.Element {
  return (
    <span className="flex-none inline-flex items-center gap-[6px] text-[10.5px] font-medium leading-none tracking-[0.06em] text-dim">
      <span className={`flex-none w-[6px] h-[6px] rounded-full ${MEMO_TYPE_DOT[type]}`} />
      {MEMO_TYPE_LABELS[type]}
    </span>
  );
}
