// The top row is chips only, matching MemoPage's: search lives in the footer
// on both tabs now.

import { EnglishType } from '@/src/core/types/english';
import { EnglishFilter } from './EnglishMemoFilter';

type Props = {
  active: EnglishType | null;
  counts: Record<EnglishType, number>;
  total: number;
  onTypeChange: (type: EnglishType | null) => void;
};

export function EnglishMemoToolbar({ active, counts, total, onTypeChange }: Props): React.JSX.Element {
  return (
    <div className="group flex-none flex items-center gap-[8px] px-[12px] pb-[10px]">
      <EnglishFilter active={active} counts={counts} total={total} onChange={onTypeChange} />
    </div>
  );
}
