import { PopupMode, Settings, ThemePreference } from '@/src/core/types';
import { DEFAULT_SETTINGS, THEME_PREFERENCE, WIDTH, clampWideWidth, isRecord, isTimeOfDay } from '@/src/core/utils';
import { getDataFromStorageByKey, setDataToStorageByKey } from './local';

export const SETTINGS_KEY = 'settings.v1';

function savedMode(value: unknown): PopupMode {
  if (value === 'memos' || value === 'english') {
    return value;
  }
  return 'tasks';
}

// No migration step for the pre-SYSTEM layout, and none is needed: anything
// that is not an explicit 'light' or 'dark' -- a legacy boolean included --
// falls through to SYSTEM, which resolves to the OS preference. That is the
// same thing the old code did by calling preferredTheme() here.
function savedTheme(value: unknown): ThemePreference {
  if (value === THEME_PREFERENCE.LIGHT) {
    return THEME_PREFERENCE.LIGHT;
  }
  if (value === THEME_PREFERENCE.DARK) {
    return THEME_PREFERENCE.DARK;
  }
  return THEME_PREFERENCE.SYSTEM;
}

export function normalizeSettings(saved: unknown): Settings {
  const source = isRecord(saved) ? saved : {};
  const reminder = isRecord(source.reminder) ? source.reminder : {};
  return {
    theme: savedTheme(source.theme),
    width: source.width === WIDTH.WIDE ? WIDTH.WIDE : WIDTH.COMPACT,
    wideWidth: clampWideWidth(source.wideWidth),
    mode: savedMode(source.mode),
    reminder: {
      enabled: !!reminder.enabled,
      time: isTimeOfDay(reminder.time) ? reminder.time : DEFAULT_SETTINGS.reminder.time,
    },
  };
}

export function loadSettings(): Promise<Settings> {
  return getDataFromStorageByKey(SETTINGS_KEY, normalizeSettings);
}

export function saveSettings(settings: Settings): void {
  setDataToStorageByKey(SETTINGS_KEY, settings);
}
