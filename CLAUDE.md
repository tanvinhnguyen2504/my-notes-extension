# CLAUDE.md

Chrome Manifest V3 extension: a toolbar popup todo checklist, plus a service
worker that opens a daily reminder window. TypeScript under full `strict`, built
with [WXT](https://wxt.dev) 0.21 (Vite under the hood). UI is React 19 with
Radix primitives; styling is Tailwind v4 tokens over hand-written component CSS.

**The folder you point `chrome://extensions` at is `.output/chrome-mv3/`, not the
repo root.** There is no `manifest.json` in the tree — it is generated at build
time from the `manifest` block in `wxt.config.ts` plus the contents of
`entrypoints/`. You are always testing a build artefact, which means a stale
`.output/` loaded in Chrome looks exactly like code that did not work.

Entry points live in `entrypoints/`, which is where WXT looks for them. WXT emits
HTML entrypoints **flattened to the output root**, so `entrypoints/popup.html`
becomes `popup.html` in the built extension. That is what keeps the unchecked
path strings working — `url: "reminder.html"` in `entrypoints/background.ts`, and
`default_popup`, which WXT generates from the entrypoint's existence rather than
from anything written by hand. A page added under `src/` instead of
`entrypoints/` is silently never emitted at all.

## Git

Never commit, push, or tag without being asked explicitly. Full rule:

@.claude/rules/commit.md

## Layout

The source sits under `src/`, laid out by layer: `core` ← `ui` ← `features` ←
entry points, and nothing imports upward.

| File                                                                                                         | Owns                                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `wxt.config.ts`                                                                                              | Build config + the manifest fields. `storage` + `alarms`, no host permissions. `imports: false`                  |
| `tsconfig.json`                                                                                              | Extends `.wxt/tsconfig.json`; adds only `erasableSyntaxOnly`                                                     |
| `entrypoints/popup.html`                                                                                     | `<div id="root">` and the module script. Nothing else -- **no stylesheet link**, see the trap below              |
| `entrypoints/reminder.html`                                                                                  | The reminder window's page                                                                                       |
| `entrypoints/background.ts`                                                                                  | Service worker. Owns the reminder alarm and opens its window                                                     |
| `src/styles.css`                                                                                             | `@theme` tokens, the globals, and the rules that cannot be utilities. Serves the popup _and_ the reminder window |
| `src/popup.tsx`                                                                                              | React root for the popup. Imports `styles.css`, then mounts                                                      |
| `src/reminder.tsx`                                                                                           | React root for the reminder window. Imports `styles.css` too                                                     |
| `src/core/types.ts`                                                                                          | `Item`, `State`, `Settings`, `Priority`, `DayKey` and friends. Types only                                        |
| `src/core/utils.ts`                                                                                          | Parsing, priority, theme/width, task helpers. Pure. **No DOM access, no storage**                                |
| `src/storages/local.ts`                                                                                      | The only module that talks to a backend. chrome/localStorage fallback                                            |
| `src/storages/tasks.ts`                                                                                      | `tasks.v1` slice: `normalizeTasks`, load, save                                                                   |
| `src/storages/settings.ts`                                                                                   | `settings.v1` slice, `theme` included                                                                            |
| `src/storages/memo.ts`                                                                                       | `memo.v1` slice. Reserved -- nothing reads a memo yet                                                            |
| `src/storages/state.ts`                                                                                      | Assembles the slices into `State`; `persistChanged` writes only what changed                                     |
| `src/core/day_utils.ts`                                                                                      | Day keys, their formatting, and grouping items by day. **No DOM access**                                         |
| `src/core/reducer.ts`                                                                                        | The single place state changes. Pure, DOM-free, composed from `utils.ts`                                         |
| `src/components/PopupPage.tsx`                                                                               | Owns the reducer, the storage subscription, and non-persisted view state                                         |
| `src/components/ReminderPage.tsx`                                                                            | The reminder window: opens for HIGH-priority work, lists everything outstanding                                  |
| `src/components/NoteRow.tsx`                                                                                 | The shared row. Presentational, slot-based, used by both pages                                                   |
| `src/components/PopupRow.tsx`                                                                                | Wraps `NoteRow` with the menu, chip, editing, deletion and drag                                                  |
| `src/components/PriorityMenu.tsx`                                                                            | Radix `DropdownMenu`. Replaced 129 lines of hand-rolled popover                                                  |
| `src/components/SettingDetailsPanel.tsx`                                                                     | The settings body. A sibling of `<header>`, never inside it                                                      |
| `src/components/SettingsPanel.tsx`                                                                           | **Dead.** The old Radix `Collapsible` wrapper, now bypassed                                                      |
| `src/components/{Header,Compose,Progress,DayGroupSection,DueChip,EditableText,EmptyState,SettingSwitch}.tsx` | The rest of the tree                                                                                             |
| `src/hooks/useDragDrop.ts`                                                                                   | HTML5 drag events, drop markers, and the dragged-row ref                                                         |
| `src/hooks/useWidthDrag.ts`                                                                                  | Edge-drag resize. Pointer capture, writes `--wide-width`, commits on release                                     |
| `src/components/WidthGrip.tsx`                                                                               | The draggable edge. `fixed`, one per side, wide mode only                                                        |
| `src/features/export.ts`                                                                                     | CSV export of the list. The only non-component feature                                                           |
| `public/icons/`                                                                                              | Copied verbatim to the output root                                                                               |

Both HTML entrypoints are a `<div id="root">` plus a `<script type="module">`
pointing at a `.tsx` root, and Vite bundles each entrypoint with everything it
imports. **The stylesheet is one of those imports** -- `popup.tsx` and
`reminder.tsx` each begin `import './styles.css'`, and neither HTML file links
it. Vite emits the `<link rel="stylesheet">` into the built HTML itself, so
production is unchanged; dev is the reason, see the trap below.
`background.ts` is declared `type: "module"` through `defineBackground` so it
can import `utils.ts` too.

Import specifiers carry explicit `.ts` / `.tsx` extensions, and the `@/` alias
WXT offers is deliberately unused.

Import specifiers carry explicit `.ts` extensions (`./core/utils.ts`), and the
`@/` alias WXT offers is deliberately unused. Both exist so the same files run
untouched under plain `node` — see Testing.

## Architecture rules

- **`core/` stays DOM-free.** Anything expressible as a pure function of the
  state belongs in `utils.ts`, `day_utils.ts` or `reducer.ts`, not in a component. Nothing in
  the codebase looks an element up by id any more.
- **`reducer.ts` is the single place state changes**, and it is pure: every case
  returns a new state, items array and item object where it changes one. A
  mutated-in-place item is a row that silently refuses to re-render. No-op
  actions return the _same_ state reference, which is how the view skips a save
  and a render.
- **Every list row carries `key={item.id}`, never the index.** Four of the traps
  below dissolve only because that key is stable. With an index key a reorder
  makes React mutate existing nodes instead of moving them, and the symptoms
  look like application bugs: an editor open on the wrong row, a `dblclick`
  landing on text that just changed.
- **`useDragDrop` never touches the todo list.** It reports a completed drop as
  indices plus a target day key through `onRowDrop` / `onGroupDrop`, and
  `PopupPage` decides what that means. It imports exactly one thing from `core`:
  the `DayKey` type.
- **Nothing renders during a drag.** The dragged index is a `useRef` and hover
  markers are applied with `classList`, so a `dragover` at 60fps causes zero
  renders. The budget is one render per drag, on the drop. Mutating `classList`
  on nodes React owns is safe _only_ because of that, and because every marker
  is cleared on drop before the render that follows.
- **`utils.ts` must stay runnable in a service worker**, and so must
  `day_utils.ts`, which `utils.ts` imports for `normalizeState` and
  `parseDraft`. `background.ts` imports `utils.ts`, and a worker has no `window` — which is why `preferredTheme()` guards on
  `typeof window`. Anything added there that touches `window` breaks the worker
  on the empty-storage path, silently. **The compiler will not catch this:**
  `lib` includes `DOM`, so `window` type-checks in `utils.ts` regardless. The
  guard is the only protection, and nothing tests it.
- **`NoteRow` stays free of reducer dispatch, drag wiring and Radix imports.**
  The old rule was "`reminder.ts` never imports `popup.ts`", because `popup.ts`
  wired itself at module load and threw on a page without the popup's ids. That
  hazard is gone, but the layering it protected is not: the popup's interactive
  behaviour belongs in `PopupRow`, not in the shared row.
- **Four class names are hooks, not styling: `row`, `text`, `compose`,
  `group-head`.** Everything else is utilities. These four exist because an
  ancestor selector cannot reach into a utility, and their conditions live
  outside the React root (`html[data-width="wide"]`, `body.reminder`) or are
  applied by `classList` (`drop-into` and the three drag markers). Removing one
  from a component silently drops wide mode, the reminder window's wrapping, or
  a drop marker -- with no error anywhere.
- **Never rely on utility order for a conflict.** Tailwind sorts utilities by
  property, not by the order they appear in `className`, so two utilities
  setting the same property at equal specificity are a coin toss. Write the
  conditions as mutually exclusive instead
  (`group-data-[priority=2]:group-data-[done=false]:`), or add a variant so one
  wins by specificity (`data-[armed=false]:hover:`). The old CSS used source
  order for exactly these cases and said so in a comment; that lever is gone.
- **Preflight is not imported, so no reset exists** beyond the `*`, `body` and
  `button` rules in `styles.css`. A utility that assumes Preflight can silently
  do nothing.
- **The reset lives in `@layer base`, and the overrides stay unlayered. The
  difference is load-bearing.** An unlayered rule beats every layer at any
  specificity, so where a rule sits decides whether it beats a utility or loses
  to one. `*`, `body` and `button` are a _reset_ -- utilities must win, so they
  are wrapped in `@layer base`. The `html[data-width="wide"]`, `body.reminder`
  and `.row.drop-*` rules are _overrides_ -- they must beat utilities, so they
  stay unlayered. Putting a rule on the wrong side of that line fails silently
  in whichever direction it was moved. `@layer theme, base, components,
utilities;` at the top of `styles.css` is what fixes the order; without it the
  order is first-appearance, which puts `base` _after_ `utilities`.
- **Types are derived, never restated.** `Priority` is
  `(typeof PRIORITY)[keyof typeof PRIORITY]`, so adding a level to the const
  object widens the type automatically. Never a TS `enum`: non-erasable syntax
  would stop the sources running under plain `node`, which `erasableSyntaxOnly`
  turns into a compile error.
- **The slice normalizers are the type boundary.** `normalizeTasks`,
  `normalizeSettings` and `normalizeMemos` each take `unknown` and return a
  complete value for every input, including `undefined`. Nothing downstream
  casts and nothing upstream is trusted. If a shape cannot be proven, the fix
  goes in a normalizer, never in a cast at the call site.
- **`core/` must not import `storages/`.** The dependency runs
  `core ← storages ← components`, and `utils.ts` holds no storage at all any
  more. A storage import inside `core` would make the cycle real and drag
  `chrome` into the pure layer.
- **Persisting is explicit, never reactive.** `dispatch` saves for
  locally-originated actions and skips `REPLACE_STATE`. An effect that saved on
  every state change would write back the state that just arrived _from_
  storage, which -- with `background.ts` re-syncing the alarm on every write --
  is a feedback loop. The natural React translation is the wrong one.

## Data model

State is `{ tasks, settings, memos }` -- three slices, each under its own
`chrome.storage.local` key, with a `localStorage` fallback so the popup also
runs from a plain page during testing:

| Key           | Holds                         |
| ------------- | ----------------------------- |
| `tasks.v1`    | `Task[]`, a bare array        |
| `settings.v1` | `Settings`, including `theme` |
| `memo.v1`     | `Memo[]`, always `[]` so far  |

There is **no migration from the pre-split layout**, deliberately. The old
`checklist.v1` key held `{ items, theme, settings }`; nothing reads it any more,
so an install that predates the split starts empty. The key is never written or
deleted either, so the old payload is still sitting there inert should it ever
be wanted -- but no code path knows about it.

**Three keys exist to stop cross-slice clobbering.** With one key, the popup
saving a settings toggle wrote back its own copy of `items` too, so it could
undo a tick the reminder window had just made; the `onChanged` listener existed
to paper over it. Now `persistChanged(previous, next)` writes only the slices
whose **reference** changed, which is exact rather than merely fast because the
reducer guarantees a changed slice is a new reference and an unchanged one is
the same reference. Never write a slice the reducer did not change.

`settings` is `{ theme, width, wideWidth, reminder: { enabled, time } }`.
`wideWidth` is px and only means anything while `width` is WIDE; `WidthGrip`
does the dragging, and `clampWideWidth()` holds it to
`WIDE_WIDTH.MIN..MAX` in both the normalizer and the reducer. It needed no
migration: the normalizer turns a missing value into the default like any
other. `theme` used to
sit outside `settings` so that moving it would not reset the saved theme for
every existing user; with no migration kept, that constraint is simply gone and
theme lives where it belongs. `normalizeSettings()` always returns a
_complete_ object; never spread a partial saved value into live state, because a
missing nested field reads as `undefined` exactly where it matters and fails
silently.

`reminder.time` is a local `"HH:MM"` string, for the same reason `dueDate` is a
day key: it is a time of day, not an instant, and `<input type="time">` reads and
writes that format natively.

An item is:

```js
{
  id: "9f1c...",         // stable across loads, backfilled by normalizeState
  text: "pay rent",
  done: false,
  priority: 2,          // PRIORITY.LOW 0 | NORMAL 1 | HIGH 2
  updatedAt: 1788666742704,  // epoch ms, or null for items predating the field
  dueDate: "2026-09-06",     // "YYYY-MM-DD" day key; new tasks default to today,
                             // null only for legacy items or a drop on UNSCHEDULED
}
```

**`dueDate` is a day-key string, deliberately not a timestamp.** An assigned day
has no time component; storing an instant would make the same task land on a
different calendar day depending on the reader's timezone. The format also sorts
as plain text and is exactly what `<input type="date">` reads and writes.

`normalizeState()` is the single gate for anything read from storage — it takes
`unknown`, validates, applies defaults, and is where a future migration goes. It
does not backfill `updatedAt`; missing stamps render blank rather than claiming a
date. It _does_ clamp `priority` through `isPriority()`: a stored value outside
the three real levels would otherwise match no CSS rule and no menu entry.

`DayKey` and `TimeOfDay` are plain aliases for `string`, deliberately not
branded. A brand would force a cast at every `<input type="date">` read, which is
most of the call sites, and the runtime guards already do the enforcing. One
consequence is worth knowing: because `DayKey` _is_ `string`, the type predicate
`isDayKey(value): value is DayKey` narrows the **failing** branch of an
already-`string` value to `never`. That is why `matchesDayKey()` exists
separately — `parseDayInput` keeps using its input after a failed check.

Every content or state change to an item goes through `touchItem(item)` so the
displayed modified date cannot drift. Reordering does not stamp — that changes
list position, not the item.

## Conventions

- Element handles are `const somethingEl` / `somethingButtonEl`, ids are
  kebab-case with a `btn-` prefix for buttons (`btn-check-all`).
- Components are `.tsx`; everything else is `.ts`. Components live in
  `src/components/`, hooks in `src/hooks/`.
- **Colour values live in `@theme` only.** No colour literal belongs in a `.tsx`
  file -- that is the single rule keeping the design themeable. Shadows are
  tokens too (`--shadow-knob`, `--shadow-menu`) precisely so their `rgba()`
  alphas do not have to be inlined in a component.
- **Sizes are arbitrary-value utilities (`h-[28px]`, `text-[10.5px]`), not the
  default scale.** The design was drawn in px before Tailwind arrived and the
  conversion's premise was zero visual change; rounding to the 0.25rem scale
  would have moved every edge.
- Data attributes are rendered as strings, never booleans. See the trap below.
- Priority levels are `PRIORITY.*` constants, never bare `0`/`1`/`2`.
- `PRIORITY_ORDER` drives menu order; `PRIORITY_LABELS` drives menu text.
- The styling keys off `data-priority`, `data-done`, `data-key` and
  `data-overdue` on rows and groups, now through `group-data-*` variants on the
  children rather than descendant CSS. **These attribute names are a contract
  with the utilities** — renaming one in JS alone silently breaks the styling
  with no error anywhere. The row and the day section are both Tailwind
  `group`s, which is what lets a child read them.
- Guard bodies are always braced. No `if (cond) return;` on one line, even
  where a single-line guard would read fine.

## TypeScript style

The house TypeScript rules live in their own file and are imported here, so
there is one copy to edit:

@.claude/rules/typescript.md

In short: explicit `return`, block bodies, multi-line functions, and no
compressing logic to save lines — including inside `map` / `filter` / `reduce`
callbacks, which stay inline but still take a block body.

## Traps this codebase has already hit

- **~~`.body` has a catch-all click handler that toggles `done`.~~ No longer
  applies.** It used to: every control inside the row body inherited the toggle
  unless explicitly excluded, and `.del`, `.text` and the `.due` chip each
  needed a `closest()` guard added after the fact. React wires handlers per
  element, so the catch-all, the three guards and the `BODY_CONTROLS` selector
  are all gone. **Do not reintroduce a handler on `.body`** -- it would bring the
  whole class of bug back with it.
- **Single-click-to-toggle and double-click-to-edit cannot share a target.** A
  double-click sends two `click` events _first_; each one re-renders, so the
  `dblclick` then fires on a node no longer in the document and the edit opens
  on an orphaned row — invisible, no error. This is why clicking a task's text
  does not tick it off.
- **~~Never re-render during a drag.~~ Still true in effect, for a different
  reason.** The old hazard was that rebuilding the rows destroyed the node being
  dragged. React reconciles rather than rebuilding, so a render mid-drag no
  longer aborts the gesture -- _given a stable key_. The rule survives as a
  performance one: hover markers stay out of React state so a `dragover` causes
  no render at all.
- **`dragover` must call `preventDefault()`** or `drop` never fires, and a drag
  needs `dataTransfer.setData()` or Firefox refuses to start it.
- **`loadState()` is async and its `.then` replaces `state` wholesale.** Items
  added in the milliseconds before storage resolves are silently discarded.
  Known, unfixed, hard to hit in practice. The same wholesale replacement is why
  the reminder window ticking an item needed the `chrome.storage.onChanged`
  listener in `PopupPage` — without it the popup's next save writes stale items
  back and the tick vanishes.
- **`background.ts` re-syncs the alarm on every storage write**, and the reminder
  window writes whenever an item is ticked. `syncAlarm()` therefore compares the
  existing alarm against the computed time and leaves it alone when they match;
  recreating it unconditionally would push each day's reminder further away every
  time you used the previous one.
- **An MV3 service worker is terminated when idle.** Nothing in `background.ts`
  may rely on module-level mutable state surviving between events, and every
  listener has to be registered synchronously inside `main()` so the worker can
  be woken for it.
- **Module-level element capture makes the popup un-rebootable in one process.**
  `priority.ts` captures `#priority-menu` at import time, and Node caches ES
  modules by specifier — so anything that boots the popup twice in one process
  has the second boot driving the first boot's DOM, with no error. One boot per
  process.
- **`hasChromeStorage` in `utils.ts` is a module-load-time snapshot.** It is
  computed once, when the module is first evaluated. Because ES imports are
  hoisted, a test that installs a `chrome` stub in its own file body arrives too
  late: `loadState()` has already latched the `localStorage` path. Harmless in
  production, because a worker always has `chrome` — but it means a stub has to
  be installed from a module that loads _before_ `utils.ts`, not from the file
  doing the stubbing.
- **Entrypoint files are imported by WXT at build time, in Node.** Anything
  touching `chrome` at the top level of `entrypoints/background.ts` breaks
  `wxt build`. The listeners therefore live inside `defineBackground`'s
  `main()` — and `main()` must stay synchronous, because a listener registered
  after an `await` can miss the very event that woke the worker. The two
  mistakes fail in opposite directions at opposite times: one at build, one
  silently at runtime.
- **`imports: false`.** WXT can auto-inject `defineBackground` and friends as
  globals. It is off so that nothing in this codebase is an identifier you
  cannot grep for.
- **React omits `data-x={false}` entirely.** `styles.css` matches on
  `[data-done="false"]`, so every data attribute is rendered as a _string_:
  `data-done={String(item.done)}`. Passing the boolean drops the attribute and
  the rule silently stops matching.
- **Radix portals its content outside the React root**, to `document.body`. Two
  consequences: `data-theme` has to live on `documentElement` (it does), or a
  portalled menu renders in the wrong theme; and any style rule scoped under the
  root element would not reach it.
- **React's `onChange` is the DOM's `input` event, not `change`.** The reminder
  time field therefore holds its own local draft state: bound straight to saved
  state, a controlled `<input type="time">` would overwrite "0:3" with the last
  good value while the user was still typing. Only a complete time reaches the
  reducer, which rejects the rest through `isTimeOfDay`.
- **A `<link rel="stylesheet">` to `src/styles.css` works in `wxt build` and
  silently applies nothing under `wxt dev`.** The dev server rewrites the href
  to `http://localhost:3000/src/styles.css`, and Vite serves that path as
  `Content-Type: text/javascript` -- a module that injects the CSS through HMR,
  which is correct for an `import` and useless for a `<link>`. Browsers enforce
  strict MIME checking on stylesheets, so the response is discarded with no
  error in the console beyond a MIME warning, and the popup renders completely
  unstyled. The same URL with `?direct` returns `text/css`, which is how to
  confirm the stylesheet itself compiled. The fix is to import the stylesheet
  from the `.tsx` root rather than link it, which is what both roots now do.
  **The two modes fail in opposite directions:** the production build is the
  one that makes the `<link>` look correct.
- **An unlayered `button {}` reset silently beat every utility on every
  button.** `button { font: inherit; color: inherit; background: none;
border: 0; padding: 0; }` sat unlayered while all component styling moved into
  `@layer utilities`, and an unlayered rule wins against a layer regardless of
  specificity. Those five declarations therefore killed `bg-*`, `border-*`,
  `p-*`/`px-*`/`py-*`, the text colours and -- via `font: inherit` -- every
  `text-[Npx]` and `font-medium`, on all 11 buttons in the app. The symptoms
  read as application bugs, not CSS ones: no priority edge strip, no priority
  pills, no checkbox box, no due chips, no header chip outlines, and every label
  rendering at the body's 13.5px. **Nothing errors and the class is present in
  the emitted CSS**, so grepping the stylesheet proves nothing -- the rule is
  there, the selector matches, and it loses the cascade anyway. The tell is
  `getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)"` on an element
  whose `bg-*` class is right there in `className`. This is why the reset is now
  in `@layer base`. The pre-Tailwind CSS hid it: that was unlayered too, so it
  won on specificity.
- **`!important` INVERTS layer order, so it must never appear in `@layer
base`.** For important declarations the cascade reverses: an earlier layer
  beats a later one, and a layered important beats an unlayered normal rule. So
  `body { height: 520px !important }` inside `base` was not merely "stronger" --
  it became the strongest declaration in the file and silently overrode the
  unlayered `body.reminder { height: 100vh }`, pinning the reminder window to
  the popup's 520px. The popup looked perfect the whole time. If a declaration
  in this file seems to need `!important`, the layer order is wrong instead.
- **Deleting `@layer theme, base, components, utilities;` flattens the whole
  app, and has already happened once.** It is one line, it looks redundant next
  to the two `@import ... layer(...)` rules, and removing it is silent: the
  build succeeds, every utility is still emitted, and the layer order quietly
  falls back to first-appearance (`theme -> utilities -> base`), which puts the
  reset last so it beats every utility. Prettier preserves the line (verified
  against 3.9.10), so if it goes missing it was removed by hand. Checking takes
  one command -- the built CSS must list `base` BEFORE `utilities`:
  `grep -o '@layer [a-z, ]*[{;]' .output/chrome-mv3/assets/*.css`
- **`#root` is part of the layout, and body's flex column does NOT reach past
  it.** React renders into `<div id="root">`, so body has exactly one child and
  `header`/`main`/`footer` are children of _that_. While `#root` was an
  unstyled block, `body { display: flex; flex-direction: column }` laid out
  `#root` alone and `flex-1` on `<main>` addressed a parent that was not a flex
  container -- so the list never took the free space, never scrolled, and the
  compose row was not pinned to the bottom, it merely followed the last row.
  Nothing errored; the popup just sized itself to its content forever. This was
  inert from the React migration until it was found, and the docs described the
  pre-React structure the whole time. `#root` now carries the column itself,
  including **`min-height: 0`** -- without that a flex item refuses to shrink
  below its content, body's `max-height` only clips, and `<main>` still never
  scrolls. It cannot be a utility: nothing in React renders `#root`.
- **The unlayered `:focus-visible` beats every `outline-*` utility**, which is
  the same cascade trap as the `button` reset but left in place deliberately.
  The consequence is that a component cannot opt out of the focus ring from its
  `className`: `Compose`'s input needed a rule in `styles.css` to give its ring
  up to the row. **`EditableText` still carries a dead `outline-0`** and shows
  the global ring regardless -- decide whether that is wanted before copying the
  pattern.
- **A resize drag must read `screenX`, never `clientX`.** Chrome anchors the
  popup near the toolbar icon, so growing it moves the window's left edge --
  which shifts the viewport origin mid-drag. `clientX` is viewport-relative, so
  a perfectly still pointer reports a moving `clientX` and the width runs away
  on its own, accelerating until it hits the clamp. `screenX` does not move
  with the window. The same anchoring is why the two grips need opposite signs:
  only the left edge actually travels.
- **`resize: horizontal` gives a bottom-right CORNER grip, not edges.** It is
  otherwise attractive -- the browser draws it and honours min/max-width -- but
  it also writes an inline `width` on `<body>` that outranks the stylesheet and
  survives a switch back to compact mode. Not used, for the corner alone.
- **`else if` is not a guard clause.** A brace-normalising pass once rewrote
  `} else if (cond) { body }` into `} else { if (cond) {} body }`, which made the
  editor's `settle(false)` run for _every_ key except Enter -- typing one
  character closed the editor and discarded the edit. The detector is an
  `if (...) {` immediately followed by `}`.

## Testing

There is no test framework and no test suite. `npm run check` (`tsc --noEmit`)
is the only automated gate; everything else is checked by loading
`.output/chrome-mv3/` in Chrome and using it.

**The sources no longer run under plain `node`.** They used to, which is why
`erasableSyntaxOnly` is on and why imports carry explicit extensions. Two things
ended it: components are `.tsx`, and Node's type-stripping does not do JSX; and
house style uses one plain `import` form for values _and_ types, which the
stripper cannot tell apart, so it leaves `import { DayKey }` in place and ESM
linking fails with "does not provide an export named". `tsc` and Vite both elide
those imports correctly, so only the no-build-step route is gone.

Verification during development is therefore throwaway: a scratchpad script run
through `npx tsx` (which elides correctly), deleted once green. `src/core/` is
the layer worth driving that way -- `reducer.ts` and `normalizeState` are pure,
and between them they hold every state transition.

If a suite is ever added, the constraints that mattered last time: dispatch the
real event sequence rather than the convenient one (`dblclick` alone hides the
two-clicks-first ordering); jsdom events carry no `dataTransfer`; `instanceof`
is realm-sensitive, so jsdom's constructors have to go on `globalThis`; and
`renderToStaticMarkup` is enough to pin the class-and-data-attribute contract
that `styles.css` depends on, with no DOM at all.

## Loose ends

- `debounce()` in `utils.ts` and `formatDate()` in `day_utils.ts` are exported
  but unused.
  `debounce()` was a leading-edge guard against rapid-Enter duplicate adds and
  was later unwired; `formatDate()` rendered the per-row modified stamp that the
  row no longer shows.
- A suspected IME interaction (Vietnamese Telex) may produce a duplicate `Enter`
  keydown when adding items. Guard is `if (event.key === "Enter" &&
!event.isComposing)`; not applied, cause unconfirmed. `npm run dev` is the
  first time this codebase has had fast iteration against a real browser
  profile, which is where confirming it became cheap.
- `typescript` is pinned to `^5.9.3`, the version WXT 0.21.4 ships against. TS 7
  (the Go port) installs as `latest` and is untested here.
- **`day_utils.ts` is the first step of a wider `core/` split.** Still planned,
  still only scaffolding: `core/task_utils.ts` for the pure item helpers, and a
  `src/storages/` layer. The storage split is **blocked on a design decision** --
  `STORAGE_KEY` holds one object behind one `normalizeState()` gate, so
  per-entity modules mean either three keys (a breaking change with no schema
  version to migrate on) or three modules read-modify-writing one key, which
  reintroduces lost updates. Decide that before writing any of it.
- **Extracting `day_utils.ts` exposed its export surface**: of 11 exports, only
  `isDayKey`, `todayKey`, `formatDayKeyShort`, `extractDayToken` and
  `groupByDay` have a consumer outside the module. `toDayKey`, `shiftDayKey`,
  `formatDayKey`, `dayGroupLabel` and `parseDayInput` are internal helpers that
  need not be exported; `formatDate` has no caller at all. Left as-is
  deliberately -- dropping an `export` is a separate, easily-reviewed change.
- **The Tailwind conversion has now been checked by eye, and it was broken.**
  The side-by-side against the pre-React build had never been run; doing it
  found the unlayered `button` reset above, which had flattened every button in
  the app. Popup light, popup dark and the reminder window have since been
  rendered with seeded tasks and confirmed correct. Still unverified: the
  priority menu's position and flip, since `.menu`'s `position: fixed` was
  removed -- it needs an open menu to see, which a static render does not
  produce.
- **The date input renders inside the row body**, where the body's 11px flex gap
  reserves a column for it even at zero width -- so popup rows have ~11px less
  room for text than the pre-React build. `NoteRow`'s `children` slot exists for
  exactly this and is unused; moving the input there, or wrapping chip and input
  in one flex item, is the fix. Cosmetic, and predates the Tailwind work.
- **Bundle cost of the React migration**, measured: the popup payload went from
  27.6 kB raw / ~9 kB gzipped to **348 kB raw / 108 kB gzipped**, about 12x. React
  and react-dom are 217 kB of that; Radix is 97 kB. Popup open latency is the one
  user-facing risk, and `preact/compat` is the lever if it ever matters.
- **Utilities cost more CSS here than the hand-written rules did**, measured:
  12.7 kB to 19.2 kB raw, 4.1 kB gzipped. ~14 components with almost no
  repetition between them means one verbose escaped selector per declaration,
  which does not amortise. The phase 7 plan predicted a shrink and was wrong.
