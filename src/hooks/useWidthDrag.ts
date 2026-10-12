import { useRef } from 'react';
import { WIDE_WIDTH_PROPERTY } from '../core/utils.ts';

export type GripSide = 'left' | 'right';

export function applyWideWidth(width: number): void {
  document.documentElement.style.setProperty(WIDE_WIDTH_PROPERTY, `${width}px`);
}

export interface UseWidthDragOptions {
  width: number;
  clamp: (value: number) => number;
  onCommit: (width: number) => void;
}

export interface GripHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
}

export function useWidthDrag({ width, clamp, onCommit }: UseWidthDragOptions): (side: GripSide) => GripHandlers {
  // Refs, not state: reading these must never cause a render.
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const liveWidthRef = useRef(0);
  const draggingRef = useRef(false);

  return (side: GripSide): GripHandlers => {
    const direction = side === 'left' ? -1 : 1;

    const onPointerDown = (event: React.PointerEvent<HTMLElement>): void => {
      if (event.button !== 0) {
        return;
      }
      startXRef.current = event.screenX;
      startWidthRef.current = width;
      liveWidthRef.current = width;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: React.PointerEvent<HTMLElement>): void => {
      if (!draggingRef.current) {
        return;
      }
      const next = clamp(startWidthRef.current + (event.screenX - startXRef.current) * direction);
      if (next === liveWidthRef.current) {
        return;
      }
      liveWidthRef.current = next;
      applyWideWidth(next);
    };

    const onPointerUp = (event: React.PointerEvent<HTMLElement>): void => {
      if (!draggingRef.current) {
        return;
      }
      draggingRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      onCommit(liveWidthRef.current);
    };

    return { onPointerDown, onPointerMove, onPointerUp };
  };
}
