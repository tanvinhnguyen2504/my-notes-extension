import { firstSubType, isMemoSubTypeFor, isMemoType } from '@/src/core/memo_utils';
import { EMemoType, IMemo } from '@/src/core/types/memos';
import { isRecord, newId } from '@/src/core/utils';
import { readDataByKeyFromStorage, writeKey } from './local';

export const MEMOS_KEY = 'memo.v1';

function savedType(value: unknown): EMemoType {
  if (isMemoType(value)) {
    return value;
  }
  return EMemoType.NOTE;
}

export function normalizeMemos(saved: unknown): IMemo[] {
  if (!Array.isArray(saved)) {
    return [];
  }
  return saved.map((raw: unknown): IMemo => {
    const memo = isRecord(raw) ? raw : {};
    const type = savedType(memo.type);
    return {
      label: String(memo.label ?? ''),
      id: typeof memo.id === 'string' && memo.id ? memo.id : newId(),
      type,
      subType: isMemoSubTypeFor(type, memo.subType) ? memo.subType : firstSubType(type),
      content: String(memo.content ?? ''),
      isPinned: !!memo.isPinned,
      uses: Number(memo.uses) || 0,
      updatedAt: Number(memo.updatedAt) || null,
    };
  });
}

export function loadMemos(): Promise<IMemo[]> {
  return readDataByKeyFromStorage(MEMOS_KEY, normalizeMemos);
}

export function saveMemos(memos: IMemo[]): void {
  writeKey(MEMOS_KEY, memos);
}
