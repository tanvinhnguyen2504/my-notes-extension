// Boots the real popup page and drives its real controls. One boot, this
// process only -- see jsdom-boot.ts.
import assert from "node:assert/strict";
import { bootPage, click, press } from "./jsdom-boot.ts";

const dom = await bootPage("entrypoints/popup.html", "../src/popup.ts");
const doc = dom.window.document;

const $ = <T extends Element = HTMLElement>(sel: string): T => {
  const found = doc.querySelector<T>(sel);
  if (!found) {
    throw new Error(`verify: no ${sel}`);
  }
  return found;
};
const rows = () => [...doc.querySelectorAll(".row")];
const draft = $<HTMLInputElement>("#draft");

function add(text: string): void {
  draft.value = text;
  press(draft, "Enter");
}

// --- empty state ------------------------------------------------------

assert.equal(rows().length, 0);
assert.ok(doc.querySelector(".empty"), "an empty list shows its empty state");
assert.equal($("#count").textContent, "0 of 0");
assert.equal($<HTMLButtonElement>("#btn-check-all").disabled, true, "nothing to mark");
assert.equal($<HTMLButtonElement>("#btn-clear-all").disabled, true);
assert.equal($<HTMLButtonElement>("#btn-export-csv").disabled, true);

// --- adding -----------------------------------------------------------

add("buy milk");
assert.equal(rows().length, 1);
assert.equal($(".row .text").textContent, "buy milk");
assert.equal(draft.value, "", "the field clears after a successful add");
assert.equal($("#count").textContent, "0 of 1");
assert.equal(doc.querySelector(".empty"), null, "the empty state goes away");
assert.equal($<HTMLButtonElement>("#btn-check-all").disabled, false);

// The full text is only readable from the tooltip, since the label is one
// ellipsised line.
assert.equal($<HTMLElement>(".row .text").title, "buy milk");

add("   ");
assert.equal(rows().length, 1, "whitespace is not a task");
add("!");
assert.equal(rows().length, 1, "a bare bang is not a task");

add("!pay rent");
assert.equal(rows().length, 2);
// The bang is consumed into the priority, not left in the text, and the row
// carries data-priority -- a contract with popup.css.
const urgent = rows().find((row) => row.querySelector(".text")?.textContent === "pay rent");
assert.ok(urgent, "the bang is stripped from the text");
assert.equal(urgent?.getAttribute("data-priority"), "2");
assert.equal(urgent?.querySelector(".tag")?.textContent, "HIGH");

// --- grouping ---------------------------------------------------------

assert.equal(doc.querySelectorAll(".group").length, 1, "both land in today");
assert.equal($(".group-label").textContent, "TODAY");
assert.equal($(".group-count").textContent, "0/2");

add("later @tomorrow");
assert.equal(doc.querySelectorAll(".group").length, 2, "a dated task opens its own group");
assert.deepEqual(
  [...doc.querySelectorAll(".group-label")].map((n) => n.textContent),
  ["TODAY", "TOMORROW"],
  "today leads"
);

// --- toggling done ----------------------------------------------------
// .body has a catch-all click handler. The box is the intended target.

const firstRow = () => rows()[0]!;
click(firstRow().querySelector(".box")!);
assert.equal(firstRow().getAttribute("data-done"), "true");
assert.equal(firstRow().querySelector(".box")?.textContent, "✓");
assert.equal($("#count").textContent, "1 of 3");
assert.ok($<HTMLElement>("#progress").style.width.startsWith("33"), "progress follows");

click(firstRow().querySelector(".box")!);
assert.equal(firstRow().getAttribute("data-done"), "false", "and back off again");
assert.equal($("#count").textContent, "0 of 3");

// Clicking the text must NOT toggle: it is the double-click edit target, and a
// re-render would destroy the node before dblclick could fire.
const textNode = firstRow().querySelector(".text")!;
click(textNode);
assert.equal(firstRow().getAttribute("data-done"), "false", "the text label never ticks the row");

// --- editing ----------------------------------------------------------
// The real sequence: a double-click sends two clicks FIRST. Dispatching
// dblclick alone would hide the bug this ordering causes.

