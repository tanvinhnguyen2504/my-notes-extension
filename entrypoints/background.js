import { defineBackground } from "wxt/utils/define-background";
import { getHighPriorityItems, loadState, nextReminderTime } from "../src/core/utils.ts";

const ALARM_NAME = "reminder.daily";
const DAY_IN_MINUTES = 1440;
const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 520;

// Creates, updates, or clears the alarm to match the saved setting.
async function syncAlarm() {
  const state = await loadState();
  const { enabled, time } = state.settings.reminder;
  const existing = await chrome.alarms.get(ALARM_NAME);

  if (!enabled) {
    if (existing) {
      await chrome.alarms.clear(ALARM_NAME);
    }
    return;
  }

  // This runs on every storage write, including the reminder window ticking an
  // item off. Recreating the alarm each time would quietly push the next one
  // further away, so only touch it when the target has actually moved.
  const when = nextReminderTime(time);
  if (existing && Math.abs(existing.scheduledTime - when) < 60_000) {
    return;
  }

  await chrome.alarms.create(ALARM_NAME, { when, periodInMinutes: DAY_IN_MINUTES });
}

// Centred on whichever browser window the user was last in, which is what makes
// this read as a dialog rather than as a stray window.
async function openReminderWindow() {
  const position = {};
  try {
    const { left, top, width, height } = await chrome.windows.getLastFocused();
    position.left = Math.round(left + (width - WINDOW_WIDTH) / 2);
    position.top = Math.round(top + (height - WINDOW_HEIGHT) / 2);
  } catch (_) {
    // getLastFocused rejects when no window is open. Let the browser place it
    // rather than throwing in a worker where the error would go unseen.
  }

  await chrome.windows.create({
    url: "reminder.html",
    type: "popup",
    focused: true,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    ...position,
  });
}

// WXT imports this module at build time to read the options, so nothing may
// touch `chrome` at the top level. main() runs synchronously on every worker
// startup, which is what keeps the listeners registered early enough for an
// idle-terminated worker to be woken for their events -- so nothing in here may
// sit behind an `await` either.
export default defineBackground({
  type: "module",
  main() {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== ALARM_NAME) {
        return;
      }

      const state = await loadState();
      // Re-checked rather than trusted: the alarm may outlive the setting being
      // switched off, if the worker was asleep when that happened.
      if (!state.settings.reminder.enabled) {
        return;
      }
      // An empty reminder is pure interruption, so there is nothing to show.
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
