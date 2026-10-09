import { query } from "../core/dom.ts";
import { State } from "../core/types.ts";
import { THEME, WIDTH } from "../core/utils.ts";

// One nullable object rather than seven `X | null` module variables: strict mode
// does not narrow a module variable across a function call, so this is one guard
// per function instead of seven.
interface Controls {
  panel: HTMLElement;
  trigger: HTMLElement;
  theme: HTMLElement;
  width: HTMLElement;
  reminder: HTMLElement;
  reminderTime: HTMLInputElement;
  reminderTimeRow: HTMLElement;
}

let controls: Controls | null = null;

export interface InstallSettingsOptions {
  panel: HTMLElement;
  trigger: HTMLElement;
  onToggleTheme: () => void;
  onToggleWidth: () => void;
  onToggleReminder: () => void;
  onPickReminderTime: (time: string) => void;
}

export function isSettingsOpen(): boolean {
  return controls !== null && !controls.panel.hidden;
}

export function closeSettings(): void {
  if (!controls || controls.panel.hidden) {
    return;
  }
  controls.panel.hidden = true;
  controls.trigger.setAttribute("aria-expanded", "false");
}

function toggleSettings(): void {
  if (!controls) {
    return;
  }
  const opening = controls.panel.hidden;
  controls.panel.hidden = !opening;
  controls.trigger.setAttribute("aria-expanded", String(opening));
  if (opening) {
    controls.theme.focus();
  }
}

// Called on every render: a preference can change from somewhere other than its
// own switch.
export function renderSettings(state: State): void {
  if (!controls) {
    return;
  }
  controls.theme.setAttribute("aria-checked", String(state.theme === THEME.DARK));
  controls.width.setAttribute("aria-checked", String(state.settings.width === WIDTH.WIDE));

  const { enabled, time } = state.settings.reminder;
  controls.reminder.setAttribute("aria-checked", String(enabled));
  // A time with no reminder to attach it to is just clutter.
  controls.reminderTimeRow.hidden = !enabled;
  // Assigning unconditionally would fight the user mid-edit, since the control
  // reports a change per field.
  if (controls.reminderTime.value !== time) {
    controls.reminderTime.value = time;
  }
}

export function installSettings({
  panel,
  trigger,
  onToggleTheme,
  onToggleWidth,
  onToggleReminder,
  onPickReminderTime,
}: InstallSettingsOptions): void {
  const reminderTime = query<HTMLInputElement>(panel, "#set-reminder-time");
  controls = {
    panel,
    trigger,
    theme: query(panel, "#set-theme"),
    width: query(panel, "#set-width"),
    reminder: query(panel, "#set-reminder"),
    reminderTime,
    reminderTimeRow: query(panel, "#set-reminder-time-row"),
  };

  trigger.addEventListener("click", toggleSettings);
  controls.theme.addEventListener("click", onToggleTheme);
  controls.width.addEventListener("click", onToggleWidth);
  controls.reminder.addEventListener("click", onToggleReminder);
  // "change" not "input": input would report half-typed times like "0:30".
  reminderTime.addEventListener("change", () => onPickReminderTime(reminderTime.value));

  // The menu's own Escape handler returns early when no menu is open, so the
  // two do not fight over the key.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isSettingsOpen()) {
      return;
    }
    closeSettings();
    trigger.focus();
  });
}
