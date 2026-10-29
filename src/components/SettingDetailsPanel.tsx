import { useEffect, useState } from 'react';
import { State, ThemePreference } from '@/src/core/types';
import { WIDTH } from '@/src/core/utils';
import { SettingSwitch } from './SettingSwitch.tsx';
import { ThemeSetting } from './ThemeSetting';

function ReminderTime({ time, onPick }: { time: string; onPick: (time: string) => void }): React.JSX.Element {
  const [draft, setDraft] = useState(time);

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

type SettingDetailsPanelProps = {
  state: State;
  onPickTheme: (preference: ThemePreference) => void;
  onToggleWidth: () => void;
  onToggleReminder: () => void;
  onPickReminderTime: (time: string) => void;
};

export function SettingDetailsPanel({
  state,
  onPickTheme,
  onToggleWidth,
  onToggleReminder,
  onPickReminderTime,
}: SettingDetailsPanelProps): React.JSX.Element {
  const { enabled, time } = state.settings.reminder;

  return (
    <section id="settings-panel" className="flex-none pt-[4px] px-[16px] pb-[10px] bg-surface border-b border-line">
      <ThemeSetting value={state.settings.theme} onChange={onPickTheme} />
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
    </section>
  );
}
