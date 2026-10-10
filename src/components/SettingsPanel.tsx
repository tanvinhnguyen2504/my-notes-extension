// Collapsible rather than a conditional render: it keeps the panel in the tree,
// gives data-state to style from, and wires aria-expanded on the trigger.

import * as Collapsible from '@radix-ui/react-collapsible';
import { useEffect, useState } from 'react';
import { State } from '../core/types.ts';
import { THEME, WIDTH } from '../core/utils.ts';
import { CHIP_HOVER, CHIP_ICON } from './Header.tsx';
import { SettingSwitch } from './SettingSwitch.tsx';

export interface SettingsPanelProps {
  state: State;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleTheme: () => void;
  onToggleWidth: () => void;
  onToggleReminder: () => void;
  onPickReminderTime: (time: string) => void;
}

export function SettingsPanel({
  state,
  open,
  onOpenChange,
  onToggleTheme,
  onToggleWidth,
  onToggleReminder,
  onPickReminderTime,
}: SettingsPanelProps): React.JSX.Element {
  const { enabled, time } = state.settings.reminder;

  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      <Collapsible.Trigger asChild>
        <button className={`${CHIP_ICON} ${CHIP_HOVER}`} type="button" title="Settings" aria-label="Settings">
          ⚙
        </button>
      </Collapsible.Trigger>

      {/* In flow between the progress bar and the list, so opening it shrinks
          the list rather than covering it: the list is flex-1 and gives up the
          space. An overlay would have to re-create that sizing by hand. Radix
          sets data-state and the `hidden` attribute when closed; keying the
          utility off data-state keeps it readable without relying on the UA
          stylesheet, which Preflight is not here to normalise. */}
      <Collapsible.Content
        className="flex-none pt-[4px] px-[16px] pb-[10px] bg-surface border-b border-line data-[state=closed]:hidden"
        id="settings-panel"
      >
        <SettingSwitch
          id="set-theme"
          label="Dark mode"
          checked={state.settings.theme === THEME.DARK}
          onToggle={onToggleTheme}
        />
        <SettingSwitch
          id="set-width"
          label="Wide mode"
          hint="Widen the popup and show the full task text"
          checked={state.settings.width === WIDTH.WIDE}
          onToggle={onToggleWidth}
        />
        <SettingSwitch
          id="set-reminder"
          label="Daily reminder"
          hint="Opens a window listing your high-priority tasks"
          checked={enabled}
          onToggle={onToggleReminder}
        />
        {enabled ? <ReminderTime time={time} onPick={onPickReminderTime} /> : null}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

// React's onChange is the DOM's `input` event, which fires per field of a time
// control -- so a controlled value bound straight to state would overwrite
// "0:3" with the last good time while the user was still typing. Local state
// holds what is being typed; only a complete time reaches the reducer, which
// rejects the rest through isTimeOfDay.
function ReminderTime({ time, onPick }: { time: string; onPick: (time: string) => void }): React.JSX.Element {
  const [draft, setDraft] = useState(time);

  // Re-sync when the saved time changes from somewhere other than this field.
  useEffect(() => {
    setDraft(time);
  }, [time]);

  return (
    <div className="flex items-center gap-[10px] min-h-[36px]" id="set-reminder-time-row">
      <span className="flex-1 min-w-0 text-[12.5px]" id="set-reminder-time-label">
        Remind me at
      </span>
      <input
        id="set-reminder-time"
        className="flex-none py-[4px] px-[6px] border border-line rounded-[6px] bg-chip text-[11px] font-medium leading-none text-ink"
        type="time"
        value={draft}
        aria-labelledby="set-reminder-time-label"
        onChange={(event) => {
          setDraft(event.target.value);
          onPick(event.target.value);
        }}
      />
    </div>
  );
}
