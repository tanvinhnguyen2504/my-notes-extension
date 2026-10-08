// Drives src/core/utils.ts in plain node, with no window, no document and no
// stubs of any kind. That absence is the point: it is the service worker's
// environment, and the one case where a stray window reference in utils.ts
// fails silently in production.
//
// Node 26 strips types natively, so this runs as `node verify/utils.ts` with no
// build step. That is why utils.ts may not use non-erasable syntax (enum,
// namespace, parameter properties) and why imports carry explicit .ts
// extensions -- erasableSyntaxOnly in tsconfig.json enforces the first.
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  PRIORITY,
  THEME,
  WIDTH,
  countDone,
  dayGroupLabel,
  extractDayToken,
  formatDate,
  formatDayKey,
  formatDayKeyShort,
  getHighPriorityItems,
  groupByDay,
  isAllDone,
  isDayKey,
  isPriority,
  isTimeOfDay,
  moveItem,
  nextReminderTime,
  nextTheme,
  nextWidth,
  normalizeSettings,
  normalizeState,
  parseDayInput,
  parseDraft,
  preferredTheme,
  progressPercent,
  setAllDone,
  shiftDayKey,
  sortByPriority,
  toDayKey,
  todayKey,
  touchItem,
} from "../src/core/utils.ts";
import type { Item, State } from "../src/core/types.ts";

// --- the environment itself -------------------------------------------

assert.equal(typeof globalThis.window, "undefined", "no window: this is the worker case");
assert.equal(typeof globalThis.document, "undefined", "no document either");

// --- normalizeState is the single gate --------------------------------

const empty = normalizeState(null);
assert.deepEqual(empty.items, []);
assert.equal(empty.theme, THEME.LIGHT, "preferredTheme falls back to light with no window");
assert.equal(empty.settings.width, WIDTH.COMPACT);
assert.equal(empty.settings.reminder.enabled, false);
assert.equal(empty.settings.reminder.time, "09:00");

// Junk in, complete state out -- including shapes that are not objects at all.
for (const junk of [undefined, 0, "", "nope", [], { items: "not an array" }]) {
  const result = normalizeState(junk);
  assert.deepEqual(result.items, [], `junk input ${JSON.stringify(junk)} yields no items`);
  assert.equal(typeof result.settings.reminder.time, "string");
}

// normalizeSettings must never return a partial object: a missing nested field
// would read as undefined exactly where it matters and fail silently.
for (const junk of [null, undefined, {}, { reminder: null }, { reminder: "x" }, 7]) {
  const settings = normalizeSettings(junk);
  assert.equal(typeof settings.width, "string");
  assert.equal(typeof settings.reminder.enabled, "boolean");
  assert.equal(settings.reminder.time, DEFAULT_SETTINGS.reminder.time);
}
assert.equal(normalizeSettings({ width: WIDTH.WIDE }).width, WIDTH.WIDE);
assert.equal(normalizeSettings({ width: "huge" }).width, WIDTH.COMPACT);
assert.equal(
  normalizeSettings({ reminder: { enabled: 1, time: "7:5" } }).reminder.time,
  "09:00",
  "a malformed time falls back rather than being stored"
);
assert.equal(normalizeSettings({ reminder: { enabled: 1, time: "23:59" } }).reminder.time, "23:59");

// updatedAt is deliberately NOT backfilled: a missing stamp renders blank
// rather than claiming a date.
const legacy = normalizeState({
  items: [{ text: "predates timestamps" }],
  theme: "dark",
});
assert.equal(legacy.items[0]?.updatedAt, null, "no backfilled stamp");
assert.equal(legacy.items[0]?.dueDate, null, "no invented due date");
assert.equal(legacy.items[0]?.priority, PRIORITY.LOW);
assert.equal(legacy.items[0]?.done, false);
assert.equal(legacy.theme, THEME.DARK);

// A stored priority outside the three real levels is clamped. The untyped
// version let it through, after which it matched no CSS rule and no menu entry.
assert.equal(normalizeState({ items: [{ text: "x", priority: 7 }] }).items[0]?.priority, PRIORITY.LOW);
assert.equal(normalizeState({ items: [{ text: "x", priority: 2 }] }).items[0]?.priority, PRIORITY.HIGH);
assert.equal(normalizeState({ items: [{ text: "x", priority: "2" }] }).items[0]?.priority, PRIORITY.HIGH);

