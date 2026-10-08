// The reminder window's page.
//
// It never imports popup.ts: popup.ts calls getElementById at module top level
// and runs its wiring on load, so it throws on any page without the popup's
// ids. This page shares utils.ts and popup.css and duplicates the few lines it
// needs to draw a row.

import { el } from "./core/dom.ts";
import type { Item, State } from "./core/types.ts";
import {
  PRIORITY_LABELS,
  formatDayKeyShort,
  loadState,
  saveState,
  touchItem,
  sortByPriority,
} from "./core/utils.ts";

const listEl = el("reminder-list");
const countEl = el("reminder-count");
const dismissButtonEl = el<HTMLButtonElement>("btn-dismiss");

let state: State | null = null;

function renderRow(item: Item): HTMLElement {
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.priority = String(item.priority);
  row.dataset.done = "false";

  const flag = document.createElement("div");
  flag.className = "flag";

  const body = document.createElement("div");
  body.className = "body";

  const box = document.createElement("button");
  box.type = "button";
  box.className = "box";
  box.title = "Mark done";

  const text = document.createElement("span");
  text.className = "text";
  text.textContent = item.text;

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = String(PRIORITY_LABELS[item.priority])
  body.append(box, text);
  if (item.dueDate) {
    const due = document.createElement("span");
    due.className = "due";
    due.textContent = formatDayKeyShort(item.dueDate);
    body.append(due);
  }
  body.append(tag);

  // One control, one behaviour. The popup's .body click handler toggles done for
  // anything not explicitly excluded, which is a trap this page simply avoids by
  // wiring the checkbox and nothing else.
  box.addEventListener("click", () => {
    if (!state) return;
    item.done = true;
    touchItem(item);
    saveState(state);
    render();
  });

  row.append(flag, body);
  return row;
}

function renderAllClear(): void {
  const empty = document.createElement("div");
  empty.className = "empty";

  const heading = document.createElement("strong");
  heading.textContent = "All clear";

  const hint = document.createElement("span");
  hint.textContent = "Nothing priority is outstanding.";

  empty.append(heading, hint);
  listEl.append(empty);
}

function render(): void {
  // Moved above the theme read, which used to come first: `state` starts null,
  // so the original order would have thrown had render() ever run before
  // loadState() resolved. The `!state.items` half of the old check is gone --
  // State guarantees an array, and normalizeState() is what makes that true.
  if (!state) {
    return
  }

  document.documentElement.dataset.theme = state.theme;

  const unDoneItems = state.items.filter(item => !item.done)

  const sortItems = sortByPriority(unDoneItems)
  countEl.textContent = String(sortItems.length);
  listEl.textContent = "";

  if (!sortItems.length) {
    renderAllClear();
    return;
  }
  sortItems.forEach((item) => listEl.append(renderRow(item)));
}

dismissButtonEl.addEventListener("click", () => window.close());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.close();
  }
});

loadState().then((savedState) => {
  state = savedState;
  render();
});
