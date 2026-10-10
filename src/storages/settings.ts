// The settings slice, now including `theme`.

import { Settings, Theme } from '../core/types.ts';
import { DEFAULT_SETTINGS, THEME, WIDTH, isRecord, isTimeOfDay, preferredTheme } from '../core/utils.ts';
import { readDataByKeyFromStorage, writeKey } from './local.ts';

export const SETTINGS_KEY = 'settings.v1';

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
    reminder: {
      enabled: !!reminder.enabled,
      time: isTimeOfDay(reminder.time) ? reminder.time : DEFAULT_SETTINGS.reminder.time,
    },
  };
}

export function loadSettings(): Promise<Settings> {
  return readDataByKeyFromStorage(SETTINGS_KEY, normalizeSettings);
}

export function saveSettings(settings: Settings): void {
  writeKey(SETTINGS_KEY, settings);
}
