// Everything the row knows about an item's priority: the pill that displays it
// and the menu that changes it.
//
// The pill is both label and trigger. It does not mutate the item itself --
// the caller passes onPick, because only popup.ts knows how to persist and
// re-render.

import { el } from "../core/dom.ts";
import type { Item, Priority } from "../core/types.ts";
import { PRIORITY_LABELS, PRIORITY_ORDER } from "../core/utils.ts";
import { closeMenu, toggleMenu } from "../ui/menu.ts";
import type { MenuEntry } from "../ui/menu.ts";

// Captured at import time, which is what makes the popup un-rebootable in one
// process: Node caches ES modules by specifier, so a second jsdom boot in the
// same process drives the first boot's DOM with no error. One boot per process
// -- see "Traps this codebase has already hit" in CLAUDE.md.
const priorityMenuEl = el("priority-menu");

// Renders the pill for `item` and wires it to open the priority menu.
// onPick(priority) is called with the chosen level.
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
