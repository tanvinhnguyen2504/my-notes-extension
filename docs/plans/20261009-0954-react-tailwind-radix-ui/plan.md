# Plan: React + Tailwind + Radix UI

## Goal

Replace the imperative DOM layer — `render()` wiping `listEl` and rebuilding
every row from `<template>` elements — with React 19 components, Tailwind CSS v4
utilities, and Radix UI primitives. The concrete payoff is not "modern stack":
it is that `src/ui/menu.ts` (129 lines of popover positioning, focus management,
Escape handling, outside-click and arrow keys) gets deleted outright in favour
of a Radix primitive that does all of it better, and that four of the eight
traps documented in `CLAUDE.md` stop being possible rather than being carefully
avoided.

The reason this is affordable at all is the existing layering. `src/core/` is
DOM-free by rule, which means `utils.ts` (480 lines of parsing, dates, grouping
and the `normalizeState` storage gate), `src/core/types.ts`, and
`entrypoints/background.ts` are **not touched by this migration**. Only the view
layer is in play: `popup.ts`, `reminder.ts`, `src/ui/`, `src/features/`.

## Scope

**In scope**

- React 19 + `@wxt-dev/module-react`, with both HTML entrypoints becoming React
  roots.
- Tailwind CSS v4 via `@tailwindcss/vite`, CSS-first (`@theme`, no
  `tailwind.config.js`), replacing `src/popup.css`.
- `@radix-ui/react-dropdown-menu` for the priority menu and
  `@radix-ui/react-switch` for the three settings toggles.
- A stable `id` on `Item`, with a `normalizeState` migration that backfills
  existing stored items.
- `src/core/reducer.ts`: a pure, DOM-free reducer replacing the module-level
  `let state` plus `saveAndRender()`.
- Porting HTML5 drag-and-drop into a React hook with identical behaviour.
- Rewriting the parts of `CLAUDE.md`, `README.md` and `CHANGELOG.md` this
  invalidates.

**Out of scope**

- **Any behaviour or visual change.** The popup must look and behave exactly as
  it does now at every phase boundary. That is what makes a regression
  attributable.
- Touch or keyboard drag support. Native HTML5 DnD has neither today; adding
  them is a feature, not a migration step.
- A test framework in the repo. Verification is throwaway (see below).
- Firefox.
- The ~26 existing `typescript.md` violations in `src/core/utils.ts` and other
  non-UI files. New code must not add to them; old code is a separate job.
- The `loadState()` race, `debounce()`/`formatDate()` being unused, and the
  suspected IME duplicate-`Enter`. All documented, all unchanged.

## Architecture / Design decisions

### Items need a stable `id`, and this is the crux

Nothing else in this plan works without it. Items are addressed **by array
index** everywhere: `groupByDay()` returns `{ item, index }` pairs, every row
handler closes over an `index`, and `moveItem(items, from, to)` is defined in
terms of indices into the pre-move array.

React needs a `key` that identifies a row across renders. Index-as-key is
exactly wrong for a list that reorders: after a drag, React matches old row 0 to
new row 0, sees different text, and mutates the existing DOM node instead of
moving it. The symptom is not a crash — it is an inline editor that stays open
on the wrong row, a dragged node that loses its drag state, and a `dblclick`
that lands on a row whose contents just changed underneath it.

So `Item` gains `id: string`, generated with `crypto.randomUUID()`. The
migration goes in `normalizeState()`, which is already "the single gate for
anything read from storage" and already the documented place for a migration.

**Index addressing stays.** Handlers keep taking indices, because `moveItem`,
`groupByDay` and the drop reports are all built on them and rewriting that is a
second migration. `id` exists for React's benefit — as the `key` — not as the
new addressing scheme. This is a deliberate, narrow use.

### Four traps dissolve, and only because of the ids

`CLAUDE.md` documents eight traps. React changes the status of half of them:

