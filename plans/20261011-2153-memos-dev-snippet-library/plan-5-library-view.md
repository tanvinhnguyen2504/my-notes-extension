# Phase 5 — The library view

## Goal

Fill in `MemosPage` as `memo.md` screen 1a: a filter-chip row, `PINNED` and
`RECENT` cards, memo rows whose Copy button actually writes to the clipboard,
and an empty state.

## Tasks

- [ ] New `src/components/memos/MemoFilterChips.tsx`: the `All / Git / SQL /
    Config / Shell / Note` row. Each chip is a `24px` pill with a `6px` type
      dot (reuse `MEMO_TYPE_DOT`); the active chip is `bg-ink text-surface`.
      Takes `{ active: EMemoType | null, onChange }` — `null` is `All`.
- [ ] New `src/components/memos/MemoGroup.tsx`: a surface card
      (`rounded-[9px] border border-line mx-[10px]`) with a group label above it
      (`text-[10px] font-mono tracking-[.12em] text-dim`). Renders nothing at
      all when it has no entries — the §2 "hide a group if empty" rule.
- [ ] `src/components/memos/MemoRow.tsx`: build out the real row — the type dot,
      `label` at `text-[13px] font-medium truncate`, the **first line** of
      `content` at `text-[11px] font-mono text-dim truncate`, and the Copy
      button on the right. Replace the hardcoded `'Vincent Nguyen'` clipboard
      write and the empty `<button>`; drop the `console.log`.
- [ ] `src/components/memos/MemoRow.tsx`: Copy writes `row.content`, then shows
      `✓ Copied` in teal for 1.2s via local `useState` + a cleaned-up
      `setTimeout`, and calls `onCopy()` so the page can dispatch
      `COUNT_MEMO_COPY`.
- [ ] New `src/components/memos/MemoEmptyState.tsx`: `"No snippets yet"` plus
      `"Press + to save your first command."` per §2.
- [ ] `src/components/MemoPage.tsx`: replace the placeholder markup with the
      real page — chip state in `useState`, the filtered list, the two groups,
      and `main` as the scroll container.
- [ ] New `src/components/memos/memo_view.ts` _(or add to `core/memo_utils.ts`)_:
      the pure selectors — `filterMemos(memos, type, query)` and
      `splitPinned(memos)` returning `{ pinned, recent }`, each sorted by
      `updatedAt` descending.
- [ ] `src/components/TaskHeader.tsx`: add the `+` ghost button (`28×28`) from §1,
      shown only in memos mode. It is inert this phase; phase 7 wires it.

## Implementation notes

**Every row needs `key={memo.id}`.** This is not a lint preference in this
codebase — `CLAUDE.md` records four separate traps that "dissolve only because
that key is stable". The library re-sorts on every copy (`COUNT_MEMO_COPY`
stamps `updatedAt`), so an index key would have React mutate existing nodes
instead of moving them, and a `✓ Copied` state would appear on the wrong row.

**Filtering and grouping are pure functions, not component logic.** Anything
expressible as a pure function of state belongs in the pure layer. Putting
`filterMemos` there also means phase 6's search can reuse it unchanged — the
`query` parameter exists now precisely so phase 6 adds no new selector.

**`navigator.clipboard.writeText` needs no new permission.** The popup is a
secure context and the click supplies transient activation, so `"storage"` and
`"alarms"` remain the only permissions — do not add `clipboardWrite`. Do handle
the promise rejection, though: it is a `Promise<void>` and an unhandled
rejection in a popup is invisible.

**Clear the `setTimeout` on unmount.** Switching to the Tasks tab unmounts the
row mid-countdown, and a timer calling `setState` on a gone component is a
warning in the console and a leak across tab switches. Return the clear from a
`useEffect` keyed on the copied flag rather than letting the timer dangle.

**Take only the first line for the preview.** `content.split('\n')[0]` — and
with `noUncheckedIndexedAccess` on, that is `string | undefined`, so default it
to `''` rather than asserting.

Do **not** put a click handler on the row body in this phase. `CLAUDE.md`'s
first trap is a catch-all body handler that every inner control then had to
`closest()`-guard its way out of; phase 8 adds row-opens-editor as an explicit
handler on the row's text area, with the Copy button outside it. Wiring it here,
before the editor exists, is how that bug gets reintroduced.

The scroll container is `main` with `flex-1 min-h-0 overflow-y-auto` — matching
`TasksPage`. `min-h-0` is what actually lets a flex child shrink below its
content; `flex-1` alone is not enough, and without it the chips and footer get
pushed out of the fixed `520px` body.

`memo.md` §2's "seed with 6 examples on first run" is **out of scope** — the
mockup file that defines those six examples is not in the repo. The empty state
covers the first run instead.

## Verify

- `npm run check` exits clean.
- With `memo.v1` empty, the Dev tab shows `No snippets yet` and the hint, with
  the chip row above it and neither group card rendered.
- Hand-write three memos into `chrome.storage.local` under `memo.v1` (one
  pinned, three types) from the service worker console, reopen the popup:
  `PINNED` shows one, `RECENT` shows two, each with the right dot colour, title
  and first-line preview.
- Clicking a chip narrows the list to that type; `All` restores it.
- Set every memo to one type and click a different chip: both group cards
  disappear entirely rather than rendering empty.
- Click Copy: the clipboard holds the full `content` (paste it somewhere
  multi-line to confirm, not just the preview line), the button turns teal
  `✓ Copied`, reverts after ~1.2s, and the memo's `uses` in storage went up by
  one.
- A long single-word title and a 40-line body both leave the row at its design
  height, truncated rather than wrapped.
- Copy a memo, then switch to Tasks before the 1.2s elapses: no React warning
  in the console.
