import { DayKey, Item, Priority } from '../core/types.ts';
import { PRIORITY_LABELS } from '../core/utils.ts';
import { DueChip } from './DueChip.tsx';
import { EditableText } from './EditableText.tsx';
import { FLAG_CLASS, NoteRow, TAG_CLASS } from './NoteRow.tsx';
import { PriorityMenu } from './PriorityMenu.tsx';

// Both triggers dim slightly while their menu is open. aria-expanded is what
// Radix puts on the trigger it was given through asChild.
const TRIGGER = 'hover:brightness-[0.92] aria-expanded:brightness-[0.92]';

export interface PopupRowProps {
  item: Item;
  index: number;
  dayKey: DayKey | null;
  editing: boolean;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (text: string) => void;
  onSetPriority: (priority: Priority) => void;
  onSetDay: (dayKey: DayKey | null) => void;
  dragHandlers: React.HTMLAttributes<HTMLElement>;
}

export function PopupRow({
  item,
  editing,
  onStartEditing,
  onStopEditing,
  onToggle,
  onDelete,
  onRename,
  onSetPriority,
  onSetDay,
  dragHandlers,
}: PopupRowProps): React.JSX.Element {
  return (
    <NoteRow
      item={item}
      onToggle={onToggle}
      onDelete={onDelete}
      // A draggable ancestor swallows text selection, so editing turns it off.
      draggable={!editing}
      dragHandlers={dragHandlers}
      onTextDoubleClick={onStartEditing}
      text={
        editing ? (
          <EditableText
            initial={item.text}
            onCommit={(text) => {
              onRename(text);
              onStopEditing();
            }}
            onCancel={onStopEditing}
          />
        ) : undefined
      }
      flag={
        <PriorityMenu current={item.priority} onPick={onSetPriority}>
          <button className={FLAG_CLASS} type="button" title="Set priority" />
        </PriorityMenu>
      }
      tag={
        <PriorityMenu current={item.priority} onPick={onSetPriority}>
          <button className={`${TAG_CLASS} ${TRIGGER}`} type="button" title="Set priority">
            {PRIORITY_LABELS[item.priority]}
          </button>
        </PriorityMenu>
      }
      due={<DueChip item={item} onPick={onSetDay} />}
    />
  );
}
