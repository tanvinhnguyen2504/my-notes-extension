# Phase 2 — The third tab, the list and the toolbar

## Goal

Make the English tab reachable and show the seeded items, searchable and
filterable, with both empty states.

## Tasks

- [ ] `core/types.ts`: `PopupMode` becomes `'tasks' | 'memos' | 'english'`.
- [ ] `Tab.tsx`: a third `Tabs.Trigger` with value `english`, label `English`,
      reusing the existing `TRIGGER` class string unchanged.
- [ ] `PopupPage.tsx`: widen the `onValueChange` guard to accept `english`, and
      replace the two-branch `isTasksMode` ternary with a switch over
      `state.settings.mode` rendering the third `Tabs.Content`.
- [ ] `src/components/EnglishPage.tsx`: owns `query`, `activeType`,
      `expandedId`, and renders toolbar → list → (phase 4) add bar. Takes
      `{ state, dispatch }` and owns no storage, since Radix unmounts it.
- [ ] `src/components/english/EnglishMemoToolbar.tsx`: the search `<input>` with
      `placeholder="Search English or Vietnamese"` plus the 3-way filter.
- [ ] `src/components/english/EnglishFilter.tsx`: `All n / Sentences n /
  Words n`, modelled on `memos/MemoFilterChips.tsx`. Counts come from
      `state.english`, never from the filtered list, so they hold still while
      typing.
- [ ] `src/components/english/EnglishMemoRow.tsx`: the row — text button, the two
      icon-button slots (wired in phase 3), line 2.
- [ ] `src/components/english/MarkedText.tsx`: renders `parseBrackets` segments,
      marked ones in a `<mark>`-styled span.
- [ ] `src/components/english/EnglishEmptyState.tsx`: both messages — "no items
      at all" and `Nothing matches "<query>"` with the add hint.
- [ ] `styles.css`: `--color-mark-bg` / `--color-mark-fg` in the light `@theme`
      block and again in the dark block.

## Implementation notes

**The row's two text lines differ only by type, so branch on the class string,
not on the markup.** Word: `text-[17px] font-semibold` followed by `pos` in
`text-[11px] text-dim`. Sentence: `text-[16px] font-normal`. One component, one
ternary — a second row component would duplicate the bracket rendering.

**Line 2 carries `lang="vi"`** so the browser picks Vietnamese hyphenation and a
screen reader the right voice. It is the one attribute here that is not
cosmetic.

**`MarkedText` cannot use a bare `<mark>`.** Preflight is not imported, so
`<mark>` has whatever the UA gives it — yellow in every browser — and no reset
in `styles.css` touches it. Use a `<span>` with
`bg-mark-bg text-mark-fg rounded-[4px] px-[3px]`, or add `mark` to the
`@layer base` reset. The span is the smaller change.

**The dark-mode highlight pair is the spec's `#8FDCC4` on `#23382F`.** Light
mode needs its own pair — that foreground on that background is unreadable
against a `#fffdfa` surface. Derive both from `--color-teal` with
`color-mix(in oklch, …)` so they track a theme change, the way
`--color-tag-low-bg` already does.

**Search filters, it does not re-sort.** `filterEnglish` sorts by `createdAt`
descending always; relevance ordering is not in the spec and would make the list
jump under the cursor.

**The filter's counts are `state.english.length` and the two type counts** — not
the counts _after_ the query. Re-deriving them from the matched list makes every
count read `0` as soon as the query excludes everything, which looks like data
loss.

**Both panels stay unmounted-safe.** `EnglishPage` holds only view state; every
write goes through the `dispatch` passed down from `PopupPage`, which is the only
owner of the reducer and the storage subscription.

## Verify

- `npm run check` clean; `npm run build` succeeds.
- The popup header shows three segments, and clicking `English` lands on the new
  panel. Closing and reopening the popup returns to it (`mode` persisted).
- 13 rows, newest first, counts `All 13 / Sentences 7 / Words 6`.
- `stakeholder` renders bold at 17 px with `noun` in muted text after it;
  `"I'll have it done by [end of day]."` renders at 16 px with `end of day`
  highlighted and no literal brackets.
- Typing `tien do` matches the timeline sentence; typing `zzz` shows
  `Nothing matches "zzz"`.
- Switching to `Words` shows 6 rows; the counts do not change while typing.
- The highlight is legible in `html[data-theme="dark"]` **and** in light mode.
