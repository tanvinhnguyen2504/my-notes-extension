// The bare `row` class is a hook styles.css needs for the drag markers and
// `body.reminder .row`; the `group` class is how children read data-priority.

import { formatDayKeyShort } from '@/src/core/day_utils';
import { Task } from '@/src/core/types';
import { PRIORITY_LABELS } from '@/src/core/utils';

// Stated as priority AND not-done: Tailwind sorts utilities by property, not by
// the order written, so mutually exclusive variants are the only safe way.
export const FLAG_CLASS =
  'flex-none w-[9px] rounded-none transition-[width,background] duration-[120ms] ease-[ease] ' +
  'group-data-[priority=0]:group-data-[done=false]:bg-pri-low ' +
  'group-data-[priority=1]:group-data-[done=false]:bg-pri-medium ' +
  'group-data-[priority=2]:group-data-[done=false]:bg-pri-high';

export const TAG_CLASS =
  'flex-none py-[3px] px-[5px] rounded-[4px] text-[9.5px] font-medium leading-none tracking-[0.06em] ' +
  'group-data-[priority=0]:group-data-[done=false]:bg-tag-low-bg group-data-[priority=0]:group-data-[done=false]:text-tag-low-fg ' +
  'group-data-[priority=1]:group-data-[done=false]:bg-tag-medium-bg group-data-[priority=1]:group-data-[done=false]:text-tag-medium-fg ' +
  'group-data-[priority=2]:group-data-[done=false]:bg-tag-high-bg group-data-[priority=2]:group-data-[done=false]:text-tag-high-fg ' +
  'group-data-[done=true]:bg-hair group-data-[done=true]:text-soft';

export const DUE_CLASS =
  'flex-none py-[3px] px-[5px] rounded-[4px] text-[9.5px] font-medium leading-none tracking-[0.06em] ' +
  'text-dim bg-chip group-data-[done=true]:text-soft';

export interface RowProps {
  item: Task;
  boxTitle?: string;
  // Slots for the popup's interactive controls.
  text?: React.ReactNode;
  flag?: React.ReactNode;
  tag?: React.ReactNode;
  due?: React.ReactNode;
  children?: React.ReactNode;
  draggable?: boolean;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
  onToggle: () => void;
  onTextDoubleClick?: () => void;
  onDelete?: () => void;
}

export function NoteRow({
  item,
  boxTitle = 'Toggle done',

  text,
  flag,
  tag,
  due,
  children,
  draggable,
  dragHandlers,
  onToggle,
  onTextDoubleClick,
  onDelete,
}: RowProps): React.JSX.Element {
  return (
    <div
      className="row group flex items-stretch min-h-[44px] border-b border-hair"
      // Strings: React omits a `false` attribute entirely.
      data-priority={String(item.priority)}
      data-done={String(item.done)}
      draggable={draggable}
      {...dragHandlers}
    >
      {flag ?? <div className={FLAG_CLASS} />}
      <div className="flex-1 min-w-0 flex items-center gap-[11px] pr-[12px] pl-[9px] cursor-pointer hover:bg-hover">
        <button
          className="flex-none w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-box flex items-center justify-center text-[11px] leading-none text-on-teal group-data-[done=true]:bg-teal group-data-[done=true]:border-teal"
          type="button"
          title={boxTitle}
          onClick={onToggle}
        >
          {item.done ? '✓' : ''}
        </button>
        {text ?? (
          <span
            className="text flex-1 min-w-0 truncate cursor-text group-data-[done=true]:text-soft group-data-[done=true]:line-through"
            title={item.text}
            onDoubleClick={onTextDoubleClick}
          >
            {item.text}
          </span>
        )}
        {due ?? (item.dueDate ? <span className={DUE_CLASS}>{formatDayKeyShort(item.dueDate)}</span> : null)}
        {tag ?? <span className={TAG_CLASS}>{PRIORITY_LABELS[item.priority]}</span>}
        {onDelete ? (
          <button
            className="flex-none w-[20px] h-[20px] rounded-[5px] text-[15px] text-dim opacity-0 group-hover:opacity-100 hover:bg-chip hover:text-ink"
            type="button"
            title="Delete"
            onClick={onDelete}
          >
            ×
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
