// Drives entrypoints/background.ts with a hand-rolled chrome stub and no DOM at
// all -- the service worker's real environment.
//
// Importing the entrypoint and calling .main() by hand only works because
// wxt.config.ts sets `imports: false`, which makes defineBackground a real
// import rather than one of WXT's auto-injected globals. If auto-imports are
// ever turned back on, this file fails at import time with
// "defineBackground is not defined".
// chrome-global must come first: it installs the chrome global before the
// hoisted import of utils.ts latches hasChromeStorage. See that file.
import { setChrome } from "./chrome-global.ts";
import assert from "node:assert/strict";
import { STORAGE_KEY } from "../src/core/utils.ts";
import type { State } from "../src/core/types.ts";

const ALARM_NAME = "reminder.daily";

interface StubAlarm {
  name: string;
  scheduledTime: number;
}

interface Stub {
  stored: Record<string, unknown>;
  alarms: Map<string, StubAlarm>;
  created: { when: number; periodInMinutes?: number }[];
  cleared: string[];
  windows: unknown[];
  listeners: {
    alarm: ((alarm: StubAlarm) => unknown)[];
    installed: (() => unknown)[];
    startup: (() => unknown)[];
    changed: ((changes: unknown, area: string) => unknown)[];
  };
}

function installStub(state: State | null): Stub {
  const stub: Stub = {
    stored: state ? { [STORAGE_KEY]: state } : {},
    alarms: new Map(),
    created: [],
    cleared: [],
    windows: [],
    listeners: { alarm: [], installed: [], startup: [], changed: [] },
  };

  const chromeStub = {
    storage: {
      local: {
        get: (_keys: string[], cb: (result: Record<string, unknown>) => void) =>
          cb(stub.stored),
        set: (items: Record<string, unknown>) => Object.assign(stub.stored, items),
      },
      onChanged: {
        addListener: (fn: (changes: unknown, area: string) => unknown) =>
          stub.listeners.changed.push(fn),
      },
    },
    alarms: {
      get: async (name: string) => stub.alarms.get(name),
      clear: async (name: string) => {
        stub.cleared.push(name);
        stub.alarms.delete(name);
      },
      create: async (name: string, info: { when: number; periodInMinutes?: number }) => {
        stub.created.push(info);
        stub.alarms.set(name, { name, scheduledTime: info.when });
      },
      onAlarm: {
        addListener: (fn: (alarm: StubAlarm) => unknown) => stub.listeners.alarm.push(fn),
      },
    },
    windows: {
      getLastFocused: async () => ({ left: 0, top: 0, width: 1200, height: 800 }),
      create: async (options: unknown) => {
        stub.windows.push(options);
      },
    },
    runtime: {
      onInstalled: { addListener: (fn: () => unknown) => stub.listeners.installed.push(fn) },
      onStartup: { addListener: (fn: () => unknown) => stub.listeners.startup.push(fn) },
    },
  };

  setChrome(chromeStub);
  return stub;
}

function makeState(over: Partial<State["settings"]["reminder"]>, items: State["items"] = []): State {
  return {
    items,
    theme: "light",
    settings: { width: "compact", reminder: { enabled: true, time: "09:00", ...over } },
  };
}

// The worker has neither of these. background.ts must not care.
assert.equal(typeof globalThis.window, "undefined");
assert.equal(typeof globalThis.document, "undefined");

// One import for the whole file: Node caches ES modules by specifier, so the
// entrypoint is evaluated once and main() is re-run against a fresh stub each
// time instead.
const stub0 = installStub(makeState({ enabled: false }));
const entry = await import("../entrypoints/background.ts");
const main = entry.default.main;
assert.equal(typeof main, "function", "defineBackground exposes main()");

// --- listeners are registered synchronously ---------------------------
// An MV3 worker is terminated when idle and woken for a registered event. A
// listener added after an await would miss the event that woke the worker.

main!();
assert.equal(stub0.listeners.alarm.length, 1, "onAlarm registered");
assert.equal(stub0.listeners.installed.length, 1, "onInstalled registered");
assert.equal(stub0.listeners.startup.length, 1, "onStartup registered");
assert.equal(stub0.listeners.changed.length, 1, "storage.onChanged registered");

