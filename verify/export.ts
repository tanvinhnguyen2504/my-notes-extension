// toCsv() and csvFilename() are pure and DOM-free by design, so they run here
// in plain node. downloadCsv() is the only part that touches the document and
// is covered by the jsdom popup script instead.
import assert from "node:assert/strict";
import { csvFilename, toCsv } from "../src/features/export.ts";
import { insertionIndex } from "../src/ui/drag-drop.ts";
import { PRIORITY } from "../src/core/utils.ts";
import type { Item } from "../src/core/types.ts";

const item = (over: Partial<Item>): Item => ({
  text: "task",
  done: false,
  priority: PRIORITY.NORMAL,
  updatedAt: null,
  dueDate: null,
  ...over,
});

// --- CSV --------------------------------------------------------------

assert.equal(
  toCsv([]),
  "text,done,priority,dueDate,updatedAt",
  "an empty list is still a valid CSV with its header"
);

const lines = toCsv([
  item({ text: "pay rent", done: true, priority: PRIORITY.HIGH, dueDate: "2026-10-08", updatedAt: 1760000000000 }),
  item({ text: "legacy", priority: PRIORITY.LOW }),
]).split("\r\n");

assert.equal(lines.length, 3, "header plus one line per item");
assert.equal(lines[0], "text,done,priority,dueDate,updatedAt");
assert.equal(
  lines[1],
  `"pay rent",true,HIGH,2026-10-08,${new Date(1760000000000).toISOString()}`
);
assert.equal(lines[2], `"legacy",false,LOW,,`, "no stamp and no day render blank, not 'null'");
assert.ok(toCsv([]).includes("\r\n") === false);

// RFC 4180: quotes inside a quoted field are doubled, and the free-form text
// column is always quoted so a comma or newline in a task cannot shift columns.
assert.ok(toCsv([item({ text: 'say "hi"' })]).includes(`"say ""hi"""`));
assert.ok(toCsv([item({ text: "a,b" })]).includes(`"a,b"`));
assert.ok(toCsv([item({ text: "line1\nline2" })]).includes(`"line1\nline2"`));

assert.equal(csvFilename("2026-10-08"), "checklist-2026-10-08.csv");
assert.ok(/^checklist-\d{4}-\d{2}-\d{2}\.csv$/.test(csvFilename()), "defaults to today");

// --- drag geometry ----------------------------------------------------
// insertionIndex is the half of drag-drop.ts that needs no DOM. It produces an
// index into the array as it was BEFORE the move, matching moveItem().

assert.equal(insertionIndex(0, "before"), 0);
assert.equal(insertionIndex(0, "after"), 1);
assert.equal(insertionIndex(3, "before"), 3);
assert.equal(insertionIndex(3, "after"), 4);

console.log("verify/export.ts ok");
