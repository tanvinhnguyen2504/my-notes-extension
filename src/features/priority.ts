// The row's priority pill, which is both label and trigger. Does not mutate
// the item; only popup.ts knows how to persist and re-render, so it passes
// onPick.

import { el } from "../core/dom.ts";
import { Item, Priority } from "../core/types.ts";
import { PRIORITY_LABELS, PRIORITY_ORDER } from "../core/utils.ts";
import { closeMenu, toggleMenu, MenuEntry } from "../ui/menu.ts";

// Captured at import time, which is why the popup can only be booted once per
// process -- see the module-level capture trap in CLAUDE.md.
const priorityMenuEl = el("priority-menu");

export function attachPriorityTag(
  tagEl: HTMLElement,
  item: Item,
  onPick: (priority: Priority) => void
): void {
  tagEl.textContent = PRIORITY_LABELS[item.priority];
  tagEl.addEventListener("click", () => {
    toggleMenu(priorityMenuEl, tagEl, buildEntries(item.priority, onPick));
  });
}

function buildEntries(
  current: Priority,
  onPick: (priority: Priority) => void
): MenuEntry[] {
  return PRIORITY_ORDER.map((priority) => ({
    label: PRIORITY_LABELS[priority],
    priority,
    checked: priority === current,
    onPick: () => {
      closeMenu();
      onPick(priority);
    },
  }));
}
