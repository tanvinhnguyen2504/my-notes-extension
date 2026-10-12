# Phase 8 — Edit, delete, pin, and the dark-theme pass

## Goal

Close the loop: open the editor from an existing row, delete with an inline
confirm, toggle pin from the row, and make every surface added by phases 4–7
correct in `html[data-theme="dark"]` — plus the §6 keyboard and motion polish.

## Tasks

- [ ] `src/components/memos/MemoRow.tsx`: accept `onOpen` and call it from a
      click on the row's **text area** — the dot, title and preview — with the
      Copy button outside that region.
- [ ] `src/components/MemoPage.tsx`: carry the memo being edited in the `view`
      state (`{ kind: 'editor', id: string | null }`), so the editor knows
      whether it is creating or editing.
- [ ] `src/components/memos/MemoEditor.tsx`: accept an optional `memo` to
      prefill from, title the header `Edit note` when present, and dispatch
      `UPDATE_MEMO` instead of `ADD_MEMO`.
- [ ] `src/components/memos/MemoEditor.tsx`: add the `Delete` text button to the
      header, left of Save, `text-dim` with a red hover (new
      `--color-danger-bg` / `--color-danger-ink` tokens). Inline confirm — the
      label becomes `Confirm delete` for 3s, and a second click within that
      window dispatches `DELETE_MEMO` and returns to the library.
- [ ] `src/components/memos/MemoRow.tsx`: `onContextMenu` toggles pinned via
      `TOGGLE_MEMO_PIN`, with `preventDefault()` to suppress the browser menu.
- [ ] `src/components/MemoPage.tsx`: the §6 library shortcuts — `E` opens the
      focused row for edit, `N` opens a new editor.
- [ ] `src/components/memos/MemoEditor.tsx`: `Cmd/Ctrl+Enter` saves; `Esc` goes
      back, confirming first when the draft differs from its starting value.
- [ ] `src/styles.css`: the dark pass. Walk every new surface against the §5
      list — chips, group cards, copy button, editor inputs, option pills,
      secret warning, pin toggle, preview card — and confirm each resolves
      through a token that has a dark override.
- [ ] `src/styles.css`: give the code block a `1px border-line` in dark only, so
      `#0f1013` does not merge into `--color-surface` (§5).
- [ ] `src/styles.css`: a `@media (prefers-reduced-motion: reduce)` guard, and
      otherwise a `180ms ease-out` transition on the library↔editor swap and the
      `✓ Copied` / `✓ Saved` states.
- [ ] `wxt.config.ts`: add the §6 `commands` block —
      `_execute_action` with `suggested_key` `Alt+Shift+K`.
- [ ] `CLAUDE.md`: document the finished feature — the real `memo.v1` shape, the
      memos-address-by-id reducer asymmetry, `settings.mode`, the
      `--color-type-*` tokens, and `core/memo_utils.ts`. Remove the "Reserved --
      nothing reads a memo yet" claim from the layout table and the data-model
      section.
- [ ] `CHANGELOG.md`: an entry for the feature, in the file's existing format.

## Implementation notes

**The row click must not be a handler on the whole row.** `CLAUDE.md`'s very
first trap is a catch-all handler on `.body` that every inner control then had to
`closest()`-guard its way out of, and it ends with "**do not reintroduce a
handler on `.body`** — it would bring the whole class of bug back with it."
Put `onOpen` on an inner wrapper around the dot, title and preview; leave the
Copy button a sibling of that wrapper, not a descendant. Then no guard is needed
because the event never reaches the button's ancestor chain.

**Right-click to pin needs `preventDefault()`** or Chrome's context menu covers
the row it just toggled. Note that this is the one gesture in the feature with no
visible affordance — it is `memo.md` §4's design, kept as specified, but it is
worth a line in `CLAUDE.md` so it is discoverable from the code.

**`Esc`-to-discard needs something to compare against.** Keep the memo the
editor opened with in a `useRef` and compare the draft to it; comparing against
`newMemo()` would treat an untouched new-memo editor as dirty because the ids
differ. For a create, compare content-bearing fields only.

**The 3s delete confirm is view state and belongs nowhere near the reducer.**
Same category as `settingsOpen` and `editingId` — `CLAUDE.md` is explicit that
"whether the clear button is armed" is deliberately absent from the reducer. Mirror
the existing armed-button pattern, and clear its timer on unmount.

**For the hover-red on Delete, do not rely on utility order.** Tailwind sorts by
property, not source order, so two utilities setting `color` at equal
specificity are a coin toss. Use a variant that wins by specificity — the
codebase's own example is `data-[armed=false]:hover:` — or make the conditions
mutually exclusive.

**The dark pass is a token audit, not a restyle.** Because every colour resolves
through an `@theme` token and `html[data-theme="dark"]` redefines the same names,
a surface is either already correct or it is using a literal. So the pass is
mostly: grep the memo components for colour literals, find none, then check each
token used actually *has* a dark override — `--color-type-shell` and
`--color-code-bg` are the two that must change and the four `oklch` dots are the
ones that must not. §5 asks you to list every selector changed; that list should
be short, and a long one means something bypassed the tokens.

**Radix portals its content to `document.body`**, outside the React root. Not an
issue for the pin `Switch` (inline), but if any part of this phase reaches for
a Radix popover or dialog, remember `data-theme` lives on `documentElement`
precisely so a portalled node still themes correctly — and that no rule scoped
under the root element would reach it.

`Alt+Shift+K` is the only manifest change the whole feature needs. Clipboard
access required no permission; `"storage"` and `"alarms"` stay as they are.
The manifest is generated from `wxt.config.ts`, so after editing it **rebuild**
and check `.output/chrome-mv3/manifest.json` — editing a `manifest.json` is not
possible here because there isn't one in the tree.

## Verify

- `npm run check` exits clean.
- Clicking a row's title opens the editor titled `Edit note` with every field
  prefilled, including sub-type and pin.
- Clicking a row's Copy button copies and does **not** open the editor. Verify
  this specifically — it is the trap this phase is shaped around.
- Saving an edit updates the memo in place: the list shows one memo, not two,
  and the id in storage is unchanged.
- `Delete` → label becomes `Confirm delete`; wait 4s and it reverts without
  deleting; click again within 3s and the memo is gone from storage.
- Right-click a row: it moves between `PINNED` and `RECENT`, and no browser
  context menu appears.
- `N` opens a new editor; `E` on a focused row opens that row.
- `Cmd+Enter` in the editor saves. `Esc` with an untouched draft returns
  immediately; `Esc` after typing asks first.
- Toggle to dark and walk all of §5's list: chips, cards, copy button, editor
  inputs, option pills, secret warning, toggle, preview. No element is
  invisible, and the code block is distinguishable from the surface behind it.
- `grep -rnE "#[0-9a-fA-F]{3,6}|oklch\(|rgba\(" src/components/` returns
  nothing.
- Rebuild, then confirm `.output/chrome-mv3/manifest.json` has the `commands`
  block and still lists only `storage` and `alarms`.
- Enable "Reduce motion" at the OS level: the view swap is instant, with no
  animation.
- Reload the extension and exercise the whole feature once end to end: create,
  copy, search, edit, pin, delete, switch tabs, close and reopen. There is no
  test suite — this walk-through **is** the gate.
