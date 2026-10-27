# Phase 3 — Listen, Copy, expand, delete and Undo

## Goal

Make every row actionable: speak it, copy it, open it for the example, delete it
with a way back.

## Tasks

- [ ] `src/components/icons/SpeakerIcon.tsx` and `CheckIcon.tsx`, matching
      `icons/CopyIcon.tsx`'s shape (inline SVG, `currentColor`, no colour
      literal). Reuse `CopyIcon` as-is.
- [ ] `EnglishMemoRow.tsx`: two 40×40 `<button type="button">` controls with
      `aria-label={\`Listen to ${…}\`}`and`aria-label="Copy to clipboard"`.
- [ ] Listen: `speechSynthesis.cancel()` first, then
      `speechSynthesis.speak(new SpeechSynthesisUtterance(stripBrackets(en)))`
      with `utterance.lang = 'en-US'`.
- [ ] Copy: `navigator.clipboard.writeText(stripBrackets(en))`, then flip that
      row's icon to the check on a teal background for 1.2 s.
- [ ] Expand: the text area is a `<button aria-expanded={…}
    aria-controls={…}>`; clicking toggles `expandedId` in `EnglishPage`, so
      only one row is ever open. The expanded region holds the `example` in
      italics and a `Delete` text button.
- [ ] `src/components/english/UndoToast.tsx`: a fixed, bottom-anchored toast
      with the item's text and an `Undo` button, auto-dismissing after 5 s.
- [ ] `EnglishPage.tsx`: `pendingUndo` state holding the deleted item; `Delete`
      dispatches `DELETE_ENGLISH_ITEM` and sets it, `Undo` dispatches
      `RESTORE_ENGLISH_ITEM` and clears it.

## Implementation notes

**`speechSynthesis.cancel()` before every `speak()`, unconditionally.** The spec
asks for it on an already-playing utterance; calling it when nothing is playing
is a no-op, so there is no state to track and no "is it speaking" flag to get
out of sync.

**The utterance's `lang` is `'en-US'` even though line 2 is Vietnamese.** Only
the English string is ever spoken. Setting `lang` is what picks the voice; the
default follows the page's `lang`, which would read English with a Vietnamese
voice.

**Copy's check state is a single `copiedId`, cleared by one `setTimeout` in an
effect keyed on it** — exactly the `COPIED_MS` pattern `MemosPage.tsx` already
uses. Two rows copied in quick succession must not leave the first one stuck on
a check, which falls out of storing an id rather than a boolean per row.

**The timeout must be cleared on unmount.** Both timers here (copy's 1.2 s and
the toast's 5 s) live in effects with cleanup returns. Radix unmounts this panel
on a tab switch, and a `setState` from a stray timer after that is a warning in
the console and a lost undo.

**Undo restores by dispatching the whole item, not by un-deleting.** The reducer
is pure and keeps no trash; `RESTORE_ENGLISH_ITEM` takes the `EnglishItem` the
component is holding and re-inserts it. Position is not stored because the list
sorts by `createdAt`, so the restored item lands where it was.

**A second delete while a toast is up discards the first undo.** One pending
item, not a queue — the spec describes one toast. Replace `pendingUndo` and
reset the timer.

**Do not put the click handler on the row container.** Three controls sit in the
row and the codebase has already paid for this: a container handler means every
inner button needs a `closest()` guard bolted on afterwards.

**The expand toggle and the icon buttons are siblings.** The text button must not
wrap them — nested buttons are invalid HTML and Chrome resolves the click to the
outer one, so Copy would also expand the row.

## Verify

- Copy on the `end of day` sentence puts `I'll have it done by end of day.` on
  the clipboard — paste it somewhere and confirm there are no brackets.
- The icon turns into a check on teal and reverts after ~1.2 s. Copying a second
  row immediately leaves only the second showing a check.
- Listen speaks the bracket-free text in an English voice. Clicking Listen on two
  rows in quick succession speaks only the second.
- Clicking a row's text opens the example in italics and a `Delete` button;
  clicking a different row closes the first.
- `Delete` removes the row and shows the toast; `Undo` within 5 s puts it back in
  the same position. Waiting 5 s dismisses the toast and the item stays gone
  after a popup reopen.
- Tab order reaches the text button and both icon buttons, each with an audible
  label in a screen reader, and every target measures at least 40×40.