const target = firstRow().querySelector(".text")!;
click(target);
click(target);
target.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true, cancelable: true }));

const editor = doc.querySelector<HTMLInputElement>(".row .edit");
assert.ok(editor, "double-click opens an editor on a row that is still in the document");
assert.equal(editor?.value, firstRow().querySelector(".text")?.textContent ?? editor?.value);
assert.equal(firstRow().getAttribute("draggable"), "false", "drag is suspended while editing");

editor!.value = "renamed";
press(editor!, "Enter");
assert.equal(doc.querySelector(".edit"), null, "the editor closes");
assert.ok(
  rows().some((row) => row.querySelector(".text")?.textContent === "renamed"),
  "the new text is committed"
);
assert.equal(rows()[0]?.getAttribute("draggable"), "true", "drag resumes");

// Escape reverts.
const second = rows()[0]!.querySelector(".text")!;
const before = second.textContent;
click(second);
click(second);
second.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true, cancelable: true }));
const editor2 = doc.querySelector<HTMLInputElement>(".edit")!;
editor2.value = "discarded";
press(editor2, "Escape");
assert.equal(doc.querySelector(".edit"), null);
assert.equal(rows()[0]?.querySelector(".text")?.textContent, before, "Escape reverts the edit");

// --- mark all / unmark all --------------------------------------------

const checkAll = $<HTMLButtonElement>("#btn-check-all");
click(checkAll);
assert.equal($("#count").textContent, "3 of 3");
assert.equal(checkAll.dataset.allDone, "true");
assert.ok(checkAll.textContent?.includes("UNMARK"), "one button, two directions");
click(checkAll);
assert.equal($("#count").textContent, "0 of 3");
assert.ok(checkAll.textContent?.includes("MARK ALL"));

// --- delete -----------------------------------------------------------

const countBefore = rows().length;
click(firstRow().querySelector(".del")!);
assert.equal(rows().length, countBefore - 1, ".del removes the row rather than toggling it");

// --- clear all is two-step -------------------------------------------

const clearAll = $<HTMLButtonElement>("#btn-clear-all");
click(clearAll);
assert.equal(clearAll.textContent, "SURE?", "first press arms");
assert.equal(clearAll.dataset.armed, "true");
assert.ok(rows().length > 0, "and clears nothing yet");
click(clearAll);
assert.equal(rows().length, 0, "second press clears");
assert.ok(doc.querySelector(".empty"), "back to the empty state");

// --- settings ---------------------------------------------------------

const settingsPanel = $("#settings-panel") as HTMLElement;
assert.equal(settingsPanel.hidden, true, "the panel starts closed");
click($("#btn-settings"));
assert.equal(settingsPanel.hidden, false);
assert.equal($("#btn-settings").getAttribute("aria-expanded"), "true");

const html = doc.documentElement;
assert.equal(html.dataset.theme, "light");
click($("#set-theme"));
assert.equal(html.dataset.theme, "dark", "theme is an attribute on <html>: a contract with popup.css");
assert.equal($("#set-theme").getAttribute("aria-checked"), "true");

click($("#set-width"));
assert.equal(html.dataset.width, "wide");
assert.equal($("#set-width").getAttribute("aria-checked"), "true");

const timeRow = $("#set-reminder-time-row") as HTMLElement;
assert.equal(timeRow.hidden, true, "a time with no reminder to attach it to is clutter");
click($("#set-reminder"));
assert.equal($("#set-reminder").getAttribute("aria-checked"), "true");
assert.equal(timeRow.hidden, false);

// Escape closes the panel.
press(doc.body, "Escape");
assert.equal(settingsPanel.hidden, true);

// --- the saved state round-trips --------------------------------------

const saved = JSON.parse(dom.window.localStorage.getItem("checklist.v1") ?? "null");
assert.ok(saved, "state was persisted");
assert.equal(saved.theme, "dark");
assert.equal(saved.settings.width, "wide");
assert.equal(saved.settings.reminder.enabled, true);
assert.deepEqual(saved.items, [], "the clear was persisted too");

console.log("verify/popup.ts ok");
