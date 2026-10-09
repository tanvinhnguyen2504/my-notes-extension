# Phase 1 — Give items a stable identity

## Goal

Add `id: string` to `Item`, backfilled for existing stored items by
`normalizeState()`, with no React and no change to how the UI behaves.

## Tasks

- [ ] Add `id: string` to the `Item` interface in `src/core/types.ts`, with a
      comment saying what it is for: a stable React key, not a new addressing
      scheme.
- [ ] Add `newId()` to `src/core/utils.ts`, wrapping `crypto.randomUUID()`.
- [ ] Guard the `crypto` access the same way `preferredTheme()` guards `window`.
      `utils.ts` is imported by the service worker, and while `crypto` is
      available there, `crypto.randomUUID` requires a secure context and the
      module must not throw at import time in any environment.
- [ ] Backfill in `normalizeState()`: `id: isNonEmptyString(item.id) ? item.id : newId()`.
      Existing stored items have no `id`, so the first load after this ships
      assigns one to every item.
- [ ] Set `id: newId()` in `parseDraft()`, so new items are born with one.
- [ ] Check every other place that constructs or copies an `Item`:
      `setAllDone()` spreads (`{ ...item, done, updatedAt }`) so the id carries;
      `moveItem()` moves references; `touchItem()` mutates in place. Confirm
      rather than assume — a spread that drops the id is silent.
- [ ] Confirm `src/features/export.ts`'s `COLUMNS` is unchanged. The id is
      internal and has no business in a CSV the user reads.
- [ ] `npm run check`.

## Implementation notes

- **The backfill must be idempotent and stable.** `normalizeState()` runs on
  every load, so an id must survive the round trip — assign only when absent.
  Regenerating ids on each load would be worse than having none: React would see
  a completely new list every time storage was read, and remount every row.
- Put the id **first** in the `Item` interface and in the `parseDraft` return. It
  reads as identity rather than as another field.
- `id` is not part of equality for the `chrome.storage.onChanged` comparison in
  `popup.ts`, which uses `JSON.stringify`. Adding a field changes those strings
  but not the comparison's correctness — both sides go through
  `normalizeState()`. Worth re-reading that block to be sure.
- Do not add an index-by-id lookup helper yet. Nothing needs it; index
  addressing stays. Adding it "for later" is speculative and phase 2 may want a
  different shape.
- One migration consideration worth being explicit about: there is no schema
  version in `STORAGE_KEY`'s payload, and this plan does not add one.
  `normalizeState()` detects the absence of a field instead. That is the existing
  pattern (`updatedAt`, `dueDate`, `settings` all arrived this way) and
  introducing versioning now is a separate decision.

## Verify

Scratchpad script, plain `node`, no dependencies, deleted once green:

- `normalizeState({ items: [{ text: "a" }, { text: "b" }] })` gives both items
  non-empty, distinct ids.
- **Stability**: feed a state through `normalizeState`, serialise it, feed it
  back, and assert every id is unchanged. This is the assertion that matters —
  if it fails, React remounts every row on every load.
- **Idempotence**: `normalizeState(normalizeState(x))` deep-equals
  `normalizeState(x)`.
- `parseDraft("buy milk")` returns an item with an id.
- `setAllDone()` preserves ids on both the changed and unchanged items.
- `moveItem()` preserves ids and their order matches the moved texts.
- An item stored *with* an id keeps exactly that id, not a fresh one.
- Ids survive with no `window` and no DOM present — the service-worker case.

Then: `npm run build`, load `.output/chrome-mv3/`, confirm the existing list
still renders and that reopening the popup does not duplicate or reset anything.
Inspect `chrome.storage.local` and confirm every item now carries an id.
