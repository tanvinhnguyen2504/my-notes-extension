// Reordering rows, and reassigning a day by dropping into another group.
//
// Owns the drag events, the marker classes, and which row is in flight. Never
// reads or writes the todo list: a drop is reported as plain data and the caller
// decides what it means.

import { DayKey } from "../core/types.ts";

const CLASS = {
  DRAGGING: "dragging",
  DROP_BEFORE: "drop-before",
  DROP_AFTER: "drop-after",
  DROP_INTO: "drop-into",
} as const;

const MARKER_SELECTOR = `.${CLASS.DROP_BEFORE}, .${CLASS.DROP_AFTER}, .${CLASS.DROP_INTO}`;

export type DropSide = "before" | "after";

// `to` indexes the array as it was BEFORE the move -- the coordinate system
// moveItem() expects. `dayKey` is the group landed in, null for unscheduled.
export interface RowDrop {
  from: number;
  to: number;
  dayKey: DayKey | null;
}

// Dropped on a group header: reschedule only, no reorder.
export interface GroupDrop {
  from: number;
  dayKey: DayKey | null;
}

export interface DragControllerOptions {
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

// Above the row's midpoint lands before it, below lands after.
export function dropSide(row: HTMLElement, clientY: number): DropSide {
  const bounds = row.getBoundingClientRect();
  return clientY > bounds.top + bounds.height / 2 ? "after" : "before";
}

// An index into the ORIGINAL array, as moveItem() expects.
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

export function createDragController({
  listEl,
  onRowDrop,
  onGroupDrop,
}: DragControllerOptions): DragController {
  // Index into the caller's array, null when no drag is in flight -- which is
  // also how every handler opts out.
  let draggedIndex: number | null = null;

  function beginDrag(event: DragEvent, row: HTMLElement, index: number): void {
    draggedIndex = index;
    row.classList.add(CLASS.DRAGGING);
    // Guarded here, not at the top: the drag state above still has to be set
    // even when dataTransfer is absent.
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

  // Without preventDefault the browser refuses the drop outright.
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

    // Read off the marker rather than recomputed, so the drop lands where the
    // user actually saw it.
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
    // Both drag source and drop target. `dayKey` is passed in so the
    // controller never walks the DOM to find it.
    attachRow(row, index, dayKey) {
      row.addEventListener("dragstart", (event) => beginDrag(event, row, index));
      row.addEventListener("dragend", () => endDrag(row));
      row.addEventListener("dragover", (event) => hoverRow(event, row, index));
      row.addEventListener("dragleave", () => clearMarker(row));
      row.addEventListener("drop", (event) => dropOnRow(event, row, index, dayKey));
    },

    // A drop target that reschedules without reordering.
    attachGroupHeader(head, dayKey) {
      head.addEventListener("dragover", (event) => hoverGroup(event, head));
      head.addEventListener("dragleave", () => clearMarker(head));
      head.addEventListener("drop", (event) => dropOnGroup(event, dayKey));
    },

    // A draggable ancestor swallows text selection, so editing turns it off.
    suspendRow(row) {
      row.draggable = false;
    },

    resumeRow(row) {
      row.draggable = true;
    },
  };
}