| Trap                                                                                                                                                | After                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Never re-render during a drag.** Rebuilding rows destroys the node being dragged.                                                                 | **Dissolves.** React reconciles rather than rebuilding, so the dragged node survives a render — _provided_ its key is stable. With index keys the trap comes back in a harder-to-see form.                                                                                       |
| **Single-click-to-toggle and double-click-to-edit cannot share a target.** The two clicks re-render first, so `dblclick` fires on an orphaned node. | **Dissolves.** The two clicks still fire first — that is the DOM, not the framework — but with a stable key React keeps the node, so `dblclick` lands on a live row. Clicking text could toggle again. **Do not take that freedom in this migration:** it is a behaviour change. |
| **`.body` has a catch-all click handler that toggles `done`.** Every control inside inherits it unless excluded with `closest()`.                   | **Dissolves.** React wires handlers per element. The three `closest()` guards and the `BODY_CONTROLS` selector all go.                                                                                                                                                           |
| **Module-level `getElementById` makes the popup un-rebootable in one process.**                                                                     | **Dissolves.** No module-level DOM access survives; `src/core/dom.ts` is deleted.                                                                                                                                                                                                |

Four persist untouched and must stay documented: the `loadState()` async race,
`background.ts` re-syncing the alarm on every storage write, `hasChromeStorage`
being a module-load-time snapshot, and `dueDate` being a day key rather than a
timestamp.

The honest framing for `CLAUDE.md`: these entries get **rewritten, not
deleted**. The reasoning is still the most valuable thing in that file, and
"this used to bite, here is why, here is why it no longer can" is worth more to
the next reader than silence.

### State: a pure reducer in `src/core/`

