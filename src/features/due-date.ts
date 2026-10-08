// Everything the row knows about an item's due date: the chip that displays it
// and the native calendar that changes it.
//
// Days are day-key strings ("YYYY-MM-DD"), never timestamps -- see utils.ts for
// why. The chip reports a chosen day through onPick; null means unscheduled.

import type { DayKey, Item } from "../core/types.ts";
import { formatDayKeyShort, isDayKey } from "../core/utils.ts";
import { closeMenu } from "../ui/menu.ts";

// Renders the chip and its hidden input for `item`, and wires both.
// onPick(dayKey | null) is called when the user picks or clears a day.
export function attachDueChip(
  dueEl: HTMLElement,
  dueInputEl: HTMLInputElement,
  item: Item,
  onPick: (dayKey: DayKey | null) => void
): void {
  dueEl.textContent = item.dueDate ? formatDayKeyShort(item.dueDate) : "SET DAY";
  dueEl.dataset.unset = String(!item.dueDate);
  dueInputEl.value = item.dueDate || "";

  dueEl.addEventListener("click", () => openDatePicker(dueInputEl));
  dueInputEl.addEventListener("change", () => {
    // Clearing the field is how an item goes back to unscheduled.
    onPick(isDayKey(dueInputEl.value) ? dueInputEl.value : null);
  });
}

// The chip is the visible control; the real <input type="date"> sits beside it
// unstyled and off-screen purely to host the browser's calendar. showPicker()
// needs a rendered element and a user gesture, and the chip click is both.
function openDatePicker(inputEl: HTMLInputElement): void {
  closeMenu();
  // Checked rather than called outright: showPicker is recent enough that an
  // older browser would throw, and focus() is the graceful fallback.
  if (typeof inputEl.showPicker === "function") {
    inputEl.showPicker();
  }
  else {
    inputEl.focus();
  }
}
