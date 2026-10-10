// Reserved: nothing reads or writes a memo yet. The shape is provisional --
// a key that has only ever held `[]` can change freely.

import { Memo } from '../core/types.ts';
import { isRecord, newId } from '../core/utils.ts';
import { readDataByKeyFromStorage, writeKey } from './local.ts';

export const MEMOS_KEY = 'memo.v1';

export function normalizeMemos(saved: unknown): Memo[] {
  if (!Array.isArray(saved)) {
    return [];
  }
  return saved.map((raw: unknown): Memo => {
    const memo = isRecord(raw) ? raw : {};
    return {
      id: typeof memo.id === 'string' && memo.id ? memo.id : newId(),
      text: String(memo.text ?? ''),
      updatedAt: Number(memo.updatedAt) || null,
    };
  });
}

export function loadMemos(): Promise<Memo[]> {
  return readDataByKeyFromStorage(MEMOS_KEY, normalizeMemos);
}

export function saveMemos(memos: Memo[]): void {
  writeKey(MEMOS_KEY, memos);
}
