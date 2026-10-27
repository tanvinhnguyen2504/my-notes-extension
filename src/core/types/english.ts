export const ENGLISH_TYPE = {
  WORD: 'word',
  SENTENCE: 'sentence',
} as const;

// Derived, so widening the const object widens the type.
export type EnglishType = (typeof ENGLISH_TYPE)[keyof typeof ENGLISH_TYPE];

export interface EnglishItem {
  id: string;
  type: EnglishType;
  // May carry [brackets] around the parts the user swaps out. Stored WITH them;
  // every consumer goes through parseBrackets or stripBrackets.
  en: string;
  vi: string;
  pos?: string;
  example?: string;
  createdAt: number;
}

export const ENGLISH_TYPE_ORDER = [ENGLISH_TYPE.SENTENCE, ENGLISH_TYPE.WORD] as const;

export const ENGLISH_TYPE_LABELS: Record<EnglishType, string> = {
  [ENGLISH_TYPE.SENTENCE]: 'Sentences',
  [ENGLISH_TYPE.WORD]: 'Words',
};
