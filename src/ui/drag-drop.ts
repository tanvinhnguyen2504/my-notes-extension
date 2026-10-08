// Drag and drop for the checklist: reordering rows, and reassigning an item's
// day by dropping it into another group.
//
// This module owns exactly three things -- the HTML5 drag events, the CSS
// classes that show where a drop would land, and the one piece of mutable drag
// state (which row is in flight). It never reads or writes the todo list. A
// completed drop is reported as plain data and the caller decides what it means.

import type { DayKey } from "../core/types.ts";

const CLASS = {
  DRAGGING: "dragging",
  DROP_BEFORE: "drop-before",
  DROP_AFTER: "drop-after",
  DROP_INTO: "drop-into",
} as const;

const MARKER_SELECTOR = `.${CLASS.DROP_BEFORE}, .${CLASS.DROP_AFTER}, .${CLASS.DROP_INTO}`;

export type DropSide = "before" | "after";

// `to` is an index into the array as it was BEFORE the move, which is the
// coordinate system moveItem(items, from, to) expects. `dayKey` is the day of
// the group the row landed in, or null for unscheduled.
export interface RowDrop {
  from: number;
  to: number;
  dayKey: DayKey | null;
}

// A row dropped on a group header: reschedule only, no reorder.
export interface GroupDrop {
  from: number;
  dayKey: DayKey | null;
}

export interface DragControllerOptions {
  // Scroll container holding the groups and rows.
  listEl: HTMLElement;
  onRowDrop: (drop: RowDrop) => void;
  onGroupDrop: (drop: GroupDrop) => void;
}

export interface DragController {
  attachRow(row: HTMLElement, index: number, dayKey: DayKey | null): void;
  attachGroupHeader(head: HTMLElement, dayKey: DayKey | null): void;
  suspendRow(row: HTMLElement): void;
  resumeRow(row: HTMLElement): void;
}

// --- pure geometry ----------------------------------------------------

// Which half of the row the pointer sits in. Above the midpoint means the
// dragged row lands before this one, below means after.
export function dropSide(row: HTMLElement, clientY: number): DropSide {
  const bounds = row.getBoundingClientRect();
  return clientY > bounds.top + bounds.height / 2 ? "after" : "before";
}

// Turns a hovered row plus a side into an insertion point expressed as an index
// into the ORIGINAL array -- the coordinate system moveItem() expects.
export function insertionIndex(hoveredIndex: number, side: DropSide): number {
  return side === "after" ? hoveredIndex + 1 : hoveredIndex;
}

// --- drop markers -----------------------------------------------------

function showRowMarker(row: HTMLElement, side: DropSide): void {
  row.classList.toggle(CLASS.DROP_AFTER, side === "after");
  row.classList.toggle(CLASS.DROP_BEFORE, side === "before");
}

function clearMarker(el: Element): void {
  el.classList.remove(CLASS.DROP_BEFORE, CLASS.DROP_AFTER, CLASS.DROP_INTO);
}

function clearAllMarkers(listEl: HTMLElement): void {
  listEl.querySelectorAll(MARKER_SELECTOR).forEach(clearMarker);
}

// --- controller -------------------------------------------------------

// Wires drag-to-reorder and drag-to-reschedule inside `listEl`.
export function createDragController({
  listEl,
  onRowDrop,
  onGroupDrop,
}: DragControllerOptions): DragController {
  // Index of the row being dragged, into the caller's array. Null whenever no
  // drag is in flight, which is also how every handler cheaply opts out.
  let draggedIndex: number | null = null;

  function beginDrag(event: DragEvent, row: HTMLElement, index: number): void {
    draggedIndex = index;
    row.classList.add(CLASS.DRAGGING);
    // dataTransfer is null on a jsdom-synthesised event, and the drag state
    // above still has to be set for the rest of the gesture to work -- so the
    // guard sits here rather than at the top of the function.
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    // Firefox ignores a drag that carries no payload.
    event.dataTransfer.setData("text/plain", String(index));
  }

  function endDrag(row: HTMLElement): void {
    draggedIndex = null;
    row.classList.remove(CLASS.DRAGGING);
    clearAllMarkers(listEl);
  }

  // Without preventDefault the browser refuses the drop outright, so every
  // accepted hover has to say so explicitly.
  function acceptHover(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function hoverRow(event: DragEvent, row: HTMLElement, index: number): void {
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }
    acceptHover(event);
    showRowMarker(row, dropSide(row, event.clientY));
  }

  function dropOnRow(
    event: DragEvent,
    row: HTMLElement,
    index: number,
    dayKey: DayKey | null
  ): void {
    if (draggedIndex === null) {
      return;
    }
    event.preventDefault();

    // Read the side back off the marker rather than recomputing it: drop fires
    // at the same position as the last dragover, so the marker is the placement
    // the user actually saw.
    const side: DropSide = row.classList.contains(CLASS.DROP_AFTER) ? "after" : "before";
    const from = draggedIndex;

    reset();
    onRowDrop({ from, to: insertionIndex(index, side), dayKey });
  }

  function hoverGroup(event: DragEvent, head: HTMLElement): void {
    if (draggedIndex === null) {
      return;
    }
    acceptHover(event);
    head.classList.add(CLASS.DROP_INTO);
  }

  function dropOnGroup(event: DragEvent, dayKey: DayKey | null): void {
    if (draggedIndex === null) {
      return;
    }
    event.preventDefault();

    const from = draggedIndex;
    reset();
    onGroupDrop({ from, dayKey });
  }

  function reset(): void {
    draggedIndex = null;
    clearAllMarkers(listEl);
  }

  return {
    // Makes one rendered row both a drag source and a drop target. `dayKey` is
    // the day of the group the row is rendered in (null when unscheduled), so
    // the controller never has to walk the DOM to find it.
    attachRow(row, index, dayKey) {
      row.addEventListener("dragstart", (event) => beginDrag(event, row, index));
      row.addEventListener("dragend", () => endDrag(row));
      row.addEventListener("dragover", (event) => hoverRow(event, row, index));
      row.addEventListener("dragleave", () => clearMarker(row));
      row.addEventListener("drop", (event) => dropOnRow(event, row, index, dayKey));
    },

    // Makes a group header a drop target that reschedules without reordering.
    attachGroupHeader(head, dayKey) {
      head.addEventListener("dragover", (event) => hoverGroup(event, head));
      head.addEventListener("dragleave", () => clearMarker(head));
      head.addEventListener("drop", (event) => dropOnGroup(event, dayKey));
    },

    // A draggable ancestor swallows text selection, so inline editing turns the
    // row's drag off for as long as the input is open.
    suspendRow(row) {
      row.draggable = false;
    },

    resumeRow(row) {
      row.draggable = true;
    },
  };
}
