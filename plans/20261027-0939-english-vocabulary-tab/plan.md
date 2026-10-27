# Plan: English — work vocabulary tab

## Goal

Add a third popup mode, **English**, for saving English words and sentences used
at work together with their Vietnamese meaning, so each one can be copied to the
clipboard or spoken aloud in a single click. The surface is deliberately flat:
one search box, one 3-way filter, one list, one add bar.

The value is the same as the Dev tab's: the phrases a non-native speaker needs
in a standup are the ones that vanish under pressure, and a toolbar popup is one
keystroke away from the meeting tab.

## Scope

**In scope**

- A fourth storage slice, `english.v1`, holding `EnglishItem[]`, with a
  normalizer, load, save, and first-install seeding (6 words, 7 sentences).
- `EnglishItem` in `src/core/types/english.ts`; pure helpers in
  `src/core/english_utils.ts` (type detection, bracket parsing, diacritic-blind
  search, duplicate detection).
- English cases in `core/reducer.ts`, addressed **by id**.
- `PopupMode` widened to a third value; `Tab.tsx` becomes a 3-way control.
- `EnglishPage`: search, All/Sentences/Words filter with counts, newest-first
  list, bracket-highlighted rows, Listen + Copy icon buttons, expand-to-example,
  delete with a 5-second Undo toast, both empty states, the add bar with live
  type hint and duplicate guard.
- Keyboard: `/` focuses search, `Esc` clears, `Enter` adds from either input.
- New `@theme` tokens for the bracket highlight and the toast.
- Throwaway `npx tsx` verification scripts for every pure helper (see Open
  questions on "unit tests").

**Out of scope**

- Editing a saved item. The spec gives no edit affordance — add, delete, undo
  only, and the reducer carries no generic update case.
- **Any spaced-repetition or daily-drill behaviour.** The spec's "Phrase of the
  day" card, its review schedule, its streak and its settings switch are all
  out: `ReminderPage` stays tasks-only, an `EnglishItem` carries no review
  fields, and `Settings` gains nothing. See the decision below.
- `chrome.storage.sync`. See the decision below.
- Any new npm dependency. Everything here is React 19 + Radix + Tailwind v4 and
  two platform APIs (`speechSynthesis`, `navigator.clipboard`) that need no
  permission and no library.
- CSV export of English items. `features/export.ts` stays tasks-only.
- Touching tasks or memos behaviour.

## Architecture / Design decisions

**`chrome.storage.local`, not `sync` — and `english.v1`, not `englishItems`.**
The spec asks for `sync` with a fallback to `local` "if the data gets close to
the sync quota". That quota is the problem: `chrome.storage.sync` enforces
`QUOTA_BYTES_PER_ITEM = 8192` **per key**, and this design puts every item in
one array under one key. The seed data alone is ~2.5 kB of JSON; ~40 sentences
with examples exceeds 8 kB and `set()` starts rejecting. A "fall back when close
to the quota" path means writing a byte-counter, a migration from `sync` to
`local`, and a second `onChanged` area branch in both `PopupPage` and
`background.ts` — real complexity for a feature with no second device in play.
So: `local`, through the existing `storages/local.ts`, keyed `english.v1` to
match `tasks.v1` / `settings.v1` / `memo.v1`. Flagged as an open question; it is
a one-file change if you want `sync`.

**English items address by id; tasks address by index.** Same asymmetry the memo
slice already established. The list is filtered by chip, filtered by query and
sorted by `createdAt` descending, so a rendered position says nothing about the
array. Every English action takes `id: string`.

**The feature adds one storage key and nothing else.** An `EnglishItem` is
exactly `{ id, type, en, vi, pos?, example?, createdAt }`, and `Settings` keeps
the shape it already had. Two consequences follow: an item is immutable once
added, so the reducer needs only add, delete and restore — no update case — and
nothing outside the popup ever writes `english.v1`, so this feature never
re-syncs the reminder alarm.

**Brackets are parsed, never regex-replaced at the render site.**
`parseBrackets(en)` returns `{ text, marked }[]` segments; `stripBrackets(en)`
returns the plain string that Copy and Listen use. Two consumers of one parse
means the highlight and the clipboard can never disagree about what a bracket
is. Both are pure and live in `core/english_utils.ts`, which keeps them
testable and keeps `core/` DOM-free — note that `speechSynthesis` therefore
belongs in the component, not in `core/`.

**Diacritic folding is NFD + strip combining marks + `đ→d`.** `String.prototype.
normalize('NFD')` decomposes `ế` into `e` + two combining marks, which
`/[̀-ͯ]/g` removes; `đ` has no decomposition, so it is mapped
explicitly (both cases). Folding is applied to the needle *and* to `en`/`vi`.

