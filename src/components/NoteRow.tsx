// The shared row, used by both pages. It must stay free of reducer dispatch,
// drag wiring and Radix imports -- the popup's interactive behaviour belongs in
// a wrapper, not in here.
//
// The row is Tailwind's `group`, which is how the child utilities below reach
// its data-priority and data-done. It also keeps the bare `row` class: that is
// the hook styles.css needs for the four classList drag markers and for
// `body.reminder .row`.

import { formatDayKeyShort } from '../core/day_utils.ts';
import { Task } from '../core/types.ts';
import { PRIORITY_LABELS } from '../core/utils.ts';

// Priority colour is stated as priority AND not-done, rather than relying on
// source order. The CSS this replaced had the done rule sitting below the three
// priority rules at equal specificity, so swapping their order silently left
// finished rows shouting in full colour. Utilities are sorted by the compiler
// rather than by the order they are written, so mutually exclusive variants are
// the only safe way to say it.
//
// These three are exported because PopupRow renders its own interactive flag,
// pill and chip into the slots below and they must look identical.
export const FLAG_CLASS =
  'flex-none w-[9px] rounded-none transition-[width,background] duration-[120ms] ease-[ease] ' +
  'group-data-[priority=0]:group-data-[done=false]:bg-pri-low ' +
  'group-data-[priority=1]:group-data-[done=false]:bg-pri-medium ' +
  'group-data-[priority=2]:group-data-[done=false]:bg-pri-high';

// The last line is the one that matters: a completed task's priority stops
// mattering and the pill steps back.
export const TAG_CLASS =
  'flex-none py-[3px] px-[5px] rounded-[4px] text-[9.5px] font-medium leading-none tracking-[0.06em] ' +
  'group-data-[priority=0]:group-data-[done=false]:bg-tag-low-bg group-data-[priority=0]:group-data-[done=false]:text-tag-low-fg ' +
  'group-data-[priority=1]:group-data-[done=false]:bg-tag-medium-bg group-data-[priority=1]:group-data-[done=false]:text-tag-medium-fg ' +
  'group-data-[priority=2]:group-data-[done=false]:bg-tag-high-bg group-data-[priority=2]:group-data-[done=false]:text-tag-high-fg ' +
  'group-data-[done=true]:bg-hair group-data-[done=true]:text-soft';

// Deliberately quieter than the priority pill -- it is a date, not a state, and
// it should not compete with the task text.
export const DUE_CLASS =
  'flex-none py-[3px] px-[5px] rounded-[4px] text-[9.5px] font-medium leading-none tracking-[0.06em] ' +
  'text-dim bg-chip group-data-[done=true]:text-soft';

export interface RowProps {
  item: Task;
  onToggle: () => void;
  boxTitle?: string;
  onTextDoubleClick?: () => void;
  onDelete?: () => void;
  // Slots, so the popup can inject its interactive controls without this
  // component knowing what they are.
  text?: React.ReactNode;
  flag?: React.ReactNode;
  tag?: React.ReactNode;
  due?: React.ReactNode;
  children?: React.ReactNode;
  draggable?: boolean;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
}

export function NoteRow({
  item,
  onToggle,
  boxTitle = 'Toggle done',
  onTextDoubleClick,
  onDelete,
  text,
  flag,
  tag,
  due,
  children,
  draggable,
  dragHandlers,
}: RowProps): React.JSX.Element {
  return (
    <div
      className="row group flex items-stretch min-h-[44px] border-b border-hair"
      // Strings, not booleans: React omits a `false` attribute entirely, and
      // every group-data variant above matches on the literal "false".
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
