// Drag-to-reorder and drag-to-reschedule, as a hook.
//
// Native HTML5 events, deliberately. The two properties that make this work are
// carried over from the imperative version: the dragged index lives in a ref,
// and hover markers are applied with classList rather than by rendering. A
// dragover fires continuously, so rendering from it would be the one thing this
// must not do -- the budget is exactly one render per drag, on the drop.
//
// Mutating classList on nodes React owns is normally wrong, because the next
// render overwrites it. It is safe here precisely BECAUSE nothing renders during
// the drag, and every marker is cleared on drop before the render that follows.
//
// This hook never reads or writes the list. A completed drop is reported as
// plain data and the caller decides what it means.

import { useRef } from 'react';
import { DayKey } from '../core/types.ts';

const CLASS = {
  DRAGGING: 'dragging',
  DROP_BEFORE: 'drop-before',
  DROP_AFTER: 'drop-after',
  DROP_INTO: 'drop-into',
} as const;

const MARKER_SELECTOR = `.${CLASS.DROP_BEFORE}, .${CLASS.DROP_AFTER}, .${CLASS.DROP_INTO}`;

export type DropSide = 'before' | 'after';

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

export interface UseDragDropOptions {
  onRowDrop: (drop: RowDrop) => void;
  onGroupDrop: (drop: GroupDrop) => void;
}

export interface DragController {
  rowProps: (index: number, dayKey: DayKey | null) => React.HTMLAttributes<HTMLElement>;
  groupProps: (dayKey: DayKey | null) => React.HTMLAttributes<HTMLElement>;
}

// Above the row's midpoint lands before it, below lands after.
export function dropSide(row: HTMLElement, clientY: number): DropSide {
  const bounds = row.getBoundingClientRect();
  return clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';
}

// An index into the ORIGINAL array, as moveItem() expects.
export function insertionIndex(hoveredIndex: number, side: DropSide): number {
  return side === 'after' ? hoveredIndex + 1 : hoveredIndex;
}

function clearMarkers(within: HTMLElement | Document): void {
  within.querySelectorAll(MARKER_SELECTOR).forEach((el) => {
    el.classList.remove(CLASS.DROP_BEFORE, CLASS.DROP_AFTER, CLASS.DROP_INTO);
  });
}

export function useDragDrop({ onRowDrop, onGroupDrop }: UseDragDropOptions): DragController {
  // A ref, not state: this changes on dragstart and dragend and must not cause
  // a render. Null whenever no drag is in flight, which is also how every
  // handler opts out.
  const draggedIndex = useRef<number | null>(null);

  // Without preventDefault the browser refuses the drop outright.
  const acceptHover = (event: React.DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const rowProps = (index: number, dayKey: DayKey | null): React.HTMLAttributes<HTMLElement> => {
    return {
      onDragStart: (event: React.DragEvent<HTMLElement>) => {
        draggedIndex.current = index;
        event.currentTarget.classList.add(CLASS.DRAGGING);
        // Guarded after the state is set: the rest of the gesture still has to
        // work when dataTransfer is absent.
        if (!event.dataTransfer) {
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        // Firefox ignores a drag that carries no payload.
        event.dataTransfer.setData('text/plain', String(index));
      },

      onDragEnd: (event: React.DragEvent<HTMLElement>) => {
        draggedIndex.current = null;
        event.currentTarget.classList.remove(CLASS.DRAGGING);
        clearMarkers(document);
      },

      onDragOver: (event: React.DragEvent<HTMLElement>) => {
        if (draggedIndex.current === null || draggedIndex.current === index) {
          return;
        }
        acceptHover(event);
        const row = event.currentTarget;
        const side = dropSide(row, event.clientY);
        row.classList.toggle(CLASS.DROP_AFTER, side === 'after');
        row.classList.toggle(CLASS.DROP_BEFORE, side === 'before');
      },

      onDragLeave: (event: React.DragEvent<HTMLElement>) => {
        event.currentTarget.classList.remove(CLASS.DROP_BEFORE, CLASS.DROP_AFTER, CLASS.DROP_INTO);
      },

      onDrop: (event: React.DragEvent<HTMLElement>) => {
        if (draggedIndex.current === null) {
          return;
        }
        event.preventDefault();
        // Read off the marker rather than recomputed, so the drop lands where
        // the user actually saw it.
        const side: DropSide = event.currentTarget.classList.contains(CLASS.DROP_AFTER) ? 'after' : 'before';
        const from = draggedIndex.current;
        draggedIndex.current = null;
        clearMarkers(document);
        onRowDrop({ from, to: insertionIndex(index, side), dayKey });
      },
    };
  };

  const groupProps = (dayKey: DayKey | null): React.HTMLAttributes<HTMLElement> => {
    return {
      onDragOver: (event: React.DragEvent<HTMLElement>) => {
        if (draggedIndex.current === null) {
          return;
        }
        acceptHover(event);
        event.currentTarget.classList.add(CLASS.DROP_INTO);
      },

      onDragLeave: (event: React.DragEvent<HTMLElement>) => {
        event.currentTarget.classList.remove(CLASS.DROP_INTO);
      },

      onDrop: (event: React.DragEvent<HTMLElement>) => {
        if (draggedIndex.current === null) {
          return;
        }
        event.preventDefault();
        const from = draggedIndex.current;
        draggedIndex.current = null;
        clearMarkers(document);
        onGroupDrop({ from, dayKey });
      },
    };
  };

  return { rowProps, groupProps };
}
