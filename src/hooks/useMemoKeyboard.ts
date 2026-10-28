import { useEffect, useRef } from 'react';
import { EKeyboardKey } from '@/src/core/types/keyboard';

export interface UseMemoKeyboardOptions<Row extends { id: string }> {
  // False while an editor is open, so the page shortcuts do not fight it.
  enabled: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  rows?: readonly Row[];
  focusedId?: string | null;
  onQueryChange: (value: string) => void;
  onFocusChange?: (id: string | null) => void;
  onEnter?: (row: Row) => void;
  onNew?: () => void;
  onEdit?: (row: Row) => void;
}

export function useMemoKeyboard<Row extends { id: string }>(options: UseMemoKeyboardOptions<Row>): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { enabled } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      const current = optionsRef.current;
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (event.key === EKeyboardKey.ESCAPE) {
        if (current.query) {
          event.preventDefault();
          current.onQueryChange('');
        }
        current.searchRef.current?.blur();
        return;
      }
      if (event.key === EKeyboardKey.SLASH && !typing) {
        event.preventDefault();
        current.searchRef.current?.focus();
        return;
      }
      if (typing && event.key !== EKeyboardKey.ARROW_DOWN && event.key !== EKeyboardKey.ARROW_UP) {
        return;
      }

      const rows = current.rows;
      if (!rows || rows.length === 0) {
        return;
      }
      const at = rows.findIndex((row) => {
        return row.id === current.focusedId;
      });

      if (event.key === EKeyboardKey.ARROW_DOWN) {
        event.preventDefault();
        const next = rows[Math.min(at + 1, rows.length - 1)];
        current.onFocusChange?.(next ? next.id : null);
        return;
      }
      if (event.key === EKeyboardKey.ARROW_UP) {
        event.preventDefault();
        const next = rows[Math.max(at - 1, 0)];
        current.onFocusChange?.(next ? next.id : null);
        return;
      }
      if (event.key === EKeyboardKey.ENTER && at >= 0) {
        const row = rows[at];
        if (row) {
          current.onEnter?.(row);
        }
        return;
      }
      const pressed = event.key.toLowerCase();

      if (pressed === EKeyboardKey.NEW && !typing) {
        current.onNew?.();
        return;
      }
      if (pressed === EKeyboardKey.EDIT && !typing && at >= 0) {
        const row = rows[at];
        if (row) {
          current.onEdit?.(row);
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}
