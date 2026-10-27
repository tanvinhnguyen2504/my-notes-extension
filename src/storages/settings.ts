import { PopupMode, Settings, Theme } from '@/src/core/types';
import { DEFAULT_SETTINGS, THEME, WIDTH, clampWideWidth, isRecord, isTimeOfDay, preferredTheme } from '@/src/core/utils';
import { getDataFromStorageByKey, setDataToStorageByKey } from './local';

export const SETTINGS_KEY = 'settings.v1';

function savedMode(value: unknown): PopupMode {
  if (value === 'memos' || value === 'english') {
    return value;
  }
  return 'tasks';
}

function savedTheme(value: unknown): Theme {
  if (value === THEME.DARK) {
    return THEME.DARK;
  }
  if (value === THEME.LIGHT) {
    return THEME.LIGHT;
  }
  return preferredTheme();
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
