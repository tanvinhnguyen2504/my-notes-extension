// Styled from Radix's own state attributes: data-state on the radio item for
// the checked colour and tick, and data-highlighted for the hover/keyboard
// state. Radix focuses items programmatically, where :focus-visible is a
// browser heuristic rather than a guarantee -- data-highlighted covers pointer
// and keyboard alike.
//
// The item is a `group` so the swatch and the tick can read its data-priority
// and data-state.

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Priority } from '../core/types.ts';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '../core/utils.ts';

const ITEM =
  'group flex items-center gap-[8px] w-full h-[30px] px-[8px] rounded-[7px] ' +
  'text-[10.5px] font-medium leading-none tracking-[0.06em] text-dim text-left ' +
  'hover:bg-hover hover:text-ink ' +
  'data-[highlighted]:bg-hover data-[highlighted]:text-ink data-[highlighted]:outline-0 ' +
  'data-[state=checked]:text-ink';

const DOT =
  'flex-none w-[9px] h-[9px] rounded-full border border-box bg-transparent ' +
  'group-data-[priority=0]:bg-pri-low group-data-[priority=0]:border-pri-low ' +
  'group-data-[priority=1]:bg-pri-medium group-data-[priority=1]:border-pri-medium ' +
  'group-data-[priority=2]:bg-pri-high group-data-[priority=2]:border-pri-high';

export interface PriorityMenuProps {
  current: Priority;
  onPick: (priority: Priority) => void;
  children: React.ReactNode;
}

export function PriorityMenu({ current, onPick, children }: PriorityMenuProps): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-10 min-w-[132px] p-[4px] bg-surface border border-line rounded-[10px] shadow-menu"
          role="menu"
          aria-label="Set priority"
          side="bottom"
          align="start"
          sideOffset={2}
          collisionPadding={6}
        >
          <DropdownMenu.RadioGroup
            value={String(current)}
            onValueChange={(value) => {
              onPick(Number(value) as Priority);
            }}
          >
            {PRIORITY_ORDER.map((priority) => {
              return (
                <DropdownMenu.RadioItem
                  key={priority}
                  className={ITEM}
                  value={String(priority)}
                  data-priority={String(priority)}
                >
                  <span className={DOT} />
                  <span className="flex-1">{PRIORITY_LABELS[priority]}</span>
                  <span className="flex-none text-teal opacity-0 group-data-[state=checked]:opacity-100">✓</span>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
