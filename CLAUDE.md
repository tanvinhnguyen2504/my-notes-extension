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

| File | Owns |
| --- | --- |
| `wxt.config.ts` | Build config + the manifest fields. `storage` + `alarms`, no host permissions. `imports: false` |
| `tsconfig.json` | Extends `.wxt/tsconfig.json`; adds only `erasableSyntaxOnly` |
| `entrypoints/popup.html` | `<div id="root">`, the stylesheet link, and the module script. Nothing else |
| `entrypoints/reminder.html` | The reminder window's page |
| `entrypoints/background.ts` | Service worker. Owns the reminder alarm and opens its window |
| `src/styles.css` | `@theme` tokens, the globals, and the rules that cannot be utilities. Serves the popup *and* the reminder window |
| `src/popup.tsx` | React root for the popup. Mounts and nothing else |
| `src/reminder.tsx` | React root for the reminder window |
| `src/core/types.ts` | `Item`, `State`, `Settings`, `Priority`, `DayKey` and friends. Types only |
| `src/core/utils.ts` | Storage, normalisation, parsing, priority, theme/width. **No DOM access** |
| `src/core/day_utils.ts` | Day keys, their formatting, and grouping items by day. **No DOM access** |
| `src/core/reducer.ts` | The single place state changes. Pure, DOM-free, composed from `utils.ts` |
| `src/components/PopupPage.tsx` | Owns the reducer, the storage subscription, and non-persisted view state |
| `src/components/ReminderPage.tsx` | The reminder window: opens for HIGH-priority work, lists everything outstanding |
| `src/components/NoteRow.tsx` | The shared row. Presentational, slot-based, used by both pages |
| `src/components/PopupRow.tsx` | Wraps `NoteRow` with the menu, chip, editing, deletion and drag |
| `src/components/PriorityMenu.tsx` | Radix `DropdownMenu`. Replaced 129 lines of hand-rolled popover |
| `src/components/SettingsPanel.tsx` | Radix `Collapsible` + `Switch` |
| `src/components/{Header,Compose,Progress,DayGroupSection,DueChip,EditableText,EmptyState,SettingSwitch}.tsx` | The rest of the tree |
| `src/hooks/useDragDrop.ts` | HTML5 drag events, drop markers, and the dragged-row ref |
| `src/features/export.ts` | CSV export of the list. The only non-component feature |
| `public/icons/` | Copied verbatim to the output root |

Both HTML entrypoints are a `<div id="root">` plus a `<script type="module">`
pointing at a `.tsx` root, and Vite bundles each entrypoint with everything it
imports. `background.ts` is declared `type: "module"` through `defineBackground`
so it can import `utils.ts` too.

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
  actions return the *same* state reference, which is how the view skips a save
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
  on nodes React owns is safe *only* because of that, and because every marker
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
- **Types are derived, never restated.** `Priority` is
  `(typeof PRIORITY)[keyof typeof PRIORITY]`, so adding a level to the const
  object widens the type automatically. Never a TS `enum`: non-erasable syntax
  would stop the sources running under plain `node`, which `erasableSyntaxOnly`
  turns into a compile error.
- **`normalizeState()` is the type boundary.** It takes `unknown` and returns
  `State`. Nothing downstream casts, and nothing upstream is trusted. If a
  shape cannot be proven, the fix goes in `normalizeState`, not in a cast at
  the call site.
- **Persisting is explicit, never reactive.** `dispatch` saves for
  locally-originated actions and skips `REPLACE_STATE`. An effect that saved on
  every state change would write back the state that just arrived *from*
  storage, which -- with `background.ts` re-syncing the alarm on every write --
  is a feedback loop. The natural React translation is the wrong one.

## Data model

State is `{ items: [], theme, settings }`, saved under `chrome.storage.local` key
`checklist.v1` (`STORAGE_KEY`), with a `localStorage` fallback so the popup also
runs from a plain page during testing.

`settings` is `{ width, reminder: { enabled, time } }`. `theme` stays a top-level
field deliberately — it predates `settings`, and moving it in would reset the
saved theme for every existing user and leave `normalizeState()` carrying a
read-from-both-places branch forever. `normalizeSettings()` always returns a
*complete* object; never spread a partial saved value into live state, because a
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
date. It *does* clamp `priority` through `isPriority()`: a stored value outside
the three real levels would otherwise match no CSS rule and no menu entry.

`DayKey` and `TimeOfDay` are plain aliases for `string`, deliberately not
branded. A brand would force a cast at every `<input type="date">` read, which is
most of the call sites, and the runtime guards already do the enforcing. One
consequence is worth knowing: because `DayKey` *is* `string`, the type predicate
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
  double-click sends two `click` events *first*; each one re-renders, so the
  `dblclick` then fires on a node no longer in the document and the edit opens
  on an orphaned row — invisible, no error. This is why clicking a task's text
  does not tick it off.
- **~~Never re-render during a drag.~~ Still true in effect, for a different
  reason.** The old hazard was that rebuilding the rows destroyed the node being
  dragged. React reconciles rather than rebuilding, so a render mid-drag no
  longer aborts the gesture -- *given a stable key*. The rule survives as a
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
  be installed from a module that loads *before* `utils.ts`, not from the file
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
  `[data-done="false"]`, so every data attribute is rendered as a *string*:
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
- **`else if` is not a guard clause.** A brace-normalising pass once rewrote
  `} else if (cond) { body }` into `} else { if (cond) {} body }`, which made the
  editor's `settle(false)` run for *every* key except Enter -- typing one
  character closed the editor and discarded the edit. The detector is an
  `if (...) {` immediately followed by `}`.

## Testing

There is no test framework and no test suite. `npm run check` (`tsc --noEmit`)
is the only automated gate; everything else is checked by loading
`.output/chrome-mv3/` in Chrome and using it.

**The sources no longer run under plain `node`.** They used to, which is why
`erasableSyntaxOnly` is on and why imports carry explicit extensions. Two things
ended it: components are `.tsx`, and Node's type-stripping does not do JSX; and
house style uses one plain `import` form for values *and* types, which the
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
- **The Tailwind conversion is done but unverified by eye.** The ~40 component
  classes are utilities on the components; `styles.css` keeps only the tokens,
  the globals, the `<html>`/`<body>` descendant overrides and the four drag
  classes. The emitted CSS and the markup contract are checked automatically,
  but the side-by-side visual comparison against the pre-React build has never
  been run. Riskiest: the priority menu's position and flip, since `.menu`'s
  `position: fixed` was removed.
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
