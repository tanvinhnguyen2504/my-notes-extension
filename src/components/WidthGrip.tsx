import { GripHandlers, GripSide } from '@/src/hooks/useWidthDrag';

export interface WidthGripProps {
  side: GripSide;
  handlers: GripHandlers;
}

export function WidthGrip({ side, handlers }: WidthGripProps): React.JSX.Element {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize popup width"
      className={`fixed top-0 bottom-0 z-[3] w-[5px] cursor-ew-resize touch-none hover:bg-hover ${side === 'left' ? 'left-0' : 'right-0'}`}
      {...handlers}
    />
  );
}
