import {
  EMemoType,
  IMemo,
  MEMO_SUBTYPES,
  MEMO_TYPE_LABELS,
  MemoSubType,
} from '@/src/core/types/memos';
import { newId } from '@/src/core/utils';

export function isMemoType(value: unknown): value is EMemoType {
  return typeof value === 'string' && Object.hasOwn(MEMO_SUBTYPES, value);
}

export function isMemoSubTypeFor(type: EMemoType, value: unknown): value is MemoSubType {
  const legal = MEMO_SUBTYPES[type];
  return legal.some((subType) => {
    return subType === value;
  });
}

export function firstSubType(type: EMemoType): MemoSubType {
  const first = MEMO_SUBTYPES[type][0];
  if (!first) {
    return MEMO_SUBTYPES[EMemoType.NOTE][0] as MemoSubType;
  }
  return first;
}

export function newMemo(type: EMemoType): IMemo {
  return {
    label: '',
    id: newId(),
    type,
    subType: firstSubType(type),
    content: '',
    isPinned: false,
    uses: 0,
    updatedAt: null,
  };
}

export function touchMemo(memo: IMemo): IMemo {
  return { ...memo, updatedAt: Date.now() };
}

// Widened from memo.md's pattern: the spec's version requires the keyword
// flush against the `=`, which misses `AWS_SECRET_KEY=x`. Advisory only, so
// false positives are the safe direction.
const SECRET_PATTERN =
  /[\w-]*(password|passwd|pwd|secret|token|api[_-]?key)[\w-]*\s*[=:]\s*\S+|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|:\/\/[^\s:\/]+:[^\s@\/]+@/i;

export function looksLikeSecret(body: string): boolean {
  return SECRET_PATTERN.test(body);
}

export function defaultLabel(type: EMemoType): string {
  return `Untitled ${MEMO_TYPE_LABELS[type].toLowerCase()}`;
}

export function filterMemos(memos: IMemo[], type: EMemoType | null, query: string): IMemo[] {
  const needle = query.trim().toLowerCase();
  return memos.filter((memo) => {
    if (type !== null && memo.type !== type) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return memo.label.toLowerCase().includes(needle) || memo.content.toLowerCase().includes(needle);
  });
}

function byRecent(a: IMemo, b: IMemo): number {
  return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
}

export function splitPinned(memos: IMemo[]): { pinned: IMemo[]; recent: IMemo[] } {
  const pinned: IMemo[] = [];
  const recent: IMemo[] = [];
  memos.forEach((memo) => {
    if (memo.isPinned) {
      pinned.push(memo);
      return;
    }
    recent.push(memo);
  });
  return { pinned: pinned.sort(byRecent), recent: recent.sort(byRecent) };
}

export function firstLine(content: string): string {
  return content.split('\n')[0] ?? '';
}
