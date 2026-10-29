# CLAUDE.md

Chrome MV3 extension: a toolbar popup todo checklist plus a service worker that
opens a daily reminder window. TypeScript under full `strict`, built with
[WXT](https://wxt.dev) 0.21 (Vite). React 19 + Radix, styled with Tailwind v4.

**Load `.output/chrome-mv3/` in `chrome://extensions`, not the repo root.** There
is no `manifest.json` in the tree — WXT generates it from `wxt.config.ts` plus
`entrypoints/`. You always test a build artefact, so a stale `.output/` looks
exactly like code that did not work.

WXT emits HTML entrypoints **flattened to the output root**, so
`entrypoints/popup.html` becomes `popup.html`. That is what keeps the unchecked
path strings working (`url: "reminder.html"` in `background.ts`, and
`default_popup`). A page added under `src/` instead of `entrypoints/` is
silently never emitted.

## Git

Never commit, push, or tag without being asked explicitly. Full rule:

@.claude/rules/commit.md

## Layout

`src/` is layered `core ← storages ← components`, and nothing imports upward.

| File                                                                                                                              | Owns                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `wxt.config.ts`                                                                                                                   | Build config + manifest fields. `storage` + `alarms`, no host permissions. `imports: false`             |
| `tsconfig.json`                                                                                                                   | Extends `.wxt/tsconfig.json`; `erasableSyntaxOnly: false`, `jsx: react-jsx`                             |
| `entrypoints/popup.html`                                                                                                          | `<div id="root">` + the module script. **No stylesheet link** — see Traps                               |
| `entrypoints/reminder.html`                                                                                                       | The reminder window's page                                                                              |
| `entrypoints/background.ts`                                                                                                       | Service worker. Owns the reminder alarm and opens its window                                            |
| `src/styles.css`                                                                                                                  | `@theme` tokens, the layered reset, and the rules that cannot be utilities. Serves both pages           |
| `src/popup.tsx` / `src/reminder.tsx`                                                                                              | React roots. Each imports `styles.css`, then mounts                                                     |
| `src/core/types.ts`                                                                                                               | `Task`, `State`, `Settings`, `Priority`, `DayKey`. Types only                                           |
| `src/core/utils.ts`                                                                                                               | Parsing, priority, theme/width, clamps. Pure. **No DOM, no storage**                                    |
| `src/core/day_utils.ts`                                                                                                           | Day keys, formatting, grouping by day. **No DOM**                                                       |
| `src/core/reducer.ts`                                                                                                             | The single place state changes. Pure, DOM-free                                                          |
| `src/storages/local.ts`                                                                                                           | The only module that talks to a backend. chrome/localStorage fallback                                   |
| `src/storages/{tasks,settings,memo}.ts`                                                                                           | One slice each: normalizer, load, save                                                                  |
| `src/storages/state.ts`                                                                                                           | Assembles the slices; `persistChanged` writes only what changed                                         |
| `src/components/PopupPage.tsx`                                                                                                    | The shell: owns the reducer, the storage subscription, the `<html>` attribute effect and the tab switch |
| `src/components/{TasksPage,MemoPage}.tsx`                                                                                         | The two tab panels. Radix unmounts the inactive one, so neither may own storage                         |
| `src/components/ReminderPage.tsx`                                                                                                 | The reminder window: HIGH-priority work, lists everything outstanding                                   |
| `src/components/NoteRow.tsx`                                                                                                      | The shared row. Presentational, slot-based, used by both pages                                          |
| `src/components/PopupRow.tsx`                                                                                                     | Wraps `NoteRow` with the menu, chip, editing, deletion and drag                                         |
| `src/components/SettingDetailsPanel.tsx`                                                                                          | The settings body. A sibling of `<header>`, never inside it                                             |
| `src/components/WidthGrip.tsx`                                                                                                    | The draggable edge. `fixed`, one per side, wide mode only                                               |
| `src/hooks/useDragDrop.ts`                                                                                                        | HTML5 drag events, drop markers, the dragged-row ref                                                    |
| `src/hooks/useWidthDrag.ts`                                                                                                       | Edge-drag resize. Pointer capture, writes `--wide-width`, commits on release                            |
| `src/hooks/useMemoKeyboard.ts`                                                                                                    | The shared page shortcuts for `MemoPage` and `EnglishPage`. One global `keydown`, registered once        |
| `src/hooks/useResolvedTheme.ts`                                                                                                   | Resolves SYSTEM, follows the OS live, owns `data-theme` + `color-scheme`, mirrors the pref for no-flash  |
| `public/theme-init.js`                                                                                                            | Pre-paint theme, from `<head>` on both pages. Plain script, duplicated cache key — see Traps             |
| `src/components/{TaskHeader,Compose,Progress,DayGroupSection,DueChip,EditableText,EmptyState,HintToast,PriorityMenu,SettingSwitch,Tab,ThemeSetting}.tsx` | The rest of the tree                                                                                    |
| `src/features/export.ts`                                                                                                          | CSV export. The only non-component feature                                                              |
| `public/icons/`                                                                                                                   | Copied verbatim to the output root                                                                      |

**Imports carry no extension.** Cross-directory uses the `@/` alias
(`@/src/core/utils`), same-directory stays relative (`./memo`). `@/` resolves to
the **project root**, not `src/` — `.wxt/tsconfig.json` maps `"@/*": ["../*"]`
relative to `.wxt/` — so the `src/` segment is part of the specifier and
`@/core/utils` does not resolve.

## Architecture rules

- **`core/` stays DOM-free, and must not import `storages/`.** The dependency
  runs `core ← storages ← components`; a storage import in `core` would make the
  cycle real and drag `chrome` into the pure layer.
- **`reducer.ts` is the single place state changes, and it is pure.** Every case
  returns a new state, array and item where it changes one — a mutated-in-place
  item is a row that silently refuses to re-render. No-op actions return the
  _same_ state reference, which is how the view skips a save and a render.
- **`utils.ts` and `day_utils.ts` must stay runnable in a service worker.**
  `background.ts` imports them and a worker has no `window`. **The compiler will
  not catch a violation** — `lib` includes `DOM`, so `window` type-checks here
  regardless, and nothing tests it. The pattern that keeps this honest is
  `resolveTheme(preference, prefersDark)`: it takes the media-query result as a
  plain argument instead of reading `matchMedia`, so the DOM access lives in
  `useResolvedTheme` and `core/` needs no `typeof window` guard at all.
- **The slice normalizers are the type boundary.** `normalizeTasks`,
  `normalizeSettings` and `normalizeMemos` each take `unknown` and return a
  complete value for every input, `undefined` included. If a shape cannot be
  proven, the fix goes in a normalizer, never a cast at the call site.
- **Persisting is explicit, never reactive.** `dispatch` saves for
  locally-originated actions and skips `REPLACE_STATE`. An effect saving on every
  state change would write back the state that just arrived _from_ storage —
  with `background.ts` re-syncing the alarm on every write, that is a loop. The
  natural React translation is the wrong one.
- **Every list row carries `key={item.id}`, never the index.** Several traps
  below dissolve only because that key is stable.
- **Nothing renders during a drag.** The dragged index is a `useRef` and hover
  markers go on with `classList`, so a `dragover` at 60fps causes zero renders;
  the budget is one render per drag, on the drop. Mutating `classList` on nodes
  React owns is safe _only_ because of that, and because every marker is cleared
  before the render that follows.
- **`useDragDrop` never touches the todo list.** It reports a drop as indices
  plus a target day key; the caller decides what that means.
- **`NoteRow` stays free of reducer dispatch, drag wiring and Radix imports.**
  The popup's interactive behaviour belongs in `PopupRow`.
- **Types are derived, never restated.** `Priority` is
  `(typeof PRIORITY)[keyof typeof PRIORITY]`, so widening the const object
  widens the type. Same for `THEME` and `WIDTH`; keep it that way.
- **TS `enum`s are allowed in `core/types/` only** (`EMemoType` and friends).
  `erasableSyntaxOnly` is `false`, so the old ban lost its reason — but do not
  convert the derived-union trio above into enums either. Each shape has a
  caller base that depends on it.

### CSS

- **Four class names are hooks, not styling: `row`, `text`, `compose`,
  `group-head`.** Everything else is utilities. They exist because an ancestor
  selector cannot reach into a utility, and their conditions live outside the
  React root (`html[data-width='wide']`, `body.reminder`) or are applied by
  `classList`. Removing one silently drops wide mode, the reminder window's
  wrapping, or a drop marker — with no error anywhere.
- **The reset lives in `@layer base`; the overrides stay unlayered. The
  difference is load-bearing.** An unlayered rule beats every layer at any
  specificity, so where a rule sits decides whether it beats a utility or loses
  to one. `*`, `body`, `#root` and `button` are a _reset_ and must lose →
  `@layer base`. `html[data-width='wide']`, `body.reminder` and `.row.drop-*`
  are _overrides_ and must win → unlayered. Wrong side of that line fails
  silently, in whichever direction it was moved.
- **Never rely on utility order for a conflict.** Tailwind sorts by property,
  not by the order written, so two utilities setting the same property at equal
  specificity are a coin toss. Write mutually exclusive conditions
  (`group-data-[priority=2]:group-data-[done=false]:`) or add a variant so one
  wins by specificity (`data-[armed=false]:hover:`).
- **Preflight is not imported**, so no reset exists beyond the rules in
  `styles.css`. A utility that assumes Preflight can silently do nothing.

## Data model

State is `{ tasks, settings, memos }` — three slices, each under its own
`chrome.storage.local` key (`tasks.v1`, `settings.v1`, `memo.v1`), with a
`localStorage` fallback so the popup also runs from a plain page during testing.

**Three keys exist to stop cross-slice clobbering.** With one key, the popup
saving a settings toggle wrote back its own copy of `items` too, undoing a tick
the reminder window had just made. `persistChanged(previous, next)` writes only
the slices whose **reference** changed — exact rather than merely fast, because
the reducer guarantees a changed slice is a new reference. Never write a slice
the reducer did not change.

There is **no migration from the pre-split `checklist.v1` layout**, deliberately.
Nothing reads it, so an install predating the split starts empty; the old payload
sits there inert.

`settings` is `{ theme, width, wideWidth, mode, reminder: { enabled, time } }`.
**`theme` is a `ThemePreference` (`system` | `light` | `dark`), not a `Theme`.**
The two types are deliberately separate: `Theme` is the resolved pair that may
be written to `data-theme`, and `styles.css` has no block for `system` — storing
the preference where a resolved value is expected loses every dark token with no
error. `useResolvedTheme` is the only bridge between them.
`normalizeSettings()` always returns a _complete_ object — never spread a partial
saved value into live state, because a missing nested field reads as `undefined`
exactly where it matters and fails silently. `wideWidth` is px, meaningful only
while `width` is WIDE, and `clampWideWidth()` holds it to `WIDE_WIDTH.MIN..MAX`
in both the normalizer and the reducer.

A task is:

```js
{
  id: "9f1c...",             // stable across loads, backfilled on normalize
  text: "pay rent",
  done: false,
  priority: 2,               // PRIORITY.LOW 0 | NORMAL 1 | HIGH 2, clamped on read
  updatedAt: 1788666742704,  // epoch ms, or null for items predating the field
  dueDate: "2026-09-06",     // day key; new tasks default to today, null only for
                             // legacy items or a drop on UNSCHEDULED
}
```

**`dueDate` and `reminder.time` are strings, deliberately not timestamps.** An
assigned day has no time component, and a reminder time is a time of day, not an
instant — storing either as an instant would move it across timezones. Both
formats also sort as text and are exactly what `<input type="date">` and
`<input type="time">` read and write.

`DayKey` and `TimeOfDay` are plain aliases for `string`, deliberately not
branded: a brand would force a cast at every input read. One consequence —
because `DayKey` _is_ `string`, `isDayKey(value): value is DayKey` narrows the
**failing** branch of an already-`string` value to `never`. That is why
`matchesDayKey()` exists separately; `parseDayInput` keeps using its input after
a failed check.

Every content or state change goes through `touchItem(item)` so the displayed
modified date cannot drift. Reordering does not stamp — that changes list
position, not the item.

## Conventions

- Components are `.tsx`, everything else `.ts`. Components in `src/components/`,
  hooks in `src/hooks/`. Button ids are kebab-case with a `btn-` prefix.
- **Colour values live in `@theme` only.** No colour literal belongs in a `.tsx`
  file — that single rule keeps the design themeable. Shadows are tokens too
  (`--shadow-knob`, `--shadow-menu`) so their alphas need not be inlined.
- **Sizes are arbitrary-value utilities (`h-[28px]`, `text-[10.5px]`)**, not the
  default scale: the design was drawn in px, and rounding to the 0.25rem scale
  would move every edge.
- Priority levels are `PRIORITY.*`, never bare `0`/`1`/`2`. `PRIORITY_ORDER`
  drives menu order, `PRIORITY_LABELS` drives menu text.
- **`data-priority`, `data-done`, `data-key` and `data-overdue` are a contract
  with the utilities**, read through `group-data-*` variants — the row and the
  day section are both Tailwind `group`s. Renaming one in JS alone silently
  breaks the styling. Render them as **strings**, never booleans (see Traps).
- Guard bodies are always braced, even where one line would read fine.

## TypeScript style

@.claude/rules/typescript.md

In short: explicit `return`, block bodies, multi-line functions, and no
compressing logic to save lines — including inside `map` / `filter` / `reduce`
callbacks, which stay inline but still take a block body.

## Traps this codebase has already hit

### CSS cascade

These four are one family: the rule is present, the selector matches, and it
loses anyway. **Grepping the stylesheet proves nothing.** The tell is
`getComputedStyle(el)` disagreeing with a class that is right there in
`className`.

- **An unlayered `button {}` reset beat every utility on every button.** While
  `button { font: inherit; color: inherit; background: none; border: 0;
padding: 0 }` sat unlayered and component styling moved into
  `@layer utilities`, those five declarations killed `bg-*`, `border-*`, `p-*`,
  the text colours and — via `font: inherit` — every `text-[Npx]` and
  `font-medium`. Symptoms read as application bugs: no priority strips, no
  pills, no checkbox boxes, no chips, every label at 13.5px. The reset is now in
  `@layer base`.
- **Deleting `@layer theme, base, components, utilities;` flattens the whole
  app, and has already happened once.** It looks redundant next to the two
  `@import … layer(...)` rules, and removing it is silent: the build succeeds,
  every utility is still emitted, and layer order falls back to first-appearance
  (`theme → utilities → base`), putting the reset last. Prettier preserves the
  line (verified, 3.9.10), so if it goes missing it was removed by hand. Check:
  `grep -o '@layer [a-z, ]*[{;]' .output/chrome-mv3/assets/*.css` — `base` must
  precede `utilities`.
- **`!important` INVERTS layer order, so it must never appear in `@layer base`.**
  For important declarations the cascade reverses: an earlier layer beats a later
  one, and a layered important beats an unlayered normal rule. `body { height:
520px !important }` in `base` became the strongest declaration in the file and
  silently overrode `body.reminder { height: 100vh }`. If something here seems to
  need `!important`, the layer order is wrong instead.
- **The unlayered `:focus-visible` beats every `outline-*` utility** — the same
  trap, left in place deliberately. A component cannot opt out of the focus ring
  from its `className`; `Compose`'s input needed a rule in `styles.css` to hand
  its ring to the row. `EditableText` still carries a dead `outline-0`.

### Layout

- **`#root` is part of the layout; body's flex column does not reach past it.**
  React renders into `<div id="root">`, so body has exactly one child and
  `header`/`main`/`footer` are children of _that_. While `#root` was an unstyled
  block, `flex-1` on `<main>` addressed a non-flex parent: the list never
  scrolled and the compose row was not pinned. `#root` now carries the column,
  including **`min-height: 0`** — without it a flex item refuses to shrink below
  its content, so `max-height` only clips. It cannot be a utility: nothing in
  React renders `#root`.
- **A `<link rel="stylesheet">` to `src/styles.css` works in `wxt build` and
  applies nothing under `wxt dev`.** The dev server rewrites the href to
  `localhost:3000`, where Vite serves that path as `Content-Type:
text/javascript` — an HMR module, correct for an `import` and useless for a
  `<link>`, which browsers discard under strict MIME checking. The popup renders
  completely unstyled. `?direct` on the same URL returns `text/css`, which is how
  to confirm the stylesheet compiled. Both roots therefore `import` it.

### React / DOM

- **React omits `data-x={false}` entirely.** `styles.css` matches
  `[data-done="false"]`, so render every data attribute as a string:
  `data-done={String(item.done)}`.
- **Single-click-to-toggle and double-click-to-edit cannot share a target.** A
  double-click sends two `click` events _first_; each re-renders, so `dblclick`
  fires on a node no longer in the document and the edit opens on an orphan —
  invisible, no error. This is why clicking a task's text does not tick it off.
- **Do not put a click handler on the row body.** Every control inside it would
  inherit the toggle and need a `closest()` guard added after the fact.
- **React's `onChange` is the DOM's `input` event, not `change`.** The reminder
  time field holds a local draft: bound straight to saved state, a controlled
  `<input type="time">` overwrites "0:3" while the user is still typing.
- **Radix portals its content to `document.body`.** So `data-theme` must live on
  `documentElement` (it does), and any rule scoped under the React root would not
  reach a portalled menu.
- **`else if` is not a guard clause.** A brace-normalising pass once rewrote
  `} else if (cond) { body }` into `} else { if (cond) {} body }`, making the
  editor's `settle(false)` run for every key except Enter — one character closed
  the editor and discarded the edit.

### Pointer and drag

- **`dragover` must call `preventDefault()`** or `drop` never fires, and a drag
  needs `dataTransfer.setData()` or Firefox refuses to start it.
- **A resize drag must read `screenX`, never `clientX`.** Chrome anchors the
  popup near the toolbar icon, so growing it moves the window's left edge and
  shifts the viewport origin mid-drag: a still pointer reports a moving
  `clientX` and the width runs away on its own. The same anchoring is why the two
  grips need opposite signs — only the left edge travels.
- **`lostpointercapture` is the exit that actually fires.** When the release
  lands outside the window there is no `pointerup`, no `pointercancel` and no
  further `pointermove` — so a `buttons === 0` check inside the move handler is
  unreachable. Without handling it the drag stays armed and the dragged-to width
  is never committed, so it silently reverts on the next open.
- **`resize: horizontal` gives a bottom-right CORNER grip, not edges.** It also
  writes an inline `width` on `<body>` that outranks the stylesheet and survives
  a switch back to compact mode. Not used.

### Extension runtime

- **An MV3 service worker is terminated when idle.** Nothing in `background.ts`
  may rely on module-level mutable state surviving between events, and every
  listener must be registered synchronously inside `main()`.
- **Entrypoint files are imported by WXT at build time, in Node.** Touching
  `chrome` at the top level of `background.ts` breaks `wxt build`; registering a
  listener after an `await` can miss the very event that woke the worker. The two
  mistakes fail in opposite directions, one at build and one silently at runtime.
- **`background.ts` re-syncs the alarm on every storage write**, and the reminder
  window writes whenever an item is ticked. `syncAlarm()` therefore compares the
  existing alarm against the computed time and leaves it alone when they match;
  recreating it unconditionally pushes each day's reminder further away.
- **`loadState()` is async and its `.then` replaces `state` wholesale.** Items
  added in the milliseconds before storage resolves are silently discarded.
  Known, unfixed, hard to hit. The same wholesale replacement is why a tick in
  the reminder window needs the `chrome.storage.onChanged` listener in
  `PopupPage` — without it the popup's next save writes stale items back.
- **`hasChromeStorage` is evaluated per call, not snapshotted.** A module-level
  constant would latch the `localStorage` path before a test could install a
  `chrome` stub, because ES imports are hoisted.
- **`imports: false`.** WXT can auto-inject `defineBackground` and friends as
  globals. It is off so nothing here is an identifier you cannot grep for.

## Testing

No test framework, no suite. `npm run check` (`tsc --noEmit`) is the only
automated gate; everything else is checked by loading `.output/chrome-mv3/` in
Chrome and using it.

**The sources no longer run under plain `node`.** Components are `.tsx` and
Node's type-stripping does not do JSX; and house style uses one plain `import`
form for values _and_ types, which the stripper cannot tell apart, so it leaves
`import { DayKey }` in place and ESM linking fails. `tsc` and Vite both elide
those imports correctly, so only the no-build-step route is gone — which is why
`erasableSyntaxOnly` and explicit extensions were both dropped.

Verification is therefore throwaway: a scratchpad script through `npx tsx`,
deleted once green. `src/core/` is the layer worth driving that way — `reducer.ts`
and the normalizers hold every state transition.

If a suite is ever added: dispatch the real event sequence rather than the
convenient one (`dblclick` alone hides the two-clicks-first ordering); jsdom
events carry no `dataTransfer`; `instanceof` is realm-sensitive, so jsdom's
constructors must go on `globalThis`; and `renderToStaticMarkup` is enough to pin
the class-and-data-attribute contract `styles.css` depends on.

## Loose ends

- `debounce()` in `utils.ts` and `formatDate()` in `day_utils.ts` are exported
  but unused. `debounce()` is **leading-edge** — it fires immediately and ignores
  the rest, so it is the wrong tool for anything wanting a settled value.
- A suspected IME interaction (Vietnamese Telex) may produce a duplicate `Enter`
  keydown when adding items. Guard would be
  `if (event.key === 'Enter' && !event.isComposing)`; not applied, cause
  unconfirmed.
- `typescript` is pinned to `^5.9.3`, the version WXT 0.21.4 ships against. TS 7
  (the Go port) is untested here.
- Of `day_utils.ts`'s 11 exports only five have a consumer outside the module;
  the rest need not be exported. Left as-is deliberately.
- **The priority menu is still unverified by eye** since `.menu`'s
  `position: fixed` was removed — its position and flip need an open menu, which
  a static render does not produce. Popup light, popup dark and the reminder
  window have been checked.
- **The date input renders inside the row body**, where the 11px flex gap
  reserves a column for it even at zero width, costing ~11px of text room.
  `NoteRow`'s unused `children` slot exists for exactly this.
- **Measured costs of the React migration**: popup payload 27.6 kB raw / ~9 kB
  gzipped → **348 kB / 108 kB**, about 12x (React 217 kB, Radix 97 kB). CSS went
  12.7 kB → 19.2 kB raw, since ~14 components with little repetition produce one
  verbose escaped selector per declaration and never amortise. `preact/compat` is
  the lever if popup latency ever matters.

### Comments

Use comments sparingly. Only comment complex code where the logic isn't self-evident. Prefer clear variable names and simple logic over explanatory comments.
