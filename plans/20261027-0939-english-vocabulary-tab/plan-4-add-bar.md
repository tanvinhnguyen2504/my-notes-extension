# Phase 4 — The add bar

## Goal

Add an item from the bottom bar with the type inferred, duplicates refused and
the list following the new row.

## Tasks

- [ ] `src/components/english/EnglishAddBar.tsx`: a sticky bottom section
      holding two `<input>`s and an `Add` `<button>`. - English input: wider (`flex-[3]`), `placeholder="English word or
      sentence"`, `aria-label` the same. - Vietnamese input: `flex-[2]`, `placeholder="Nghĩa tiếng Việt"`,
      `lang="vi"`. - `Add` is `disabled` when the trimmed English draft is empty, with a
      `disabled:` variant for the muted look.
- [ ] The hint line under the inputs, driven by `detectType(draft)`:
      `Will be saved as a word.` / `Will be saved as a sentence. Tip: put parts
    you change in [brackets].` Empty draft shows the sentence tip's first
      half suppressed — render nothing rather than a stale hint.
- [ ] `onKeyDown` on both inputs: `Enter` saves, if the English draft is
      non-empty.
- [ ] `EnglishPage.tsx` owns the save handler: 1. `findDuplicate(state.english, draft)` — if hit, set `highlightId` to
      the existing row, scroll it into view, and **do not** add. 2. Otherwise `dispatch({ type: 'ADD_ENGLISH_ITEM', item:
       newEnglishItem(en, vi) })`. 3. Clear both drafts, refocus the English input. 4. Set `highlightId` to the new item for ~1.2 s. 5. If `activeType !== null` and it does not match the new item's type,
      set `activeType` to the new item's type.
- [ ] `EnglishMemoRow.tsx`: a `highlighted` prop adding a brief teal ring, and a
      `ref` so the page can call `scrollIntoView`.

## Implementation notes

**The hint reads from the same `detectType` the save uses.** Any second
heuristic in the component — "does it end in a period" inline — is a rule that
can drift from what actually gets stored.

**`Enter` must not submit a form, because there is no form.** Three loose
controls in a `<section>`, handled with `onKeyDown`. A `<form onSubmit>` would be
cleaner HTML but in an extension popup a submit navigates the page unless
`preventDefault` fires on every path, and a navigated popup is a blank popup.

**Guard `Enter` with `!event.isComposing` here.** This is the known Vietnamese
Telex duplicate-`Enter` suspicion from the task compose row, and the Vietnamese
input is the one place an IME is guaranteed to be active. Applying it here costs
nothing and is the right place to find out whether the guard helps.

**React's `onChange` is the DOM `input` event**, so both drafts are local
component state and nothing is read back from storage mid-type. No controlled
value is ever sourced from `state.english`.

**The filter-follow rule is "unless All is selected".** `activeType === null` is
All, and it stays put. Otherwise switching the filter is what makes the new row
visible — without it, adding a word while on `Sentences` looks like the add
silently failed.

**`highlightId` serves two different events with one piece of state** — the new
row and the duplicate row. They are mutually exclusive in a single save, so one
id and one timer is correct, not a conflation.

**`scrollIntoView({ block: 'nearest' })`,** not the default `'start'`. The
default scrolls the matched row to the top of the list, which moves rows the user
was already looking at; `'nearest'` is a no-op when the row is already visible,
which is the common case.

**Trim before comparing and before storing.** `newEnglishItem` trims, and
`findDuplicate` trims both sides — otherwise `'deadline '` is a new item that
renders identically to the existing one.

## Verify

- With the filter on `Sentences`, typing `prioritize` shows
  `Will be saved as a word.`; saving switches the filter to `Words`, clears both
  inputs, leaves the caret in the English input, and flashes the new top row.
- With the filter on `All`, the same save leaves the filter on `All`.
- Typing `Let me check and get back to you.` shows the sentence hint including
  the brackets tip, and saves as a sentence.
- `Add` is visibly disabled with the English input empty, and `Enter` in either
  input does nothing in that state.
- Typing `  Deadline  ` and pressing Enter adds nothing; the existing `deadline`
  row scrolls into view and flashes. The count stays at its previous value.
- Typing Vietnamese with Telex in the second input and pressing Enter adds
  exactly one item.
