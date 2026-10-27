# Phase 1 — Domain model and the `english.v1` slice

## Goal

Make English items a first-class, persisted slice of `State` with every pure
helper the UI will need, so phases 2–6 are rendering work only.

## Tasks

- [ ] `src/core/types/english.ts`: `EnglishItem` (`id`, `type`, `en`, `vi`,
      `pos?`, `example?`, `createdAt`) and
      `ENGLISH_TYPE = { WORD: 'word', SENTENCE: 'sentence' } as const` with
      `EnglishType` derived from it, matching how `Priority` is derived.
- [ ] `src/core/types.ts`: add `english: EnglishItem[]` to `State`. `Settings` is
      **not** touched — there is no review state to store.
- [ ] `src/core/english_utils.ts`, all pure and DOM-free: - `detectType(text): EnglishType` — sentence if `> 3` whitespace-separated
      words **or** the trimmed text ends in `.`, `?` or `!`; else word. - `parseBrackets(en): { text: string; marked: boolean }[]` — one pass,
      unmatched `[` falls through as literal text rather than swallowing the
      rest of the line. - `stripBrackets(en): string` — `parseBrackets` joined, so the two cannot
      disagree. - `foldDiacritics(value): string` — `toLowerCase()`, `normalize('NFD')`,
      strip `\p{M}`, then `đ→d` (do the `đ` map on the lowercased string so one
      replace covers both cases). - `matchesQuery(item, query): boolean` — folded needle against folded `en`
      and `vi`; an empty needle matches. - `filterEnglish(items, type, query): EnglishItem[]` — type `null` means
      All; sorts `createdAt` descending. - `countEnglishByType(items): Record<EnglishType, number>`. - `findDuplicate(items, en): EnglishItem | null` — trimmed,
      case-insensitive, diacritics **not** folded (English text). - `newEnglishItem(en, vi): EnglishItem` — `newId()`, `detectType`,
      `createdAt: Date.now()`, trimmed fields, no `pos`/`example`.
- [ ] `src/storages/english.ts`: `ENGLISH_KEY = 'english.v1'`,
      `normalizeEnglish(saved): EnglishItem[]`, `loadEnglish`, `saveEnglish`,
      following `storages/memo.ts` line for line.
- [ ] `src/storages/state.ts`: `emptyState()` gains `english: []`; `loadState()`
      adds `loadEnglish()` to the `Promise.all`; `persistChanged` adds the
      reference comparison for `english`.
- [ ] `core/reducer.ts` — new cases, all by id, all returning new references:
      `ADD_ENGLISH_ITEM`, `DELETE_ENGLISH_ITEM`, `RESTORE_ENGLISH_ITEM`
      (undo — re-inserts the item as it was, order falls out of `createdAt`),
      and nothing else — no generic update case, because nothing mutates an item
      after it is added.
- [ ] `PopupPage.tsx`: add `ENGLISH_KEY` to the `chrome.storage.onChanged`
      branch, so a write from another popup instance is not overwritten by a
      stale save.

## Implementation notes

**Seeding happens in the loader, not the reducer.** `loadEnglish()` must
distinguish "key absent" from "key present and empty" — the spec seeds on first
install only, and a user who deletes all 13 items must not get them back. So
`normalizeEnglish` keeps its `unknown → EnglishItem[]` contract for an array,
and the seed decision sits in `loadEnglish`: read the raw value, and when it is
`undefined`/`null` (never seen) write the seed and return it; when it is an array
(including `[]`) normalize and return. This needs a raw read, so give
`getDataFromStorageByKey` an identity normalizer rather than adding a second
backend function.

**The normalizer builds a fresh object rather than spreading what was stored.**
That is what makes the seven fields above the whole of an item: anything else
sitting in `english.v1` is dropped on load, so no migration is ever needed when
the shape changes.

**`detectType`'s word count is on the trimmed, whitespace-split text.**
`"follow up"` is 2 words ⇒ word. `"on track"` ⇒ word. `"Please let me know if
you have any questions."` ⇒ sentence by both rules. `"Hi."` ⇒ sentence by the
punctuation rule alone, which is intended.

**`foldDiacritics` uses `\p{M}` with the `u` flag**, not a hand-written range —
the explicit `[̀-ͯ]` range misses the Vietnamese tone marks that sit
outside Combining Diacritical Marks.

**`core/english_utils.ts` must stay service-worker-safe** — `background.ts`
imports `storages/state.ts`, which will now pull in the English slice, which
pulls in these helpers. No `window`, no `document`, no `navigator`.

## Verify

- `npm run check` clean.
- A scratchpad `npx tsx` script asserts: `detectType` on the eight cases above;
  `stripBrackets("I'll have it done by [end of day].")` ⇒ no brackets;
  `parseBrackets` on an unmatched `[`; `foldDiacritics('Tiến độ')` ⇒ `tien do`;
  `findDuplicate` on `'  Deadline  '`; and `normalizeEnglish(undefined)` ⇒ `[]`.
- `npm run build`, then load the extension on a fresh profile and confirm
  `chrome.storage.local`'s `english.v1` holds 13 items. No UI exists yet; read
  it from the extension's service-worker console.
