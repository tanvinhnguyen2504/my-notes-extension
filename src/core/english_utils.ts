import { ENGLISH_TYPE, EnglishItem, EnglishType } from './types/english';
import { newId } from './utils';

// --- type detection ---------------------------------------------------

const SENTENCE_END_PATTERN = /[.?!]$/;
const WORD_LIMIT = 3;

// Either rule is enough: "Hi." is a sentence on punctuation alone, and a
// four-word phrase with no punctuation is one on length alone.
export function detectType(text: string): EnglishType {
  const trimmed = text.trim();
  if (!trimmed) {
    return ENGLISH_TYPE.WORD;
  }
  if (SENTENCE_END_PATTERN.test(trimmed)) {
    return ENGLISH_TYPE.SENTENCE;
  }
  const words = trimmed.split(/\s+/);
  if (words.length > WORD_LIMIT) {
    return ENGLISH_TYPE.SENTENCE;
  }
  return ENGLISH_TYPE.WORD;
}

// --- brackets ---------------------------------------------------------

export interface EnglishSegment {
  text: string;
  marked: boolean;
}

// No nesting, and an unmatched bracket is not a match at all -- so a stray `[`
// falls through as literal text rather than swallowing the rest of the line.
const BRACKET_PATTERN = /\[([^[\]]*)\]/g;

export function parseBrackets(en: string): EnglishSegment[] {
  const segments: EnglishSegment[] = [];
  let at = 0;

  for (const match of en.matchAll(BRACKET_PATTERN)) {
    const index = match.index;
    if (index > at) {
      segments.push({ text: en.slice(at, index), marked: false });
    }
    const inner = match[1] ?? '';
    // An empty `[]` contributes nothing, so it disappears from both the render
    // and the stripped string.
    if (inner) {
      segments.push({ text: inner, marked: true });
    }
    at = index + match[0].length;
  }

  if (at < en.length) {
    segments.push({ text: en.slice(at), marked: false });
  }
  return segments;
}

// The clipboard's and the speech synthesiser's view of the same parse, so the
// highlight and the copied text cannot disagree about what a bracket is.
export function stripBrackets(en: string): string {
  return parseBrackets(en)
    .map((segment) => {
      return segment.text;
    })
    .join('');
}

// --- search -----------------------------------------------------------

// \p{M} rather than a hand-written range: the explicit Combining Diacritical
// Marks block misses the Vietnamese tone marks that sit outside it.
const COMBINING_PATTERN = /\p{M}/gu;

// Lowercase FIRST, so one `đ` replace covers `Đ` too -- `đ` has no NFD
// decomposition, so it has to be mapped by hand.
export function foldDiacritics(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(COMBINING_PATTERN, '').replace(/đ/g, 'd');
}

export function matchesQuery(item: EnglishItem, query: string): boolean {
  const needle = foldDiacritics(query.trim());
  if (!needle) {
    return true;
  }
  return foldDiacritics(item.en).includes(needle) || foldDiacritics(item.vi).includes(needle);
}

function byNewest(a: EnglishItem, b: EnglishItem): number {
  return b.createdAt - a.createdAt;
}

// `type` null means All. Sorted newest-first always: relevance ordering would
// make rows jump under the cursor while typing.
export function filterEnglish(items: EnglishItem[], type: EnglishType | null, query: string): EnglishItem[] {
  const matched = items.filter((item) => {
    if (type !== null && item.type !== type) {
      return false;
    }
    return matchesQuery(item, query);
  });
  return matched.sort(byNewest);
}

// The SENTENCES / WORDS split the list renders, mirroring memo_utils'
// splitPinned: the grouping rule is data, so it stays out of the component.
export function groupEnglishByType(items: EnglishItem[]): Record<EnglishType, EnglishItem[]> {
  const groups: Record<EnglishType, EnglishItem[]> = {
    [ENGLISH_TYPE.SENTENCE]: [],
    [ENGLISH_TYPE.WORD]: [],
  };
  items.forEach((item) => {
    groups[item.type].push(item);
  });
  return groups;
}

export function countEnglishByType(items: EnglishItem[]): Record<EnglishType, number> {
  const counts: Record<EnglishType, number> = {
    [ENGLISH_TYPE.WORD]: 0,
    [ENGLISH_TYPE.SENTENCE]: 0,
  };
  items.forEach((item) => {
    counts[item.type] += 1;
  });
  return counts;
}

// --- adding -----------------------------------------------------------

// Trimmed and case-insensitive, but diacritics are NOT folded: this compares
// English text, where `resume` and `résumé` are different words.
export function findDuplicate(items: EnglishItem[], en: string): EnglishItem | null {
  const needle = en.trim().toLowerCase();
  if (!needle) {
    return null;
  }
  const existing = items.find((item) => {
    return item.en.trim().toLowerCase() === needle;
  });
  if (!existing) {
    return null;
  }
  return existing;
}

export function newEnglishItem(en: string, vi: string): EnglishItem {
  const text = en.trim();
  return {
    id: newId(),
    type: detectType(text),
    en: text,
    vi: vi.trim(),
    createdAt: Date.now(),
  };
}