**Colour literals from the spec become tokens.** The spec lists `#1C1D20`,
`#5BB89E`, `#8FDCC4` on `#23382F` and so on. The repo's rule is that colour
values live in `@theme` only, and most of these already exist as
`--color-bg` / `--color-surface` / `--color-teal` / `--color-on-teal` in both
themes. Only the bracket highlight is genuinely new: `--color-mark-bg` /
`--color-mark-fg`, defined in both themes (light teal on dark teal is a dark-mode
spec; light mode needs its own pair or the text is invisible).

**Single-click expand is on the text button only.** The row's text area is a
real `<button aria-expanded>`, and the two icon buttons are siblings of it, not
children — the codebase has already been burned by a row-body click handler that
every inner control inherited.

## Phases

| Phase | File | What it delivers |
|-------|------|-----------------|
| 1 | `plan-1-domain-model-and-storage.md` | `EnglishItem`, `core/english_utils.ts`, the `english.v1` slice with normalizer + seed, the reducer's add/delete/restore cases, `persistChanged` and the `onChanged` branch. |
| 2 | `plan-2-tab-and-list-view.md` | `PopupMode` third value, 3-way `Tab`, `EnglishPage` shell, toolbar search + filter counts, the row with bracket highlighting and both empty states. |
| 3 | `plan-3-row-actions.md` | Listen (`speechSynthesis`), Copy with the 1.2 s check state, expand-to-example with single-open semantics, Delete + 5 s Undo toast. |
| 4 | `plan-4-add-bar.md` | The fixed add bar: two inputs, live type hint, disabled state, Enter-to-save, post-save focus/highlight/filter-follow, duplicate detection that scrolls to the existing row. |
| 5 | `plan-5-keyboard-and-wide-pass.md` | `/` and `Esc` handling scoped to the English tab, focus rings, 40 px touch targets, and a compact + wide-mode layout pass with no horizontal scroll. |
| 6 | `plan-6-verification.md` | `npx tsx` scripts covering type detection, bracket parsing/stripping, folded search and duplicate detection; the manual Chrome checklist. |

## Success criteria

- `npm run check` exits clean after every phase.
- `npm run build` succeeds and loading `.output/chrome-mv3/` shows a three-way
  `Tasks | Dev | English` control in the popup header.
- A fresh profile opens the English tab to 13 seeded items — 6 words, 7
  sentences — newest first, with the filter counts reading `All 13 / Sentences 7
  / Words 6`.
- Typing `tien do` into the search matches "Bạn có thể giải thích giúp mình
  [tiến độ] được không?" — diacritics and all.
- `"I'll have it done by [end of day]."` renders as `I'll have it done by` +
  `end of day` in a teal highlight, with no literal `[` or `]` anywhere.
- Copy puts `I'll have it done by end of day.` on the clipboard (brackets gone),
  and the icon shows a check on teal for 1.2 s.
- Listen speaks the same bracket-free string, and clicking two rows in quick
  succession speaks only the second.
- Adding `prioritize` while the filter is on `Sentences` switches the filter to
  `Words`, clears both inputs, keeps focus in the English input and briefly
  highlights the new row.
- Adding `  Deadline  ` does not create a second item: the existing `deadline`
  row scrolls into view and highlights.
- Deleting an item shows an Undo toast; clicking Undo within 5 s restores it at
  its original position in the newest-first order.
- Closing and reopening the popup lands on the English tab with the same items;
  `chrome.storage.local`'s `english.v1` is an array of complete `EnglishItem`
  objects.
- The reminder window is byte-for-byte the behaviour it had before this work:
  no card, no English import, and `settings.v1` gains no key.
- Both popup widths show no horizontal scrollbar, and no `.tsx` file added by
  this work contains a colour literal.

## Open questions

- ~~**`sync` vs `local`.**~~ **Decided: `local`, key `english.v1`.** The
  alternative considered and rejected was one key *per item* in `sync` (each
  item well under 8 kB, 512-key limit); it is a different storage module, not a
  flag, and nothing after phase 1 is affected either way.
- ~~**"Write unit tests" vs no test framework.**~~ **Decided: throwaway
  `npx tsx` script**, per the repo's existing practice — no new dependency, and
  no retained regression guard. The pure helpers are still written so that
  moving the assertions into `*.test.ts` under vitest later is mechanical.
- ~~**The third tab, not a second one.**~~ **Decided: three-way
  `Tasks | Dev | English`**, all three with text labels. At 380 px compact each
  segment is ~118 px, which fits the existing 12 px labels; if it reads cramped
  in the browser, the fallback is collapsing Dev to its `>_` glyph.
- **`pos` is a free string, not an enum.** The spec lists "noun, verb, phrasal
  verb, phrase…" with an ellipsis and makes the field optional, so it stays
  `string | undefined` with no clamp in the normalizer. The add bar does not
  collect it — only the seed data has one. If words should be addable *with* a
  part of speech, that is a third input and a wider add bar; say so and it folds
  into phase 4.
