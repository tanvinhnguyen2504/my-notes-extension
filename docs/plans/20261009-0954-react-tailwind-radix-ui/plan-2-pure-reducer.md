# Phase 2 — Extract a pure reducer, keep the imperative UI

## Goal

Move every state mutation into `src/core/reducer.ts` and have the existing
imperative `popup.ts` dispatch through it, so the state logic is centralised and
verified before any React exists.

## Tasks

- [ ] Create `src/core/reducer.ts` with an `Action` union and
      `reducer(state: State, action: Action): State`. DOM-free, no imports
      outside `core`.
- [ ] Actions, one per current handler:
      `ADD_ITEM` (text) · `DELETE_ITEM` (index) · `TOGGLE_DONE` (index) ·
      `RENAME_ITEM` (index, text) · `SET_PRIORITY` (index, priority) ·
      `SET_DAY` (index, dayKey) · `REASSIGN_DAY` (index, dayKey) ·
      `MOVE_ITEM` (from, to) · `MARK_ALL` · `CLEAR_ALL` · `SET_THEME` ·
      `SET_WIDTH` · `SET_REMINDER_ENABLED` · `SET_REMINDER_TIME` (time) ·
      `REPLACE_STATE` (state).
- [ ] Each case composes the existing `utils.ts` transforms. No new logic:
      `ADD_ITEM` → `parseDraft`; `SET_PRIORITY` → `touchItem` then
      `sortByPriority`; `MARK_ALL` → `setAllDone(items, !isAllDone(items))`;
      `MOVE_ITEM` → `moveItem`; `SET_THEME` → `nextTheme`; `SET_WIDTH` →
      `nextWidth`.
- [ ] Preserve the exact ordering in `SET_PRIORITY`: mutate, stamp, sort. The
      comment in `popup.ts` explains why — the resort invalidates the indices
      handlers closed over, which the re-render re-derives.
- [ ] Make the reducer **return the same state object** for no-op actions, so a
      future React render can bail out: `MOVE_ITEM` with `to === from + 1`
      already returns the input array from `moveItem`, and `REASSIGN_DAY` onto
      the day an item already has should return `state` unchanged.
- [ ] Preserve `ADD_ITEM`'s null handling: `parseDraft` returns `null` for empty
      or whitespace-only input, and the action must become a no-op rather than
      pushing nothing.
- [ ] Preserve `SET_REMINDER_TIME`'s guard: the control reports `""` when
      cleared, and `isTimeOfDay` rejects it. Keep the last good time.
- [ ] Rewrite `popup.ts`'s handlers to `dispatch({ type, ... })` against a local
      `dispatch` that applies the reducer, saves, and calls the existing
      `render()`. The imperative renderer stays exactly as it is.
- [ ] Keep saving explicit in that `dispatch`, and make it skip for
      `REPLACE_STATE` — the write-loop trap from `plan.md`. Getting this right
      now means phase 4 inherits it rather than rediscovering it.
- [ ] Leave `clearArmed`, `clearTimer` and the editing state as module locals in
      `popup.ts`. They are view state and must not enter the reducer.
- [ ] `npm run check`.

## Implementation notes

- The reducer is the one new file that must stay runnable under plain `node`:
  it is in `core`, and once `.tsx` files exist, `core` is the only layer Node's
  native type-stripping still handles. No JSX, no DOM, no `chrome`.
- `Action` is a discriminated union on `type`. With `strict` on, an exhaustive
  `switch` returning `State` from every branch means a new action that forgets a
  case is a compile error — which is most of the value of doing this at all.
- Do **not** fold `saveState` into the reducer. A reducer that writes to storage
  is not pure and stops being verifiable by a plain script, which is the whole
  reason it lives in `core`.
- `REPLACE_STATE` exists for two callers: `loadState().then` and the
  `chrome.storage.onChanged` listener. Both already replace `state` wholesale,
  so this is a faithful translation rather than a new mechanism — including the
  documented race, which is preserved as-is.
- Watch `DELETE_ITEM`. The current code is `state.items.splice(index, 1)` —
  a mutation. The reducer must return a new array instead, or React will not
  see the change in phase 4. This is the one place the translation is not
  mechanical.
- Same for `ADD_ITEM`: `state.items.push(item)` becomes
  `[...state.items, item]`. And `TOGGLE_DONE`/`RENAME_ITEM` currently mutate the
  item in place via `touchItem(item)`; they need to produce a new item object
  and a new array. **This is the subtlest part of the phase** — the imperative
  renderer cannot tell the difference, so a missed copy will not show up until
  phase 4, as a row that silently refuses to update.

## Verify

Scratchpad script, plain `node`, no dependencies, deleted once green. Drive the
reducer directly:

- Each of the 15 actions produces the expected state from a known starting
  state.
- **Immutability, the assertion this phase exists for**: for every mutating
  action, assert the input `state`, `state.items`, and the specific item object
  are all `!==` their outputs, and that the original is unmodified. A reducer
  that mutates passes every behavioural test here and fails silently in phase 4.
- No-ops return the *same* state reference: `MOVE_ITEM` with `to === from + 1`,
  `REASSIGN_DAY` onto the current day, `ADD_ITEM` with `"   "`,
  `SET_REMINDER_TIME` with `""`.
- `SET_PRIORITY` leaves the list sorted HIGH → MEDIUM → LOW and stamps
  `updatedAt` on the changed item only.
- `MARK_ALL` flips both ways, and items already in the target state keep their
  `updatedAt`.
- `CLEAR_ALL` empties `items` and leaves `theme` and `settings` untouched.
- Ids survive every action (carried over from phase 1).
- Runs with no `window`, no `document`, no `chrome`.

Then the regression pass: `npm run build`, load it, and work through the full
behaviour list in `plan.md`'s success criteria. The UI is unchanged, so anything
that differs is a reducer translation error.
