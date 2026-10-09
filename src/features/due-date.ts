// The row's due-date chip and the native calendar behind it. Does not mutate
// the item; the caller persists through onPick, where null means unscheduled.

import { DayKey, Item } from "../core/types.ts";
import { formatDayKeyShort, isDayKey } from "../core/utils.ts";
import { closeMenu } from "../ui/menu.ts";

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

// The chip is the visible control; the real <input type="date"> sits off-screen
// purely to host the browser's calendar. showPicker() needs a rendered element
// and a user gesture, and the chip click is both.
function openDatePicker(inputEl: HTMLInputElement): void {
  closeMenu();
  // focus() is the fallback where showPicker is missing.
  if (typeof inputEl.showPicker === "function") {
    inputEl.showPicker();
  } else {
    inputEl.focus();
  }
}
