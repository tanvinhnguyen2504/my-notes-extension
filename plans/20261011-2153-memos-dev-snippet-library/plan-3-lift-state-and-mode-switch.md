# Phase 3 — Lift page state to `PopupPage` and persist the mode

## Goal

Move the reducer, `loadState()`, the `chrome.storage.onChanged` listener and the
`<html>` attribute effect out of `TasksPage` and into `PopupPage`, then turn the
bare Radix tabs into the designed `Tasks | >_ Dev` segmented control with the
last used mode restored on open.

## Tasks

- [ ] `src/components/PopupPage.tsx`: take over from `TasksPage` —
      `useReducer`, the `stateRef` + wrapped `dispatch`, the `loadState()`
      effect, the `onChanged` listener and the `data-theme` / `data-width`
      effect. Delete the empty `useEffect(() => {}, [])`.
- [ ] Extend the `onChanged` listener to watch `MEMOS_KEY` alongside
      `TASKS_KEY` and `SETTINGS_KEY`, normalizing through `normalizeMemos`.
- [ ] `src/components/TasksPage.tsx`: change the signature to
      `({ state, dispatch })` and delete the four lifted concerns. Keep
      `editingId`, `settingsOpen` and the `useDragDrop` wiring — those are
      genuinely tab-local view state.
- [ ] `src/components/TasksPage.tsx`: delete the now-unused imports the lift
      orphans (`useReducer`, `useRef`, `reducer`, `loadState`, `emptyState`,
      `persistChanged`, the two normalizers, the two storage keys). Leave the
      commented-out `<Progress>` line alone — it predates this work.
- [ ] `src/core/types.ts`: add `export type PopupMode = 'tasks' | 'memos'` and
      `mode: PopupMode` to `Settings`.
- [ ] `src/storages/settings.ts`: clamp `mode` in `normalizeSettings`,
      defaulting to `'tasks'`.
- [ ] `src/core/utils.ts`: add `mode: 'tasks'` to `DEFAULT_SETTINGS`.
- [ ] `src/core/reducer.ts`: add `SET_MODE { mode: PopupMode }`, returning the
      same state when the mode already matches.
- [ ] `src/components/Tab.tsx`: repurpose it as the real segmented control.
      It takes `{ mode, onModeChange }` and renders the `Tabs.List` with its two
      triggers, styled per `memo.md` §1 — track `bg-chip` with `p-[3px]` and
      `rounded-[9px]`; active trigger `bg-surface text-ink shadow-[…]`
      `rounded-[7px] h-[26px]` at `text-[12px] font-medium`. The `Dev` trigger
      carries the `>_` glyph.
- [ ] `src/components/PopupPage.tsx`: render `Tabs.Root` as **controlled** —
      `value={state.settings.mode}` and `onValueChange` dispatching `SET_MODE`.
      Tab values are `'tasks'` and `'memos'`, not `tab1` / `tab2`.
- [ ] `src/components/PopupPage.tsx`: give `Tabs.Content` the flex-column
      layout the pages expect, so `main`'s `flex-1 min-h-0` still finds a
      constrained parent.
- [ ] `src/components/MemoPage.tsx`: accept `{ state, dispatch }` and keep
      returning its placeholder. Phase 5 fills it in.

## Implementation notes

**This is the phase that fixes a live bug.** Radix `Tabs` unmounts the inactive
panel, so with the theme effect inside `TasksPage`, opening the popup on the Dev
tab never writes `data-theme` to `<html>` — the popup renders in whatever the
default palette is, with no error. And because `TasksPage` remounts on every tab
switch, each switch re-runs `loadState()` and fires a wholesale
`REPLACE_STATE`, which is the "items added in the milliseconds before storage
resolves are silently discarded" trap in `CLAUDE.md`, now reachable by clicking
a tab. Lifting the state is the fix; `forceMount` would only have papered over
the second half.

**Keep the wrapped `dispatch` exactly as it is.** The pattern in `TasksPage`
today — run the reducer against `stateRef.current`, bail on an identical
reference, then `rawDispatch` and `persistChanged` — is doing three things that
are each load-bearing: it returns a boolean so `Compose` can tell whether the
add took, it skips the save on a no-op, and it skips saving on
`REPLACE_STATE`. Move it verbatim. In particular **do not** replace it with a
`useEffect` that saves on state change: that would write back the state that
just arrived *from* storage, and with `background.ts` re-syncing the alarm on
every write, that is a feedback loop. `CLAUDE.md` flags this as the case where
"the natural React translation is the wrong one".

**`mode` on the settings slice means a tab switch writes storage.**
`background.ts` re-syncs the reminder alarm on every write to `chrome.storage`.
That is safe here only because `syncAlarm()` compares the existing alarm against
the computed time and leaves a match alone — a version that recreated the alarm
unconditionally would push the reminder further away every time you clicked a
tab. No change needed in `background.ts`; this is just the reason not to
"simplify" `syncAlarm` later.

**The `onChanged` listener must now include `MEMOS_KEY`.** Without it the
listener's early return fires on a memo-only change and the popup keeps a stale
memo list — and the next locally-originated save writes it back, so an edit made
in another popup instance vanishes. Same class of bug the reminder window's tick
had.

`Tab.tsx` today is an unused near-duplicate of `PopupPage`'s tab markup. Giving
it the segmented-control job is what stops it being dead code without deleting
a file you wrote — and it is the right home for it, since the control is
presentational and `PopupPage` is about state.

Radix renders `Tabs.Trigger` as a `<button>`, and `styles.css` has no Preflight
— the bare `button` rule there zeroes padding and background, so the control's
geometry has to come entirely from utilities. Expect to set height, padding and
radius explicitly rather than relying on anything inherited.

Style the active trigger off Radix's `data-state="active"` attribute via
`data-[state=active]:` variants. Do **not** write two competing utilities and
rely on `className` order to resolve them — Tailwind sorts by property, not
source order, so that is a coin toss.

## Verify

- `npm run check` exits clean.
- Reload `.output/chrome-mv3/`. The header shows `Tasks` and `>_ Dev` as a
  segmented control; the active segment has the surface background and shadow.
- Switch to Dev, close the popup, reopen it: it opens on Dev.
- With the saved theme set to dark, open the popup directly onto the Dev tab —
  the background is dark. Before this phase it would not have been.
- Switch tabs ten times, then confirm the task list is intact and no task
  added just before a switch has disappeared.
- With the popup open on Tasks, tick an item in the reminder window: the popup
  updates. The listener survived the move.
- `chrome://extensions` → service worker console: switching tabs does not
  produce a growing stack of alarm re-creations, and the reminder time stays
  where it was.
