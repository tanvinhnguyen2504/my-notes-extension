# Phase 4 — The three entry points, and `allowJs` off

## Goal

Convert `src/popup.js` (381 lines), `src/reminder.js`, and
`entrypoints/background.js` to TypeScript, then remove `allowJs` so the compiler
guarantees no JavaScript is left.

## Tasks

- [ ] `src/popup.js` → `src/popup.ts`. Replace every module-level
      `document.getElementById(...)` with `el<HTMLInputElement>("draft")`-style
      calls from `core/dom.ts`, with the concrete element type at each site —
      `#draft` and `#set-reminder-time` are inputs, the `btn-*` handles are
      `HTMLButtonElement`, `#list` and `#progress` are `HTMLElement`.
- [ ] Type the two `<template>` handles as `HTMLTemplateElement` and the clone
      sites accordingly: `tpl.content.firstElementChild!.cloneNode(true)` is the
      shape to avoid — read `.content.firstElementChild` once through a checked
      helper and type the result `HTMLElement`, since every `.querySelector`
      inside `render()` depends on it.
- [ ] Type `render()`'s internals: the per-row `querySelector(".text" | ".box" |
      ".del" | ".due" | ".tag" | ".flag" | ".due-input")` results all come back
      `| null` and all are needed. Use `query()` from `core/dom.ts`.
- [ ] Type `let state: State` and the `loadState().then(...)` wholesale
      replacement. Keep the documented race as it is, with its comment.
- [ ] Type the `chrome.storage.onChanged` listener. The changed-value payload is
      `unknown` as far as correctness goes — route it through `normalizeState()`
      rather than trusting the shape, which is what the existing code already
      relies on indirectly.
- [ ] Wire the drag controller against phase 3's `RowDrop` / `GroupDrop` types;
      confirm `onRowDrop`'s `to` is still passed straight to
      `moveItem(items, from, to)` with no off-by-one introduced by the rewrite.
- [ ] `src/reminder.js` → `src/reminder.ts`. It still must not import
      `popup.ts`; its few duplicated row-drawing lines stay duplicated. Use
      `el()`/`query()` for `#reminder-count`, `#reminder-list`, `#btn-dismiss`.
- [ ] `entrypoints/background.js` → `entrypoints/background.ts`.
      `syncAlarm(): Promise<void>`, `openReminderWindow(): Promise<void>`.
- [ ] In `openReminderWindow()`, the `position` object is currently built as `{}`
      and mutated — type it `{ left?: number; top?: number }`. The destructured
      `left, top, width, height` from `chrome.windows.getLastFocused()` are all
      `number | undefined` in the chrome types, so the arithmetic needs guarding;
      a single "all four present" check preserves the existing
      centre-or-let-the-browser-place-it behaviour exactly.
- [ ] Keep the `existing && Math.abs(existing.scheduledTime - when) < 60_000`
      comparison byte-for-byte in intent. This is the guard that stops each day's
      reminder drifting later; a strict-mode rewrite of the null check must not
      change when the alarm is recreated.
- [ ] Update the HTML `<script src>` in both entrypoints to the `.ts` paths.
- [ ] Remove `allowJs` and `checkJs` from `tsconfig.json`.
- [ ] `grep -rn --include=*.js . --exclude-dir=node_modules --exclude-dir=.output --exclude-dir=.wxt`
      returns nothing.

## Implementation notes

- `popup.ts` is the biggest single file in the migration and the one with no
  automated safety net — `render()` rebuilds every row from a template and
  reattaches every handler, and a mistyped `querySelector` class string compiles
  fine and produces a row with a dead control. Convert it in one pass and then
  click every control, rather than trusting a clean `tsc`.
- `render()` rebuilding everything is also why there is no partial-render
  optimisation to be tempted into here. Any handler that mutates state calls
  `saveAndRender()`; keep that invariant.
- Do not re-render during a drag. Nothing in this phase should add a
  `saveAndRender()` to a drag handler — the list changes on `drop` only.
- The `.body` catch-all click handler and its three `closest()` guards
  (`.del`, `.text`, `.due`) transfer across unchanged. They are a documented
  trap, not a bug to fix in this phase; typing does not make them safer and
  inverting the check is a separate change.
- Single-click-to-toggle and double-click-to-edit still must not share a target.
  If the conversion makes it tempting to simplify that split, don't — the
  failure mode is an invisible edit on an orphaned row, with no error.
- `background.ts`'s listeners stay inside `defineBackground`'s `main()`, and
  `main()` stays synchronous, for the reasons in `plan.md`.
- The background verify script works by importing the entrypoint's default
  export and calling `.main()` by hand after installing the `chrome` stub. That
  only works because `imports: false` makes `defineBackground` a real import —
  spike-verified. If someone later re-enables auto-imports, this script breaks
  with a confusing `defineBackground is not defined` at import time.

## Verify

- `npm run check` clean with `allowJs` gone.
- `npm run build` succeeds and `.output/chrome-mv3/` loads with a clean
  service-worker console.
- Complete manual pass against the phase-1 baseline — every item in `plan.md`'s
  success-criteria behaviour list. This is the phase where a regression is most
  likely and least visible.
- Specifically re-check the two cross-page paths: tick an item in the reminder
  window with the popup open and confirm the popup updates and does not write
  the stale list back; and confirm that using a reminder does not move the next
  day's alarm.
- jsdom boot of the popup (one boot per process, per the module-caching trap):
  add an item, toggle it, delete it, and assert the rendered row count and the
  `#count` text after each.
- jsdom/stub boot of `background.ts` with the hand-rolled `chrome` stub
  (`storage.local`, `alarms`, `windows`, `runtime`) and no `window` or
  `document`: assert `syncAlarm()` clears when disabled, creates once when
  enabled, and does **not** recreate when an alarm already sits within a minute
  of the computed time.
