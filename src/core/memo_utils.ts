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

export type MemoTokenKind = 'cmd' | 'text' | 'str' | 'flag' | 'kw' | 'pipe' | 'comment';

export interface IMemoToken {
  text: string;
  kind: MemoTokenKind;
}

const SQL_KEYWORDS: ReadonlySet<string> = new Set([
  'select', 'from', 'where', 'and', 'or', 'order', 'by', 'group', 'limit',
  'insert', 'into', 'update', 'set', 'delete', 'join', 'left', 'right',
  'on', 'as', 'desc', 'asc',
]);

// One pass, alternation ordered by greediness: a quoted run wins over the
// pipe inside it, and the pipe wins over the bare-word rule. An unterminated
// quote falls through to the word branch rather than swallowing the line.
const PIECE_PATTERN = /('[^']*'|"[^"]*"|`[^`]*`)|(\s\|\s)|(\s+)|(\S+)/g;

function isFlag(piece: string): boolean {
  return /^--?[A-Za-z][\w-]*(=.*)?$/.test(piece);
}

export function tokenizeMemoLine(line: string, type: EMemoType): IMemoToken[] {
  if (line === '') {
    return [];
  }
  if (type === EMemoType.NOTE && line.trimStart().startsWith('#')) {
    return [{ text: line, kind: 'comment' }];
  }

  const commandLed = type === EMemoType.GIT || type === EMemoType.SHELL;
  const tokens: IMemoToken[] = [];
  let seenWord = false;

  for (const match of line.matchAll(PIECE_PATTERN)) {
    const [piece, quoted, pipe, space] = match;

    if (quoted !== undefined) {
      tokens.push({ text: piece, kind: 'str' });
      seenWord = true;
      continue;
    }
    if (pipe !== undefined) {
      tokens.push({ text: piece, kind: 'pipe' });
      continue;
    }
    if (space !== undefined) {
      tokens.push({ text: piece, kind: 'text' });
      continue;
    }
    if (isFlag(piece)) {
      tokens.push({ text: piece, kind: 'flag' });
      seenWord = true;
      continue;
    }
    if (commandLed && !seenWord) {
      tokens.push({ text: piece, kind: 'cmd' });
      seenWord = true;
      continue;
    }
    if (type === EMemoType.DATABASE && SQL_KEYWORDS.has(piece.toLowerCase())) {
      tokens.push({ text: piece, kind: 'kw' });
      seenWord = true;
      continue;
    }
    tokens.push({ text: piece, kind: 'text' });
    seenWord = true;
  }

  return tokens;
}

export function countMemosByType(memos: IMemo[]): Record<EMemoType, number> {
  const counts: Record<EMemoType, number> = {
    [EMemoType.GIT]: 0,
    [EMemoType.DATABASE]: 0,
    [EMemoType.SHELL]: 0,
    [EMemoType.CONFIG]: 0,
    [EMemoType.NOTE]: 0,
  };
  memos.forEach((memo) => {
    counts[memo.type] += 1;
  });
  return counts;
}
