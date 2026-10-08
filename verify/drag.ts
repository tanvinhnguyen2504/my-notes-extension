// Drag and drop against the real page. Separate process from verify/popup.ts
// because it boots the popup again -- see jsdom-boot.ts on why two boots cannot
// share one process.
//
// Two things matter here. The real event sequence is dispatched, not the
// convenient one: dragover must run before drop, because drop reads the side
// back off the marker dragover left rather than recomputing it. And jsdom
// supplies no dataTransfer, which is the null case drag-drop.ts guards -- both
// that path and a browser-shaped one are exercised.
import assert from "node:assert/strict";
import { bootPage, click, dragEvent, press } from "./jsdom-boot.ts";

const dom = await bootPage("entrypoints/popup.html", "../src/popup.ts");
const doc = dom.window.document;

const draft = doc.querySelector<HTMLInputElement>("#draft")!;
const rows = () => [...doc.querySelectorAll<HTMLElement>(".row")];
const texts = () => rows().map((row) => row.querySelector(".text")?.textContent);
const groups = () =>
  [...doc.querySelectorAll<HTMLElement>(".group")].map((g) => ({
    key: g.dataset.key,
    label: g.querySelector(".group-label")?.textContent,
    texts: [...g.querySelectorAll(".text")].map((t) => t.textContent),
  }));

function add(text: string): void {
  draft.value = text;
  press(draft, "Enter");
}

// A full gesture. withData mirrors a real browser; without it, dataTransfer is
// null, which is what jsdom does on its own.
function drag(
  fromRow: HTMLElement,
  onto: HTMLElement,
  opts: { clientY: number; withData?: boolean }
): void {
  fromRow.dispatchEvent(dragEvent("dragstart", { withData: opts.withData }));
  onto.dispatchEvent(dragEvent("dragover", { clientY: opts.clientY, withData: opts.withData }));
  onto.dispatchEvent(dragEvent("drop", { clientY: opts.clientY, withData: opts.withData }));
}

add("a");
add("b");
add("c");
assert.deepEqual(texts(), ["a", "b", "c"]);

// --- dragstart marks the row, dragend cleans up ------------------------

const first = rows()[0]!;
first.dispatchEvent(dragEvent("dragstart", { withData: true }));
assert.ok(first.classList.contains("dragging"), "the dragged row is marked");
first.dispatchEvent(dragEvent("dragend"));
assert.equal(first.classList.contains("dragging"), false, "dragend clears it");

// --- dragover leaves a marker, dragleave removes it --------------------
// Every rect is zero in jsdom, so the midpoint is 0: clientY 1 reads as the
// lower half ("after"), clientY 0 as the upper half ("before").

rows()[0]!.dispatchEvent(dragEvent("dragstart", { withData: true }));
const hovered = rows()[1]!;
hovered.dispatchEvent(dragEvent("dragover", { clientY: 1, withData: true }));
assert.ok(hovered.classList.contains("drop-after"), "below the midpoint means after");
hovered.dispatchEvent(dragEvent("dragleave"));
assert.equal(hovered.classList.contains("drop-after"), false, "dragleave clears the marker");

hovered.dispatchEvent(dragEvent("dragover", { clientY: 0, withData: true }));
assert.ok(hovered.classList.contains("drop-before"), "above the midpoint means before");
rows()[0]!.dispatchEvent(dragEvent("dragend"));

// A row cannot be a drop target for itself.
const solo = rows()[0]!;
solo.dispatchEvent(dragEvent("dragstart", { withData: true }));
solo.dispatchEvent(dragEvent("dragover", { clientY: 1, withData: true }));
assert.equal(
  solo.classList.contains("drop-after") || solo.classList.contains("drop-before"),
  false,
  "hovering the dragged row itself marks nothing"
);
solo.dispatchEvent(dragEvent("dragend"));

// With no drag in flight, a stray dragover marks nothing.
rows()[1]!.dispatchEvent(dragEvent("dragover", { clientY: 1, withData: true }));
assert.equal(rows()[1]!.classList.contains("drop-after"), false, "no drag, no marker");

// --- reordering --------------------------------------------------------
// `to` is an index into the array as it was BEFORE the move.

drag(rows()[0]!, rows()[1]!, { clientY: 1, withData: true });
assert.deepEqual(texts(), ["b", "a", "c"], "dropped after the second row");

// And the same gesture with dataTransfer absent, exactly as jsdom produces it.
drag(rows()[2]!, rows()[0]!, { clientY: 0 });
assert.deepEqual(texts(), ["c", "b", "a"], "a drop still lands with no dataTransfer");

// No marker survives a completed drop.
assert.equal(
  doc.querySelectorAll(".drop-before, .drop-after, .drop-into").length,
  0,
  "markers are cleared on drop"
);

// --- dropping on a group header reschedules ----------------------------

add("later @tomorrow");
assert.deepEqual(
  groups().map((g) => g.label),
  ["TODAY", "TOMORROW"]
);
const todayTexts = groups()[0]!.texts;
assert.equal(todayTexts.length, 3);

const tomorrowHead = doc.querySelectorAll<HTMLElement>(".group-head")[1]!;
const moving = rows()[0]!;
const movingText = moving.querySelector(".text")?.textContent;
moving.dispatchEvent(dragEvent("dragstart", { withData: true }));
tomorrowHead.dispatchEvent(dragEvent("dragover", { withData: true }));
assert.ok(tomorrowHead.classList.contains("drop-into"), "a group header shows it accepts the drop");
tomorrowHead.dispatchEvent(dragEvent("drop", { withData: true }));

const after = groups();
assert.equal(after[0]?.texts.length, 2, "it left today");
assert.ok(after[1]?.texts.includes(movingText ?? ""), "and landed in tomorrow");
assert.equal(
  doc.querySelectorAll(".drop-into").length,
  0,
  "the group marker is cleared too"
);

// The reschedule is persisted as a day key, not a timestamp.
const saved = JSON.parse(dom.window.localStorage.getItem("checklist.v1") ?? "null");
const moved = saved.items.find((item: { text: string }) => item.text === movingText);
assert.match(moved.dueDate, /^\d{4}-\d{2}-\d{2}$/, "stored as a YYYY-MM-DD day key");

// --- dropping on the unscheduled group clears the day ------------------
// Reaching UNSCHEDULED needs an item with no day at all, which only arrives by
// clearing the date input.

const dueInput = rows()[0]!.querySelector<HTMLInputElement>(".due-input")!;
dueInput.value = "";
dueInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
const labels = groups().map((g) => g.label);
assert.ok(labels.includes("UNSCHEDULED"), "clearing the date unschedules the item");
assert.equal(labels.at(-1), "UNSCHEDULED", "and it sorts last");

const unscheduledSaved = JSON.parse(dom.window.localStorage.getItem("checklist.v1") ?? "null");
assert.ok(
  unscheduledSaved.items.some((item: { dueDate: string | null }) => item.dueDate === null),
  "an unscheduled item stores null, not an empty string"
);

// --- editing suspends the drag ----------------------------------------

const editTarget = rows()[0]!.querySelector(".text")!;
click(editTarget);
click(editTarget);
editTarget.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true, cancelable: true }));
assert.equal(
  rows()[0]!.getAttribute("draggable"),
  "false",
  "a draggable ancestor swallows text selection, so editing turns it off"
);
press(doc.querySelector<HTMLInputElement>(".edit")!, "Escape");
assert.equal(rows()[0]!.getAttribute("draggable"), "true", "and back on afterwards");

console.log("verify/drag.ts ok");
