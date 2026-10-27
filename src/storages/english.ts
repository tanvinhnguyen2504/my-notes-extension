import { detectType } from '@/src/core/english_utils';
import { ENGLISH_TYPE, EnglishItem, EnglishType } from '@/src/core/types/english';
import { isRecord, newId } from '@/src/core/utils';
import { getDataFromStorageByKey, setDataToStorageByKey } from './local';

export const ENGLISH_KEY = 'english.v1';

function savedType(value: unknown, en: string): EnglishType {
  if (value === ENGLISH_TYPE.WORD || value === ENGLISH_TYPE.SENTENCE) {
    return value;
  }
  return detectType(en);
}

function savedText(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }
  return value;
}

export function normalizeEnglish(saved: unknown): EnglishItem[] {
  if (!Array.isArray(saved)) {
    return [];
  }
  return saved.map((raw: unknown): EnglishItem => {
    const item = isRecord(raw) ? raw : {};
    const en = String(item.en ?? '');
    return {
      // Only when absent: a fresh id on every load remounts every row.
      id: typeof item.id === 'string' && item.id ? item.id : newId(),
      type: savedType(item.type, en),
      en,
      vi: String(item.vi ?? ''),
      pos: savedText(item.pos),
      example: savedText(item.example),
      createdAt: Number(item.createdAt) || 0,
    };
  });
}

function passThrough(saved: unknown): unknown {
  return saved;
}

// Seeding lives here rather than in the normalizer, because only the loader can
// tell "key never written" (seed) from "key written and emptied" (respect it).
export async function loadEnglish(): Promise<EnglishItem[]> {
  const raw = await getDataFromStorageByKey(ENGLISH_KEY, passThrough);
  if (raw === undefined || raw === null) {
    return [];
  }
  return normalizeEnglish(raw);
}

export function saveEnglish(items: EnglishItem[]): void {
  setDataToStorageByKey(ENGLISH_KEY, items);
}
