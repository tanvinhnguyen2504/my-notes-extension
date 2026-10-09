# Phase 4 — The popup in React

## Goal

Replace `src/popup.ts` with a React tree covering the shell, the day groups, the
rows and every interaction except the priority menu and the drag gesture.

## Tasks

- [ ] `entrypoints/popup.html`: keep `<div id="root"></div>` and the stylesheet
      link; **delete the `row-tpl` and `group-tpl` `<template>` elements and the
      `#priority-menu` container**. React builds the rows now; the menu container
      goes in phase 5. Keep the `<script>` pointing at `../src/popup.tsx`.
- [ ] `src/popup.tsx`: the root, mounting `<PopupPage />`.
- [ ] `src/components/PopupPage.tsx`: owns `useReducer(reducer, ...)`, the
      initial `loadState()` effect, the `chrome.storage.onChanged` subscription,
      and the save-on-local-dispatch wrapper from phase 2.
- [ ] `src/components/Header.tsx`: count, mark-all/unmark-all, the two-step
      clear, CSV export, settings trigger. `clearArmed` is `useState` here, with
      its 3000 ms timer in an effect that cleans up on unmount.
- [ ] `src/components/Progress.tsx`: the track and fill, width from
      `progressPercent`.
- [ ] `src/components/Compose.tsx`: the draft input and Enter/Add button.
- [ ] `src/components/DayGroup.tsx`: header label, date, `done/total` count, and
      `data-key` / `data-overdue`.
- [ ] `src/components/PopupRow.tsx`: wraps the phase-3 `NoteRow` with the box toggle,
      the delete button, double-click-to-edit, and the due chip.
- [ ] `src/components/EditableText.tsx`: the inline editor. Commits on Enter and
      on blur, reverts on Escape, treats an emptied field as cancel.
- [ ] `src/components/DueChip.tsx`: the chip plus the off-screen
      `<input type="date">`, with `showPicker()` and the `focus()` fallback.
      `data-unset` stays.
- [ ] `src/components/EmptyState.tsx`.
- [ ] Apply `data-theme` and `data-width` to `document.documentElement` in an
      effect in `PopupPage` — they are on `<html>`, outside the React root.
- [ ] Render groups from `groupByDay(state.items)` and rows from each group's
      `entries`, with **`key={item.id}`**. No `key={index}` anywhere.
- [ ] Keep passing `index` to handlers: the reducer's actions are
      index-addressed, and `groupByDay` already hands back the index.
- [ ] Delete `src/popup.ts`, `src/core/dom.ts`, `src/features/priority.ts`,
      `src/features/due-date.ts`, `src/features/settings.ts`. The settings panel
      becomes a component here or in phase 5 — pick one and do not leave a
      half-ported module.
- [ ] Keep `src/features/export.ts` as-is. It is not a component, and
      `downloadCsv` is called from a handler.
- [ ] `npm run check`.

## Implementation notes

- **`key={item.id}` is the single most important line in this phase.** Four of
  the documented traps dissolve only because of it. With `key={index}`, a drag
  reorder makes React mutate existing nodes instead of moving them, and the
  symptoms look like application bugs: an editor open on the wrong row, a
  `dblclick` landing on a row whose text just changed.
- The `.body` catch-all click handler does **not** get ported. Wire the box, the
  text, the delete button and the chip individually. The `BODY_CONTROLS`
  selector and all three `closest()` guards are deleted. Note in the commit that
  `CLAUDE.md`'s trap entry is now historical.
- `consumeEditorDismissal` and `editorDismissedBy` also go. They existed because
  the press that dismissed an editor produced a click on `.body` that toggled the
  row. With no catch-all handler there is no click to swallow. **Verify this by
  hand** — press outside an open editor and confirm the row does not toggle. If
  it does, the catch-all has been reintroduced somewhere.
- Clicking the text still must **not** toggle. React makes it safe to allow, but
  allowing it is a behaviour change and is out of scope.
- The inline editor must `focus()` and `select()` on mount, so it needs a ref
  plus an effect, not an autofocus attribute.
- `EditableText`'s commit-on-blur and commit-on-Enter can both fire for one
  interaction. The current code guards with a `settled` flag; keep an equivalent
  (a ref, not state — it must not trigger a render).
- The draft input keeps `if (event.key === "Enter")` with no `isComposing`
  check. The suspected IME duplicate is a documented, unconfirmed loose end, and
  silently fixing it here would make this migration the place a behaviour change
  hides.
- `data-priority`, `data-done`, `data-overdue`, `data-unset`, `data-armed`,
  `data-key`, `data-width` are all still contracts with `popup.css` until phase 7. Render them as attributes, with the same string values (`String(item.done)`,
  not a boolean — React omits `data-x={false}` entirely, which would break the
  `[data-done="false"]` match).
- Follow `.claude/rules/typescript.md` throughout: explicit `return` in every
  component and callback, block bodies, no single-line arrow components. A
  component written as `const NoteRow = (props) => <div/>` violates two rules at
  once.

## Verify

Manual, in Chrome, against the phase-1 baseline. `npm run dev` for iteration,
then `npm run build` and load the real artefact.

- Add plain, `!urgent`, `@tomorrow`, `!x @12/09`; whitespace and a bare `!` add
  nothing; the field clears on success.
- Box toggles done both ways; the count and progress bar follow; **clicking the
  text does not toggle**.
- Double-click the text: the editor opens on the correct, live row. Enter
  commits, Escape reverts, emptying cancels, clicking away commits once and the
  row does not toggle.
- Delete removes the right row — test with items in more than one group, which
  is where index/id confusion would surface.
- Priority tag still opens the old menu (phase 5 replaces it); the list resorts
  HIGH → MEDIUM → LOW after a change.
- Due chip opens the native picker; picking a day moves the row to that group;
  clearing the date moves it to `UNSCHEDULED`.
- Mark-all flips label and direction; two-step clear arms, shows `SURE?`, and
  disarms itself after 3 seconds without clearing.
- CSV export downloads with the right filename and columns.
- Settings: all three switches, the reminder time, Escape to close.
- Close and reopen the popup: everything persisted, nothing duplicated.
- Tick an item in the reminder window with the popup open: the popup updates and
  does not write the stale list back.
- React DevTools: confirm no row remounts on an unrelated state change, and that
  reordering **moves** rows rather than recreating them.
