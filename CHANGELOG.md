# 2026-10-09

- [#PR5](https://github.com/tanvinhnguyen2504/my-notes-extension/pull/5)
  - refactor(ui): replace the imperative DOM layer with React 19. `popup.ts` (411 lines), `reminder.ts`, `core/dom.ts`, `ui/menu.ts`, `ui/drag-drop.ts` and the `priority`/`due-date`/`settings` feature modules are all gone
  - feat(core): `Item.id`, backfilled by `normalizeState` only when absent. It exists to be a stable React key — index-as-key on a list that reorders makes React mutate the wrong node
  - feat(core): `src/core/reducer.ts` — every state transition as a pure function, composed from the existing `utils.ts` transforms. Persisting stays explicit so an incoming `chrome.storage.onChanged` update is never written back
  - feat(ui): Radix `DropdownMenu` replaces 129 lines of hand-rolled popover — positioning, flip-above, focus, Escape, outside-click, arrow keys — and `Switch` + `Collapsible` replace the settings panel's hand-wired ARIA
  - feat(ui): Tailwind v4, with the 28 design tokens moved into `@theme`. Preflight is deliberately not imported: a global reset would have changed the look on the way in
  - fix(ui): typing in the inline editor no longer discards the edit. A brace-normalising pass had turned `else if (Escape)` into an empty `if` plus an unconditional revert, so every key except Enter closed the editor

# 2026-10-08

- **Breaking for anyone loading unpacked from a clone:** the extension now has a build step. Run `npm install && npm run build` and load `.output/chrome-mv3/` in `chrome://extensions`, not the repository root. `manifest.json` is generated from `wxt.config.ts` and no longer exists in the tree.
- refactor(codebase): migrate the whole extension from plain JavaScript to TypeScript under full `strict`, with `noUncheckedIndexedAccess` and `erasableSyntaxOnly`
- build: compile with WXT 0.21 (Vite). Entry points move to `entrypoints/`; HTML entrypoints are emitted flattened to the output root, so the reminder window's `url: "reminder.html"` is unchanged
- feat(core): add `src/core/types.ts` (`Item`, `State`, `Settings`, `Priority`, `DayKey`) and `src/core/dom.ts` (`el()` / `query()`, which throw and name the missing element)
- fix(core): `normalizeState()` now clamps a stored `priority` to the three real levels. A value outside them previously survived and then matched no CSS rule and no menu entry
- fix(reminder): guard `state` before reading `state.theme` in `render()`. The old order would have thrown had `render()` ever run before `loadState()` resolved
- docs: rewrite the install, update and layout sections of `README.md`, and the build, architecture, trap and testing sections of `CLAUDE.md`

# 2026-09-29

- feat(reminder): show every outstanding task ordered by priority, not just high-priority ones — the window still only opens for high-priority tasks
- refactore(codebase): move to layers `core`, `features`, `ui` to split the distinct logic

# 2026-09-13

- [#PR2](https://github.com/tanvinhnguyen2504/my-notes-extension/pull/2)
  - feat(row): reorder the list by priority when one changes
  - feat(reminder): open a daily reminder for high-priority tasks
  - feat(settings): add a wide mode that shows the full task text
  - feat(settings): add a settings panel and persist its state
  - feat(list): sort the day groups with today first
