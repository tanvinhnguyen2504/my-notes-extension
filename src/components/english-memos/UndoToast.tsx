import { stripBrackets } from '@/src/core/english_utils';
import { EnglishItem } from '@/src/core/types/english';

type Props = {
  item: EnglishItem;
  onUndo: () => void;
};

export function UndoToast({ item, onUndo }: Props): React.JSX.Element {
  return (
    <div
      className="absolute left-[12px] right-[12px] bottom-[86px] z-20 flex items-center gap-[10px] h-[40px] px-[12px] rounded-[10px] bg-ink text-surface shadow-menu"
      role="status"
    >
      <span className="flex-1 min-w-0 truncate text-[12px]">Deleted &ldquo;{stripBrackets(item.en)}&rdquo;</span>
      <button className="flex-none text-[12px] font-semibold underline" type="button" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
