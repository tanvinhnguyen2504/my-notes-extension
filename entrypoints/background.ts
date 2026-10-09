import { defineBackground } from "wxt/utils/define-background";
import { getHighPriorityItems, loadState, nextReminderTime } from "../src/core/utils.ts";

const ALARM_NAME = "reminder.daily";
const DAY_IN_MINUTES = 1440;
const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 520;

// Brings the alarm in line with the saved setting.
async function syncAlarm(): Promise<void> {
  const state = await loadState();
  const { enabled, time } = state.settings.reminder;
  const existing = await chrome.alarms.get(ALARM_NAME);

  if (!enabled) {
    if (existing) {
      await chrome.alarms.clear(ALARM_NAME);
    }
    return;
  }

  // Runs on every storage write, including the reminder window ticking an item
  // off. Recreating it each time would push the next reminder further away, so
  // only touch it when the target has actually moved.
  const when = nextReminderTime(time);
  if (existing && Math.abs(existing.scheduledTime - when) < 60_000) {
    return;
  }

  await chrome.alarms.create(ALARM_NAME, { when, periodInMinutes: DAY_IN_MINUTES });
}

// Centred on the last-focused window, which is what makes it read as a dialog
// rather than a stray window.
async function openReminderWindow(): Promise<void> {
  const position: { left?: number; top?: number } = {};
  try {
    const { left, top, width, height } = await chrome.windows.getLastFocused();
    // All four are optional, so centre only when the whole rect is known.
    if (
      left !== undefined &&
      top !== undefined &&
      width !== undefined &&
      height !== undefined
    ) {
      position.left = Math.round(left + (width - WINDOW_WIDTH) / 2);
      position.top = Math.round(top + (height - WINDOW_HEIGHT) / 2);
    }
  } catch (_) {
    // Rejects when no window is open; let the browser place it rather than
    // throwing where nothing would see the error.
  }

  await chrome.windows.create({
    // Resolved against the extension root, where WXT emits HTML entrypoints
    // flattened.
    url: "reminder.html",
    type: "popup",
    focused: true,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    ...position,
  });
}

// WXT imports this module at build time, so nothing may touch `chrome` at the
// top level. main() runs synchronously at every worker startup, which is what
// keeps an idle-terminated worker wakeable -- so nothing here may sit behind an
// `await` either.
export default defineBackground({
  type: "module",
  main() {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== ALARM_NAME) {
        return;
      }

      const state = await loadState();
      // Re-checked: the alarm can outlive the setting being switched off while
      // the worker was asleep.
      if (!state.settings.reminder.enabled) {
        return;
      }
      // An empty reminder is pure interruption.
      if (!getHighPriorityItems(state.items).length) {
        return;
      }

      await openReminderWindow();
    });

    chrome.runtime.onInstalled.addListener(syncAlarm);
    chrome.runtime.onStartup.addListener(syncAlarm);
    chrome.storage.onChanged.addListener((_, area) => {
      if (area === "local") {
        syncAlarm();
      }
    });
  },
});