`let state` plus `saveAndRender()` becomes `useReducer`. The reducer lives in
`src/core/reducer.ts`, not beside the components, for two reasons: the layering
rule says anything expressible as a pure function of state belongs in `core`,
and `core` is the only part that still runs under plain `node` once `.tsx`
exists (Node's native type-stripping does not do JSX). Putting the reducer there
is what keeps the state logic verifiable with a zero-dependency script.

Actions, read off the current handlers:

```
ADD_ITEM          SET_PRIORITY      MARK_ALL        SET_THEME
DELETE_ITEM       SET_DAY           CLEAR_ALL       SET_WIDTH
TOGGLE_DONE       MOVE_ITEM         REPLACE_STATE   SET_REMINDER_ENABLED
RENAME_ITEM       REASSIGN_DAY                      SET_REMINDER_TIME
```

Each one composes the existing `utils.ts` transforms — `parseDraft`,
`touchItem`, `sortByPriority`, `setAllDone`, `moveItem`, `nextTheme`,
`nextWidth`. The reducer adds no new logic; it just gives the existing
transforms a single entry point.

Three pieces of state are **not** in the reducer, because they are view state
that must never be persisted: whether the clear button is armed, which row is
being edited, and whether the settings panel is open. They become `useState` in
the components that own them.

### The storage write-loop, which is new and easy to get wrong

Today, saving is explicit: each handler calls `saveAndRender()`. The obvious
React translation — an effect that calls `saveState` whenever state changes — is
wrong, because `chrome.storage.onChanged` also sets state. The reminder window
ticks an item, the popup's listener dispatches `REPLACE_STATE`, the effect fires
and writes that same state straight back. At best a redundant write; combined
with `background.ts` re-syncing the alarm on every write, it is a feedback loop.

The fix is to keep saving explicit rather than reactive: a dispatch wrapper that
persists for locally-originated actions and skips for `REPLACE_STATE`. Writing
this down because the reactive version looks cleaner and is the natural thing to
reach for.

### Tailwind v4, and an honest note on its value

v4 is CSS-first: no `tailwind.config.js`, tokens declared in CSS with `@theme`.
That maps unusually well here, because `src/popup.css` is _already_ 28 CSS
custom properties plus one `html[data-theme="dark"]` block that redefines them.
Those 28 properties move into `@theme` and stay the single source of colour
truth — **no hex values inlined into JSX**, which is the main way a Tailwind
migration destroys a themeable design.

The `data-*` contract survives as-is. `data-priority`, `data-done`,
`data-overdue`, `data-unset`, `data-armed`, `data-width` stay on the elements
and get targeted with Tailwind's `data-[priority=2]:` variants. This is also how
Radix's own `data-state="open"` / `data-state="checked"` attributes get styled,
so the two conventions converge rather than fighting.

Worth saying plainly: **Tailwind's value in this codebase is modest.** 438 lines
of token-driven, theme-aware CSS is not the problem Tailwind solves. The real
wins in this plan are Radix and React's reconciliation. Tailwind is here because
it was asked for, it is a defensible choice, and co-locating styles with
components does help when components are the unit of work — but it should not be
the phase anyone expects the payoff from.

### Radix mapping, and what Radix does not cover

| Current                                                                                                                       | Becomes                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/ui/menu.ts` — 129 lines: positioning, flip-above-when-no-room, focus the checked item, Escape, outside-click, arrow keys | `@radix-ui/react-dropdown-menu`. **Deleted entirely.** Radix does all of it, with Floating UI handling the flip. The single biggest deletion in the plan.                      |
| Three `role="switch"` + `aria-checked` buttons with a `.knob` span                                                            | `@radix-ui/react-switch`, styled from `data-state`                                                                                                                             |
| The `#settings-panel` inline `hidden` section                                                                                 | `@radix-ui/react-collapsible`. Chosen over a conditional render because it keeps the panel in the tree for the Escape-to-close behaviour and gives `data-state` to style from. |
| `src/features/due-date.ts` — chip plus off-screen `<input type="date">` and `showPicker()`                                    | **Keeps the native input.** Radix has no date picker. The off-screen-input trick and the `showPicker()`/`focus()` fallback port across unchanged.                              |
| `src/ui/drag-drop.ts` — HTML5 events, marker classes, dragged-row state                                                       | A `useDragDrop()` hook. Still native events, still markers via refs. See below.                                                                                                |

### Drag and drop stays native, and stays out of React state

Decided with the user: no dnd-kit. The hook keeps the two properties that make
the current code work — hover markers applied by `classList` through refs rather
than by rendering, and the dragged index in a `useRef` rather than `useState` —
so a `dragover` at 60fps causes zero renders. The `preventDefault()`-or-no-drop
rule, the `setData()`-or-Firefox-refuses rule, and reading the drop side back
off the marker class all port across verbatim.

This is the one place the migration deliberately keeps imperative DOM code. The
alternative is re-tuning a gesture that currently works, for no requirement.

### Keeping the existing CSS classes until the very end

Phases 3–6 build React components that render `className="row"`, `className="box"`
and so on against the **existing** `popup.css`. Tailwind lands last, in phase 7.

This means touching every component twice. It is still right: it keeps the
visual diff at exactly zero through the entire React rewrite, so any visual
regression that appears in phase 7 is unambiguously a Tailwind problem and not a
component-structure problem. The alternative — building components with Tailwind
utilities from the start — conflates the two and makes a misplaced border
impossible to attribute.

### Verification: written, run green, then deleted

Per the user's instruction. Each phase's checks go in the **session scratchpad**,
never in the repo, so `package.json` never gains or loses a test dependency. The
reducer and the `normalizeState` migration are pure and DOM-free, so a plain
`node` script with zero dependencies can drive them — Node 26 strips types
natively. Components and styling are verified by hand in Chrome via `npm run dev`.

The repo's only committed gate stays `npm run check`.

## Phases

| Phase | File                                    | What it delivers                                                                                           |
| ----- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | `plan-1-item-identity.md`               | `Item.id`, backfilled by `normalizeState`. No React, no UI change.                                         |
| 2     | `plan-2-pure-reducer.md`                | `src/core/reducer.ts`, wired into the **existing imperative** popup.                                       |
| 3     | `plan-3-toolchain-and-reminder-page.md` | React + Tailwind installed; the 117-line reminder page converted as the beachhead. `NoteRow` is born here. |
| 4     | `plan-4-popup-in-react.md`              | The popup: shell, groups, rows, and every interaction except the menu and the drag.                        |
| 5     | `plan-5-radix-primitives.md`            | Radix dropdown, switches, collapsible. `src/ui/menu.ts` deleted.                                           |
| 6     | `plan-6-drag-and-drop-hook.md`          | `useDragDrop()`; the imperative controller deleted.                                                        |
| 7     | `plan-7-tailwind.md`                    | `popup.css` dismantled into `@theme` tokens plus utilities.                                                |
| 8     | `plan-8-docs-and-budget.md`             | Bundle measurement against budget; `CLAUDE.md` / `README.md` / `CHANGELOG.md`.                             |

The sequencing is deliberate on three points. **Phase 1 is first** because four
traps dissolve only given stable keys, and doing it later means debugging
React reconciliation bugs that look like application bugs. **Phase 2 ships with
the old UI still in place**, which separates "state logic extracted and verified"
from "view rewritten" — two independent failure modes that otherwise present
identically as a popup that renders the wrong thing. **Phase 3 converts the
reminder page, not the popup**, because it is 117 lines against the popup's 411
and proves the whole stack — React root, WXT module, flattened HTML output,
shared CSS — on the page where a mistake is cheap.

## Success criteria

- `npm run check` clean throughout, with `strict`, `noUncheckedIndexedAccess`
  and `erasableSyntaxOnly` all still on.
- `npm run build` produces a loadable `.output/chrome-mv3/`, and the generated
  manifest is unchanged except for asset filenames.
- No `.ts`/`.tsx` file under `src/` reads from the DOM by id. `src/core/dom.ts`,
  `src/ui/menu.ts` and `src/ui/drag-drop.ts` are gone.
- `src/core/utils.ts`, `src/core/types.ts` (beyond adding `id`) and
  `entrypoints/background.ts` are byte-identical to their pre-migration state,
  except for `normalizeState`'s id backfill.
- Every list row carries `key={item.id}`. No `key={index}` anywhere.
- `src/core/reducer.ts` is importable and exercisable by `node` with no
  dependencies and no DOM.
- New code obeys `.claude/rules/typescript.md`: explicit `return`, block bodies,
  multi-line functions, braced guards. Zero new violations.
- Colour and spacing values appear only in `@theme`; no hex literal in any
  `.tsx` file.
- Bundle: popup JS + CSS **under 180 kB raw / 60 kB gzipped**, measured and
  recorded. Popup open stays visually instant on a cold profile.
- Manual pass, identical to pre-migration behaviour: add plain / `!urgent` /
  `@tomorrow`; toggle via the box; confirm text does **not** toggle; double-click
  to edit, Enter commits, Escape reverts; delete; priority menu from both
  triggers, with keyboard and outside-click dismissal; due chip opens the native
  picker; clearing the date unschedules; drag within a group; drag onto another
  group's header; drag onto `UNSCHEDULED`; mark-all flips both ways; two-step
  clear; all three settings switches; reminder time persists; CSV export;
  reminder window fires, and ticking an item there updates an open popup.

## Open questions

- **Does the reminder page share `NoteRow`, and at what cost?** `reminder.ts`
  deliberately never imported `popup.ts`, and the two rows differ: the reminder
  row has no drag, no delete, no editing, and a one-way checkbox. A shared `NoteRow`
  with five `boolean` props is worse than two components. Phase 3 assumes a
  shared **presentational** `NoteRow` plus separate interactive wrappers; confirm
  that split survives contact with phase 4.
- **Does `@wxt-dev/module-react` support React 19.3 on WXT 0.21.4?** The module
  is at 1.2.2 and React 19 has been stable a while, but this pairing has not been
  verified in this repo. Phase 3 opens with a scratchpad spike, as the
  TypeScript migration did — that spike caught two wrong assumptions last time.
- **React Compiler?** React 19 can use it to avoid manual `memo`/`useCallback`.
  Given a popup rendering a few dozen rows, almost certainly unnecessary. Left
  off; worth revisiting only if measurement says so.
- **Is `src/features/` still a meaningful layer?** Once `priority.ts`,
  `due-date.ts` and `settings.ts` are React components, they are components, and
  `src/components/` may describe them better — leaving `features/export.ts`
  alone as the only non-component feature. Decide before phase 4 rather than
  drifting into a half-renamed tree.
- **Version bump.** `1.0.4` today. A full UI rewrite with deliberately zero
  user-visible change is an odd fit for any number; `1.1.0` is the least wrong.
