# Phase 3 — The `ui/` and `features/` layers

## Goal

Convert `src/ui/menu.js`, `src/ui/drag-drop.js`, and all four
`src/features/*.js` to TypeScript, turning their JSDoc contracts into real
signatures.

## Tasks

- [ ] Add `src/core/dom.ts` with the throwing `el<T>(id)` helper from `plan.md`,
      plus a sibling `query<T>(root: ParentNode, selector: string): T` for the
      `panel.querySelector("#set-theme")` pattern in `settings.js`, which has
      the same `| null` problem.
- [ ] `ui/menu.ts`: define and export `MenuEntry` — read `buildMenuItem()` for
      its real fields (label, checked state, action) rather than inventing them.
      Type the module-level `anchorEl: HTMLElement | null` and
      `menuEl: HTMLElement | null`.
- [ ] In `closeMenu()`, the existing `if (!anchorEl) return;` guard narrows
      `anchorEl` but **not** `menuEl`, which strict will flag. Keep one guard
      covering both rather than adding a `!` — they are set and cleared together,
      and a guard documents that invariant where an assertion hides it.
- [ ] `openMenu()`'s focus line —
      `(items.find(...) || items[0]).focus()` — is now possibly-undefined twice
      over (`find` plus `noUncheckedIndexedAccess`). Make the empty-entries case
      explicit instead of asserting; an empty menu is a caller bug and should say
      so.
- [ ] `ui/drag-drop.ts`: promote the JSDoc block into types.
      `export type DropSide = "before" | "after";`
      `export interface RowDrop { from: number; to: number; dayKey: DayKey | null }`
      `export interface GroupDrop { from: number; dayKey: DayKey | null }`
      `createDragController(opts: { listEl: HTMLElement; onRowDrop: (d: RowDrop) => void; onGroupDrop: (d: GroupDrop) => void })`.
      Then delete the JSDoc `@param` lines it duplicates, keeping the prose that
      explains the `to`-index coordinate system — that is the part no type can
      say.
- [ ] Handle `event.dataTransfer` being `DataTransfer | null` in `beginDrag`,
      `acceptHover`, and the drop handlers. A real early return, not `!`: jsdom
      has no `dataTransfer` at all, so this is a case the verification scripts
      actually hit.
- [ ] `features/priority.ts`: `attachPriorityTag(tagEl: HTMLElement, item: Item, onPick: (p: Priority) => void)`.
- [ ] `features/due-date.ts`: `attachDueChip(dueEl: HTMLElement, dueInputEl: HTMLInputElement, item: Item, onPick: (key: DayKey | null) => void)`.
      `dueInputEl` must be `HTMLInputElement`, not `HTMLElement` — `.value` is
      the whole point of it.
- [ ] `features/settings.ts`: type the `installSettings({ ... })` options object
      as a named exported interface; switch the five `querySelector` calls to
      `query()`; `reminderTimeEl` is `HTMLInputElement`.
      `renderSettings(state: State)`.
- [ ] `features/export.ts`: `toCsv(items: Item[]): string`,
      `csvFilename(reference?: DayKey): string`, `downloadCsv(items: Item[]): void`.
- [ ] Keep `priority.ts` and `due-date.ts` capturing their elements at import
      time. It is the documented one-boot-per-process trap and changing it is a
      behaviour change, not a migration step — add a comment pointing at the
      `CLAUDE.md` note instead.

## Implementation notes

- `menu.ts` knows nothing about todo items and must keep knowing nothing. Type
  it in terms of `MenuEntry` and `HTMLElement`; if a `Priority` or `Item` import
  appears in this file, the layering rule has been broken.
- Same for `drag-drop.ts`: it reports indices and a day key and never touches the
  list. `DayKey` is the only `core` type it should need, and only because the
  day key is part of the drop report.
- The CSS attribute contracts (`data-priority`, `data-done`, `data-key`) are
  written as string literals through `setAttribute`/`dataset` and are **not**
  made safer by this phase. Resist the urge to introduce a constants object for
  them here — it touches `popup.css`'s contract and belongs in a separate change
  if it is wanted at all.
- `features/*` may import from `core/` and `ui/`; never from `popup.ts` and
  never from each other. Check the final imports against the layering diagram in
  `CLAUDE.md`.

## Verify
- `npm run check` clean.
- `npm run build`, load output, and manually exercise every control this phase
  touched: the priority flag menu from both the `.flag` and `.tag` triggers,
  Escape and outside-click dismissal, the due chip opening the date input,
  CSV download (correct filename and all columns), all three settings switches,
  and the reminder time field reporting only on `change`.
- Drag verification in jsdom: dispatch the real `dragstart` → `dragover` → `drop`
  sequence with the documented `{ setData(){}, effectAllowed:"", dropEffect:"" }`
  stub, and separately **without** `dataTransfer` at all, confirming the new
  null handling returns early rather than throwing.
- Confirm `grep -rn "core/" src/ui/` returns only the `DayKey` type import.