// Round-trip: a state that already came through the gate survives storage
// unchanged. This is what the popup relies on every time it loads.
const realistic: State = {
  items: [
    { text: "pay rent", done: false, priority: PRIORITY.HIGH, updatedAt: 1788666742704, dueDate: "2026-09-06" },
    { text: "legacy row", done: true, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
    { text: "midweek", done: false, priority: PRIORITY.NORMAL, updatedAt: 1788666742999, dueDate: "2026-10-08" },
  ],
  theme: THEME.DARK,
  settings: { width: WIDTH.WIDE, reminder: { enabled: true, time: "08:30" } },
};
assert.deepEqual(
  normalizeState(JSON.parse(JSON.stringify(realistic))),
  realistic,
  "round-trip through storage loses nothing"
);

// --- priority ---------------------------------------------------------

assert.ok(isPriority(0) && isPriority(1) && isPriority(2));
assert.ok(!isPriority(3) && !isPriority(-1) && !isPriority("2") && !isPriority(null));

// Stable within equal priority: equal-priority tasks keep the user's order.
const unsorted: Item[] = [
  { text: "low a", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
  { text: "high", done: false, priority: PRIORITY.HIGH, updatedAt: null, dueDate: null },
  { text: "low b", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
  { text: "mid", done: false, priority: PRIORITY.NORMAL, updatedAt: null, dueDate: null },
];
assert.deepEqual(
  sortByPriority(unsorted).map((i) => i.text),
  ["high", "mid", "low a", "low b"]
);
assert.deepEqual(unsorted.map((i) => i.text), ["low a", "high", "low b", "mid"], "sort returns a new array");

assert.deepEqual(
  getHighPriorityItems([
    { text: "a", done: false, priority: PRIORITY.HIGH, updatedAt: null, dueDate: null },
    { text: "b", done: true, priority: PRIORITY.HIGH, updatedAt: null, dueDate: null },
    { text: "c", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
  ]).map((i) => i.text),
  ["a"],
  "done HIGH items no longer need reminding about"
);

// --- counts and progress ----------------------------------------------

const twoOfThree: Item[] = [
  { text: "a", done: true, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
  { text: "b", done: true, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
  { text: "c", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
];
assert.equal(countDone(twoOfThree), 2);
assert.equal(progressPercent(twoOfThree), 67);
assert.equal(progressPercent([]), 0, "no divide by zero on an empty list");
assert.equal(isAllDone([]), false, "an empty list is not 'all done'");
assert.equal(isAllDone(twoOfThree), false);
assert.equal(isAllDone(setAllDone(twoOfThree, true)), true);

// Items already in the target state are returned untouched, so a no-op cannot
// move their timestamp.
const alreadyDone = twoOfThree[0]!;
assert.equal(setAllDone(twoOfThree, true)[0], alreadyDone, "same object reference, no restamp");
assert.notEqual(setAllDone(twoOfThree, true)[2], twoOfThree[2], "the changed one is a new object");

// --- moveItem's coordinate system -------------------------------------
// `to` is an index into the array as it was BEFORE the move.

const abc: Item[] = ["a", "b", "c", "d"].map((text) => ({
  text,
  done: false,
  priority: PRIORITY.LOW,
  updatedAt: null,
  dueDate: null,
}));
const texts = (items: Item[]) => items.map((i) => i.text);
assert.deepEqual(texts(moveItem(abc, 0, 2)), ["b", "a", "c", "d"], "forward move lands before `to`");
assert.deepEqual(texts(moveItem(abc, 2, 0)), ["c", "a", "b", "d"], "backward move lands at `to`");
assert.deepEqual(texts(moveItem(abc, 0, 4)), ["b", "c", "d", "a"], "to == length appends");
assert.equal(moveItem(abc, 1, 1), abc, "same index is a no-op");
assert.equal(moveItem(abc, 1, 2), abc, "to == from + 1 is a no-op");
assert.equal(moveItem(abc, -1, 2), abc, "out of bounds from");
assert.equal(moveItem(abc, 0, 99), abc, "out of bounds to");
assert.deepEqual(texts(abc), ["a", "b", "c", "d"], "moveItem never mutates");

// --- timestamps -------------------------------------------------------

const stamped: Item = { text: "x", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: null };
touchItem(stamped);
assert.equal(typeof stamped.updatedAt, "number", "touchItem stamps in place");
assert.equal(formatDate(null), "", "no stamp renders blank, not a made-up date");
assert.equal(formatDate(0), "");
assert.equal(formatDate(new Date(2026, 8, 6, 12).getTime()), "06/09/2026");

// --- day keys ---------------------------------------------------------

assert.ok(isDayKey("2026-10-08"));
assert.ok(!isDayKey("2026-10-8") && !isDayKey("08/10/2026") && !isDayKey(null) && !isDayKey(20261008));
assert.equal(toDayKey(new Date(2026, 9, 8)), "2026-10-08");
assert.equal(shiftDayKey("2026-10-08", 1), "2026-10-09");
assert.equal(shiftDayKey("2026-10-31", 1), "2026-11-01", "shift crosses month boundaries");
assert.equal(shiftDayKey("2026-01-01", -1), "2025-12-31", "and year boundaries");
assert.equal(formatDayKey("2026-10-08"), "08/10/2026");
assert.equal(formatDayKey("nonsense"), "");
assert.equal(formatDayKeyShort("2026-10-08"), "08/10");
assert.equal(formatDayKeyShort("nonsense"), "");
assert.equal(todayKey(), toDayKey(new Date()));

const ref = "2026-10-08";
assert.equal(dayGroupLabel(null, ref), "UNSCHEDULED");
assert.equal(dayGroupLabel("2026-10-08", ref), "TODAY");
assert.equal(dayGroupLabel("2026-10-09", ref), "TOMORROW");
assert.equal(dayGroupLabel("2026-10-07", ref), "YESTERDAY");
assert.equal(dayGroupLabel("2026-10-01", ref), "OVERDUE");
assert.equal(dayGroupLabel("2026-12-25", ref), "UPCOMING");

// parseDayInput is the site that caught the DayKey-alias narrowing problem:
// it keeps using `text` after a failed day-key check.
assert.equal(parseDayInput("today"), todayKey());
assert.equal(parseDayInput("TOMORROW"), shiftDayKey(todayKey(), 1));
assert.equal(parseDayInput("yesterday"), shiftDayKey(todayKey(), -1));
assert.equal(parseDayInput("2026-10-08"), "2026-10-08", "an exact day key passes straight through");
assert.equal(parseDayInput("8/10/2026"), "2026-10-08");
assert.equal(parseDayInput("08.10.2026"), "2026-10-08");
assert.equal(parseDayInput(`8/10`), `${new Date().getFullYear()}-10-08`, "year defaults to this one");
assert.equal(parseDayInput("31/02/2026"), null, "impossible dates are rejected, not rolled forward");
assert.equal(parseDayInput("13/13/2026"), null);
assert.equal(parseDayInput(""), null);
assert.equal(parseDayInput("not a date"), null);
assert.equal(parseDayInput("1/2/3/4"), null);

assert.deepEqual(extractDayToken("buy milk"), { text: "buy milk", dueDate: null });
assert.deepEqual(extractDayToken("buy milk @tomorrow"), {
  text: "buy milk",
  dueDate: shiftDayKey(todayKey(), 1),
});
assert.deepEqual(
  extractDayToken("buy milk @notaday"),
  { text: "buy milk @notaday", dueDate: null },
  "an unparseable token is left in the text rather than silently eaten"
);

// --- parseDraft -------------------------------------------------------

assert.equal(parseDraft(""), null);
assert.equal(parseDraft("   "), null);
assert.equal(parseDraft("!"), null, "a bare bang is not a task");
const plain = parseDraft("buy milk")!;
assert.equal(plain.text, "buy milk");
assert.equal(plain.priority, PRIORITY.NORMAL);
assert.equal(plain.dueDate, todayKey(), "new tasks land on today");
assert.equal(plain.done, false);
assert.equal(typeof plain.updatedAt, "number");

const urgent = parseDraft("!pay rent")!;
assert.equal(urgent.text, "pay rent");
assert.equal(urgent.priority, PRIORITY.HIGH);

const dated = parseDraft("!pay rent @tomorrow")!;
assert.equal(dated.text, "pay rent");
assert.equal(dated.priority, PRIORITY.HIGH);
assert.equal(dated.dueDate, shiftDayKey(todayKey(), 1), "an @day token overrides today");

// --- themes and widths ------------------------------------------------

assert.equal(preferredTheme(), THEME.LIGHT, "no window means no dark preference to read");
assert.equal(nextTheme(THEME.LIGHT), THEME.DARK);
assert.equal(nextTheme(THEME.DARK), THEME.LIGHT);
assert.equal(nextWidth(WIDTH.COMPACT), WIDTH.WIDE);
assert.equal(nextWidth(WIDTH.WIDE), WIDTH.COMPACT);

// --- nextReminderTime -------------------------------------------------
// Local time throughout: 09:00 means 09:00 where the user is.

const morning = new Date(2026, 9, 8, 8, 0, 0, 0);
assert.equal(
  nextReminderTime("09:00", morning),
  new Date(2026, 9, 8, 9, 0, 0, 0).getTime(),
  "still ahead today"
);
const evening = new Date(2026, 9, 8, 22, 0, 0, 0);
assert.equal(
  nextReminderTime("09:00", evening),
  new Date(2026, 9, 9, 9, 0, 0, 0).getTime(),
  "already past, so tomorrow"
);
const exact = new Date(2026, 9, 8, 9, 0, 0, 0);
assert.equal(
  nextReminderTime("09:00", exact),
  new Date(2026, 9, 9, 9, 0, 0, 0).getTime(),
  "exactly now counts as past, so it does not fire twice"
);
assert.equal(
  nextReminderTime("00:00", new Date(2026, 9, 8, 23, 59, 0, 0)),
  new Date(2026, 9, 9, 0, 0, 0, 0).getTime(),
  "midnight crosses the day boundary"
);
assert.ok(isTimeOfDay("00:00") && isTimeOfDay("23:59") && isTimeOfDay("09:00"));
assert.ok(!isTimeOfDay("24:00") && !isTimeOfDay("9:00") && !isTimeOfDay("09:60") && !isTimeOfDay(900));

// --- groupByDay -------------------------------------------------------
// Section order: TODAY, then OVERDUE, then UPCOMING, then UNSCHEDULED.

const mixed: Item[] = [
  { text: "unscheduled", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: null },
  { text: "upcoming far", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: "2026-12-25" },
  { text: "today", done: true, priority: PRIORITY.LOW, updatedAt: null, dueDate: ref },
  { text: "overdue old", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: "2026-09-01" },
  { text: "overdue recent", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: "2026-10-07" },
  { text: "upcoming soon", done: false, priority: PRIORITY.LOW, updatedAt: null, dueDate: "2026-10-09" },
];
const groups = groupByDay(mixed, ref);
assert.deepEqual(
  groups.map((g) => g.label),
  ["TODAY", "YESTERDAY", "OVERDUE", "TOMORROW", "UPCOMING", "UNSCHEDULED"],
  "today leads; overdue sits directly under it rather than being buried"
);
assert.deepEqual(
  groups.map((g) => g.entries[0]?.item.text),
  ["today", "overdue recent", "overdue old", "upcoming soon", "upcoming far", "unscheduled"],
  "most recently missed day first inside overdue; soonest first everywhere else"
);
// Every entry keeps its index into the original array, because that is how
// every row handler addresses state.items.
for (const group of groups) {
  for (const entry of group.entries) {
    assert.equal(mixed[entry.index], entry.item, "index points back at the same object");
  }
}
assert.equal(groups[0]?.done, 1, "per-group done count");
assert.equal(groups[0]?.key, ref);
assert.equal(groups[0]?.date, "08/10/2026");
assert.equal(groups.at(-1)?.key, "", "the unscheduled group is keyed by empty string");
assert.deepEqual(groupByDay([], ref), [], "no items, no groups");

console.log("verify/utils.ts ok");