// --- syncAlarm ---------------------------------------------------------

// Disabled, no existing alarm: nothing to do, and nothing to clear.
await stub0.listeners.installed[0]!();
assert.deepEqual(stub0.created, [], "disabled creates no alarm");
assert.deepEqual(stub0.cleared, [], "nothing to clear when there was no alarm");

// Disabled with an alarm left over from when it was on: cleared.
const stub1 = installStub(makeState({ enabled: false }));
stub1.alarms.set(ALARM_NAME, { name: ALARM_NAME, scheduledTime: Date.now() + 1000 });
main!();
await stub1.listeners.installed[0]!();
assert.deepEqual(stub1.cleared, [ALARM_NAME], "a stale alarm is cleared when disabled");

// Enabled, no alarm yet: created once, repeating daily.
const stub2 = installStub(makeState({ enabled: true, time: "09:00" }));
main!();
await stub2.listeners.installed[0]!();
assert.equal(stub2.created.length, 1, "enabled creates the alarm");
assert.equal(stub2.created[0]?.periodInMinutes, 1440, "repeats daily");

// This is the one that matters. background.ts re-syncs on every storage write,
// and the reminder window writes whenever an item is ticked. Recreating the
// alarm unconditionally would push each day's reminder further away every time
// the previous one was used.
const before = stub2.created.length;
await stub2.listeners.changed[0]!({}, "local");
await stub2.listeners.changed[0]!({}, "local");
await stub2.listeners.changed[0]!({}, "local");
assert.equal(
  stub2.created.length,
  before,
  "an alarm already at the computed time is left alone, not pushed later"
);

// A write to another storage area is not ours.
const stub3 = installStub(makeState({ enabled: true }));
main!();
await stub3.listeners.changed[0]!({}, "sync");
assert.deepEqual(stub3.created, [], "only the local area triggers a re-sync");

// --- the alarm firing --------------------------------------------------

const highPriority: State["items"] = [
  { text: "pay rent", done: false, priority: 2, updatedAt: null, dueDate: null },
];

// Wrong alarm name: ignored entirely.
const stub4 = installStub(makeState({ enabled: true }, highPriority));
main!();
await stub4.listeners.alarm[0]!({ name: "something.else", scheduledTime: 0 });
assert.deepEqual(stub4.windows, [], "a foreign alarm opens nothing");

// Re-checked rather than trusted: the alarm can outlive the setting being
// switched off, if the worker was asleep when that happened.
const stub5 = installStub(makeState({ enabled: false }, highPriority));
main!();
await stub5.listeners.alarm[0]!({ name: ALARM_NAME, scheduledTime: 0 });
assert.deepEqual(stub5.windows, [], "disabled between scheduling and firing opens nothing");

// An empty reminder is pure interruption.
const stub6 = installStub(makeState({ enabled: true }, [
  { text: "already done", done: true, priority: 2, updatedAt: null, dueDate: null },
  { text: "not urgent", done: false, priority: 1, updatedAt: null, dueDate: null },
]));
main!();
await stub6.listeners.alarm[0]!({ name: ALARM_NAME, scheduledTime: 0 });
assert.deepEqual(stub6.windows, [], "nothing outstanding and high priority, so no window");

// The real case.
const stub7 = installStub(makeState({ enabled: true }, highPriority));
main!();
await stub7.listeners.alarm[0]!({ name: ALARM_NAME, scheduledTime: 0 });
assert.equal(stub7.windows.length, 1, "outstanding high-priority work opens the window");
const opened = stub7.windows[0] as Record<string, unknown>;
assert.equal(
  opened.url,
  "reminder.html",
  "resolved against the extension root, where WXT emits HTML entrypoints flattened"
);
assert.equal(opened.type, "popup");
assert.equal(opened.focused, true);
// Centred on the last focused window: (1200 - 440) / 2, (800 - 520) / 2.
assert.equal(opened.left, 380);
assert.equal(opened.top, 140);

console.log("verify/background.ts ok");
