# CLAUDE.md

Chrome Manifest V3 extension: a toolbar popup todo checklist, plus a service
worker that opens a daily reminder window. TypeScript under full `strict`, built
with [WXT](https://wxt.dev) 0.21 (Vite under the hood). No UI framework.

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
| `entrypoints/popup.html` | Markup + `row-tpl` / `group-tpl` templates + the priority menu container + the settings panel |
| `entrypoints/reminder.html` | The reminder window's page |
| `entrypoints/background.ts` | Service worker. Owns the reminder alarm and opens its window |
| `src/popup.css` | Theme tokens and all styling, for the popup *and* the reminder window |
| `src/popup.ts` | DOM rendering and event wiring. No business logic |
| `src/reminder.ts` | The reminder window: opens for HIGH-priority work, lists everything outstanding |
| `src/core/types.ts` | `Item`, `State`, `Settings`, `Priority`, `DayKey` and friends. Types only |
| `src/core/utils.ts` | Storage, parsing, dates, grouping. **No DOM access** |
| `src/core/dom.ts` | `el()` / `query()`. The only module allowed to reach for the document by id |
| `src/ui/menu.ts` | The shared popover mechanics one menu at a time is built on |
| `src/ui/drag-drop.ts` | HTML5 drag events, drop markers, and the dragged-row state |
| `src/features/priority.ts` | The per-row priority tag and its menu |
| `src/features/due-date.ts` | The per-row due chip and its menu |
| `src/features/settings.ts` | The settings panel: its open state and its controls |
| `src/features/export.ts` | CSV export of the list |
| `public/icons/` | Copied verbatim to the output root |

`entrypoints/popup.html` loads `src/popup.ts` with `type="module"`, and Vite
bundles that entrypoint and everything it imports. Adding a module to the popup
still means adding it as an import, not a second `<script>` tag — but now for a
bundler reason rather than a browser one. `reminder.html` is a separate page with
its own entry point, and `background.ts` is declared `type: "module"` through
`defineBackground` so it can import `utils.ts` too.

Import specifiers carry explicit `.ts` extensions (`./core/utils.ts`), and the
`@/` alias WXT offers is deliberately unused. Both exist so the same files run
untouched under plain `node` — see Testing.

## Architecture rules

- **`utils.ts` stays DOM-free.** It is the only part that is directly testable
  in Node. Anything that can be expressed as a pure function of the state
  belongs there, not in `popup.ts`. `dom.ts` is the only module allowed to reach
  for the document by id; everything else takes elements as parameters.
- **`drag-drop.ts` never touches the todo list.** It reports a completed drop as
  indices plus a target day key through `onRowDrop` / `onGroupDrop`, and
  `popup.ts` decides what that means. It imports exactly one thing from `core`:
  the `DayKey` type. `menu.ts` imports nothing from `core` at all, which is why
  `MenuEntry.priority` is a plain `number` and not a `Priority`.
- **`utils.ts` must stay runnable in a service worker.** `background.ts` imports
  it, and a worker has no `window` — which is why `preferredTheme()` guards on
  `typeof window`. Anything added there that touches `window` breaks the worker
  on the empty-storage path, silently. **The compiler will not catch this:**
  `lib` includes `DOM`, so `window` type-checks in `utils.ts` regardless. The
  guard is the only protection, and nothing tests it.
- **`reminder.ts` never imports `popup.ts`.** `popup.ts` calls `el()` at module
  top level and runs its wiring on load, so it throws on any page without the
  popup's ids — now with the id named in the message rather than as a null
  dereference. The reminder page shares `utils.ts` and `popup.css` and
  duplicates the few lines it needs to draw a row.
- **Types are derived, never restated.** `Priority` is
  `(typeof PRIORITY)[keyof typeof PRIORITY]`, so adding a level to the const
  object widens the type automatically. Never a TS `enum`: non-erasable syntax
  would stop the sources running under plain `node`, which `erasableSyntaxOnly`
  turns into a compile error.
- **`normalizeState()` is the type boundary.** It takes `unknown` and returns
  `State`. Nothing downstream casts, and nothing upstream is trusted. If a
  shape cannot be proven, the fix goes in `normalizeState`, not in a cast at
  the call site.
- **`render()` rebuilds every row from the template.** There is no partial
  re-render. Any handler that mutates state calls `saveAndRender()`, which
  replaces the DOM nodes the handler was attached to.

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
- **Look elements up with `el()` / `query()`, never with a `!` assertion.** Both
  throw and name what was missing, at the point the id is named. A
  `getElementById("draft")!` turns a typo in `popup.html` into a null-property
  read several frames away, which is the failure mode this codebase already has
  a trap entry about. `el()`'s internal cast is the only cast in the codebase;
  keep it that way.
- Priority levels are `PRIORITY.*` constants, never bare `0`/`1`/`2`.
- `PRIORITY_ORDER` drives menu order; `PRIORITY_LABELS` drives menu text.
- The CSS keys off `data-priority`, `data-done`, and `data-key` on rows and
  groups. **These attribute names are a contract with `popup.css`** — renaming
  one in JS alone silently breaks the styling with no error anywhere.
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

- **`.body` has a catch-all click handler that toggles `done`.** Every control
  placed inside the row body inherits that behaviour unless explicitly excluded.
  `.del`, `.text`, and the since-removed `.due` chip each needed a `closest()`
  guard added after the fact. A new in-row control will hit this too. Inverting the check so `.body`
  only toggles for `.box` and blank space would close it permanently.
- **Single-click-to-toggle and double-click-to-edit cannot share a target.** A
  double-click sends two `click` events *first*; each one re-renders, so the
  `dblclick` then fires on a node no longer in the document and the edit opens
  on an orphaned row — invisible, no error. This is why clicking a task's text
  does not tick it off.
- **Never re-render during a drag.** Rebuilding the rows destroys the node the
  browser is dragging and aborts the gesture. Hover state is CSS classes only;
  the list changes on `drop`.
- **`dragover` must call `preventDefault()`** or `drop` never fires, and a drag
  needs `dataTransfer.setData()` or Firefox refuses to start it.
- **`loadState()` is async and its `.then` replaces `state` wholesale.** Items
  added in the milliseconds before storage resolves are silently discarded.
  Known, unfixed, hard to hit in practice. The same wholesale replacement is why
  the reminder window ticking an item needed the `chrome.storage.onChanged`
  listener in `popup.ts` — without it the popup's next save writes stale items
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
  cannot grep for, and so entrypoints stay importable by plain `node`.

## Testing

There is no test framework and no test suite. `npm run check` (`tsc --noEmit`)
is the only automated gate; everything else is checked by loading
`.output/chrome-mv3/` in Chrome and using it.

Two tsconfig choices exist so the sources stay runnable under plain `node`
without a transpile step, which is what any future test would depend on:

- **`erasableSyntaxOnly` is on.** `enum`, `namespace`, parameter properties and
  `declare` fields compile under WXT but crash under plain `node`.
- **Imports carry explicit `.ts` extensions**, and WXT's `@/` alias is unused.
  Node's resolver needs the real on-disk filename and knows nothing about the
  alias; Vite resolves `.ts` specifiers without complaint.

If a suite is ever added, the constraints that mattered last time: dispatch the
real event sequence rather than the convenient one (`dblclick` alone hides the
two-clicks-first bug); jsdom events carry no `dataTransfer`; `instanceof` is
realm-sensitive, so jsdom's constructors have to go on `globalThis`, not just
`window` and `document`; and the popup can only be booted once per process.

## Loose ends

- `debounce()` and `formatDate()` in `utils.ts` are exported but unused.
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
