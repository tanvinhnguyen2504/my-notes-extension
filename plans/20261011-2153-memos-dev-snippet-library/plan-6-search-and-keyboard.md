# Phase 6 — Search footer and library keyboard navigation

## Goal

Replace the compose row with a search field while in memos mode, filter on title
and body combined with the active chip, and make the library navigable from the
keyboard per `memo.md` §2 and §6.

## Tasks

- [ ] New `src/components/memos/MemoSearch.tsx`: a `34px` field with the
      placeholder `Search snippets` and a `/` keycap on the right, styled to
      match the compose row's footprint so the popup's fixed height is unchanged.
- [ ] `src/components/MemoPage.tsx`: hold `query` in `useState` and pass it
      through the existing `filterMemos(memos, type, query)` — case-insensitive,
      matching `label` **or** `content`, combined with the chip.
- [ ] `src/components/MemoPage.tsx`: a `keydown` listener on `document` so `/`
      focuses the search field from anywhere in the library, and `Esc` clears
      it. Registered in a `useEffect` with a matching removal.
- [ ] `src/components/MemoPage.tsx`: arrow-key row focus — `↑` / `↓` move a
      visible focus ring between the *visible* rows, `Enter` copies the focused
      row.
- [ ] `src/components/memos/MemoEmptyState.tsx`: a second message for the
      "filtered to nothing" case, distinct from the first-run one — the user has
      snippets, just none matching.
- [ ] `src/components/memos/MemoRow.tsx`: accept `focused: boolean` and render
      the focus ring from it, so focus is page state rather than DOM state.

## Implementation notes

**`/` must not hijack typing.** The listener has to no-op when the event target
is already an `input` or `textarea` — otherwise typing a path like `src/core` in
the search field inserts nothing and refocuses the field instead. Check the
target's `tagName`, and check `event.isComposing` too: this codebase has a
suspected Telex IME interaction on `Enter` already, and a composing keystroke
should never be treated as a shortcut.

**Keep the focused row as an index into the *filtered* list, not an id, and
reset it to `null` whenever the chip or query changes.** Holding an id would
leave focus on a row that filtering just removed — `Enter` would then copy a
memo the user cannot see. An index into the visible list cannot outlive its
list, which is the safer failure.

**Arrow keys are the one place the index pattern is correct**, because here the
index *is* into the rendered list. Translate to an id before dispatching
`COUNT_MEMO_COPY`; the reducer takes ids and nothing else.

**`preventDefault()` on `↑` / `↓`** or the scroll container scrolls underneath
the moving focus ring, and the ring leaves the viewport. Then
`scrollIntoView({ block: 'nearest' })` on the focused row so a long list follows
the ring deliberately rather than by accident.

**The search footer replaces `Compose`, it does not stack with it.** `body` is a
fixed `380×520` with `overflow: hidden`; a second footer would push the scroll
container's bottom out of the clip region, and the fix is not obvious when it
happens. Each mode renders exactly one footer — which is why the footer lives
in the page, not in `PopupPage`.

`E` opens edit and `N` opens the editor, both from §6 — those land in phase 8
with the editor, not here. Wire `↑` / `↓` / `Enter` / `/` / `Esc` only.

`filterMemos` already takes `query` from phase 5, so this phase should add no new
selector. If it needs one, phase 5's signature was wrong.

## Verify

- `npm run check` exits clean.
- The Dev tab's footer is the search field; the Tasks tab's is still compose.
  Switching tabs swaps them and the popup height never changes.
- Typing matches on title and on body text that is **not** the first line —
  search looks at the whole `content`, not the preview.
- Search combines with the chip: with `Git` active, a query matching only a SQL
  memo returns nothing and shows the no-matches message.
- Press `/` with focus on the page body: the field focuses. Press `/` with the
  field already focused: a literal `/` is typed.
- `Esc` clears the query and restores the full list.
- `↓` `↓` `↑` moves the ring one row down from the top; `Enter` copies that row
  and increments its `uses`.
- Narrow the query so the focused row disappears, then press `Enter`: nothing is
  copied. No stale-focus copy.
- With 30 memos, hold `↓`: the list scrolls to follow the ring and the ring
  stays visible.
