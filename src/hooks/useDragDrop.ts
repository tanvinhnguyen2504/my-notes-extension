// Nothing here may render: dragover fires continuously, so the dragged index is
// a ref and markers go on with classList. That is also what makes mutating
// classList on React's nodes safe -- every marker is cleared before the drop's render.

import { useRef } from 'react';
import { DayKey } from '@/src/core/types';

const CLASS = {
  DRAGGING: 'dragging',
  DROP_BEFORE: 'drop-before',
  DROP_AFTER: 'drop-after',
  DROP_INTO: 'drop-into',
} as const;

const MARKER_SELECTOR = `.${CLASS.DROP_BEFORE}, .${CLASS.DROP_AFTER}, .${CLASS.DROP_INTO}`;

export type DropSide = 'before' | 'after';

// `to` indexes the array as it was BEFORE the move, as moveItem() expects.
export interface RowDrop {
  from: number;
  to: number;
  dayKey: DayKey | null;
}

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

export function dropSide(row: HTMLElement, clientY: number): DropSide {
  const bounds = row.getBoundingClientRect();
  return clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';
}

export function insertionIndex(hoveredIndex: number, side: DropSide): number {
  return side === 'after' ? hoveredIndex + 1 : hoveredIndex;
}

function clearMarkers(within: HTMLElement | Document): void {
  within.querySelectorAll(MARKER_SELECTOR).forEach((el) => {
    el.classList.remove(CLASS.DROP_BEFORE, CLASS.DROP_AFTER, CLASS.DROP_INTO);
  });
}

export function useDragDrop({ onRowDrop, onGroupDrop }: UseDragDropOptions): DragController {
  const draggedIndex = useRef<number | null>(null);

  // Without preventDefault the browser refuses the drop.
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
        if (!event.dataTransfer) {
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        // Firefox ignores a drag with no payload.
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
        // Read off the marker, so the drop lands where the user saw it.
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
