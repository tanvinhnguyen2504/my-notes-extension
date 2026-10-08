# Plan: TypeScript migration on a WXT build

## Goal

Move this extension from hand-written ES modules loaded directly by Chrome to
TypeScript compiled by [WXT](https://wxt.dev), with `strict` on from the first
commit. The payoff is specific to the traps this codebase already documents:
the `data-priority` / `data-key` attribute contracts, the `PRIORITY.*`
constants, the `{ items, theme, settings }` state shape, and the day-key vs.
timestamp distinction are all currently enforced by comments in `CLAUDE.md` and
by nothing else. Typing the model turns the most load-bearing of those comments
into compiler errors. WXT is what makes that affordable: it owns manifest
generation, the dev-reload loop, and the TS config, so the migration does not
also become a bundler project.

**Stated concern, not a blocker.** The repo's current identity is "no build
step, no framework, no dependencies" — the folder you point `chrome://extensions`
at *is* the source. WXT ends that: there will be a `node_modules`, a generated
manifest, and an `.output/` directory that is the only thing Chrome can load.
That is a real and permanent cost, and it is the right trade only if typed state
and a dev-reload loop are worth more than direct-load simplicity. The user chose
WXT with that in view, so this plan delivers it in full.

## Scope

**In scope**

- WXT as the build tool: `wxt.config.ts`, `entrypoints/`, `.output/chrome-mv3/`.
- `manifest.json` deleted; its contents move into `wxt.config.ts`'s `manifest` key.
- Every `src/**/*.js` file converted to `.ts` under full `strict`.
- Real types for `Item`, `State`, `Settings`, `Priority`, `Theme`, `Width`,
  `DayKey`, `TimeOfDay`, exported from a new `src/core/types.ts`.
- `@types/chrome` for the `chrome.*` surface, so no call site changes.
- A decided, documented answer for the module-level `getElementById` pattern.
- The jsdom verification scripts kept working — now against `.ts` sources.
- `CLAUDE.md`, `README.md`, and `CHANGELOG.md` updated for the new layout,
  the new load path, and the rules the type system now enforces.

**Out of scope**

- Any behaviour change. The built extension must do exactly what today's does,
  including the known-unfixed `loadState()` race and the unconfirmed IME
  duplicate-`Enter` issue. Both stay as they are, with their comments.
- Adding a test framework. Verification stays "drive the real files in jsdom",
  as `CLAUDE.md` describes.
- Fixing the `.body` catch-all click handler, the `debounce()`/`formatDate()`
  loose ends, or any other item under "Loose ends" / "Traps". Those are separate
  decisions and mixing them in would make the migration diff unreviewable.
- Firefox / `chrome-mv2` targets. WXT can produce them; nothing here asks for it.
- Publishing. `wxt zip` exists and is worth knowing about, but store submission
  is not part of this.

## Verified by spike (WXT 0.21.4, 2026-10-08)

Before executing, the plan's risky assumptions were tested in a throwaway
project mirroring this repo's shape. Results, because they changed the plan:

| Assumption | Result |
| --- | --- |
| HTML entrypoints flatten to the output root | **Holds.** `entrypoints/popup.html` → `.output/chrome-mv3/popup.html`; same for `reminder.html`. `action.default_popup` generated automatically. |
| `src/` can sit beside `entrypoints/` | **Holds on default config.** No `srcDir` or `entrypointsDir` needed. |
| A shared `<link href="../src/popup.css">` from both pages | **Holds.** Vite extracts one `assets/popup-*.css` and links it from both. |
| `node verify/*.ts` runs the real sources | **Holds.** No build, no stubs, `window` undefined. |
| `erasableSyntaxOnly` catches `enum` | **Holds.** `TS1294`. |
| `allowJs` lets a `.js` file import a `.ts` file | **Holds.** Phase 1 can ship zero TypeScript. |
| chrome types come from WXT | **False.** WXT 0.21 ships no global `chrome` — its own API is `browser` from `wxt/browser`. `tsc` gives `TS2304: Cannot find name 'chrome'`. Fixed by `@types/chrome`, which keeps every existing `chrome.*` call site unchanged. |
| `defineBackground` is importable | **Needs config.** It is a WXT *auto-import*, so an entrypoint using it is not `node`-importable — which Phase 4's `verify/background.ts` requires. Fixed by `imports: false` plus `import { defineBackground } from "wxt/utils/define-background"`. Verified: build works and the verify script can call `.main()` and assert listener registration. |

`imports: false` is the right default for this codebase independently of
testability: nothing else in it is magic, and an auto-imported global would be
the first identifier here that cannot be found with `grep`.

Also simpler than planned: `.wxt/tsconfig.json` already sets `strict`,
`noUncheckedIndexedAccess`, `allowImportingTsExtensions`, `verbatimModuleSyntax`
and `moduleResolution: Bundler`. Our `tsconfig.json` adds only `allowJs`,
`checkJs` and `erasableSyntaxOnly`. Its `include: ["../**/*"]` means `verify/`
is type-checked without extra configuration.

## Architecture / Design decisions

### WXT's output flattens HTML entrypoints — the runtime paths survive

`CLAUDE.md` currently warns that `popup.html` and `reminder.html` must stay at
the repo root, because `default_popup` in the manifest and
`url: "reminder.html"` in `background.js` are unchecked path strings that fail
only at runtime. WXT resolves this collision rather than forcing a choice:
an HTML entrypoint at `entrypoints/popup.html` is emitted as
`.output/chrome-mv3/popup.html` — flattened to the output root. Same for
`entrypoints/reminder.html` → `reminder.html`.

So `chrome.windows.create({ url: "reminder.html" })` keeps working **unchanged**,
and `default_popup` is written by WXT itself from the entrypoint's existence. The
`CLAUDE.md` constraint is not violated; it is relocated. What replaces it is a
new and equally silent trap: the root that matters is now `.output/chrome-mv3/`,
not the repo root, and a page added under `src/` instead of `entrypoints/` is
simply never emitted.

### Node 26 strips types natively — this is the whole verification story

Verified in this environment before writing the plan:

```
$ node -v
v26.4.0
$ cat r.ts
import { x } from "./m.ts";
console.log("stripped ok", x);
$ node r.ts
stripped ok 1
```

No flag, no transpile step, no `tsx`. That means `CLAUDE.md`'s testing recipe
survives the migration almost verbatim — `await import("../src/core/utils.ts")`
works in a plain `node` script, and `utils.ts` can still be exercised with no
`window` at all, which is the service-worker case worth testing.

Two constraints follow, and they are not optional:

1. **`erasableSyntaxOnly: true` in `tsconfig.json`.** Node strips types; it does
   not *execute* TypeScript. `enum`, `namespace`, parameter properties, and
   `declare` fields are non-erasable and would make the file crash under plain
   `node` while compiling fine under WXT. The flag turns that runtime surprise
   into a compile error.
2. **Import specifiers carry explicit `.ts` extensions**, with
   `allowImportingTsExtensions: true`. Node's resolver needs the real on-disk
   filename; Vite (and therefore WXT) resolves `.ts` specifiers without
   complaint. The alternative — WXT's `@/` alias — is invisible to `node` and
   would break every verification script.

This is the reason `PRIORITY` must stay a `const` object with a derived union
type and must **not** become a TS `enum`, which happens to also preserve the
existing `PRIORITY.*`-never-bare-`0`/`1`/`2` convention exactly.

### The state model is typed at the boundary, not everywhere

`normalizeState()` is already "the single gate for anything read from storage".
That makes it the natural type boundary: it takes `unknown` and returns `State`.
Everything downstream can then be strictly typed without a single cast, and the
validation that already exists becomes the type guard that justifies it. No
`as State` anywhere — if `normalizeState` can't prove the shape, the fix is in
`normalizeState`.

`loadState()` returns `Promise<State>`. `saveState(state: State)`. The
`localStorage` fallback branch stays, typed the same way.

Branded-ish aliases for the two string formats that are load-bearing:

```ts
export type DayKey = string;     // "YYYY-MM-DD", documented, see isDayKey()
export type TimeOfDay = string;  // "HH:MM" local, see isTimeOfDay()
```

Plain aliases, deliberately not branded. A real brand (`string & { __day: never }`)
would force a cast at every `<input type="date">` read, which is most of the
call sites — it would add noise at exactly the boundary where `isDayKey()`
already does the checking. The alias buys documentation and self-describing
signatures; the runtime guards keep doing the enforcement.

### `getElementById`: one typed helper, no scattered `!`

Three modules capture elements at import time (`popup.ts` at module top level,
`priority.ts` and `due-date.ts` likewise — the pattern `CLAUDE.md` flags as
making the popup un-rebootable in one process). Under `strict`,
`document.getElementById()` returns `HTMLElement | null`, so every one of those
needs handling.

Decision: a single helper in a new `src/core/dom.ts`, used everywhere:

```ts
export function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`missing element #${id}`);
  }
  return found as T;
}
```

Rejected: `document.getElementById("draft")!` at each site. The `!` is three
characters cheaper and strictly worse here — a missing id currently produces
`Cannot read properties of null`, pointing at the *use*, several frames from the
cause. `el()` names the id in the message at the point of capture, which is
precisely the failure mode `CLAUDE.md` calls out as "fails at runtime with no
error at edit time". The throw also keeps `reminder.ts`'s existing refusal to
import `popup.ts` honest for the same reason it already is.

`dom.ts` is a *separate* file from `utils.ts` on purpose: `utils.ts` stays
DOM-free and service-worker-importable, which the plan treats as inviolable.

### Background entrypoint: listeners move inside `main()`

`CLAUDE.md` requires every listener registered at top level so an idle-terminated
worker can be woken for it. WXT changes the *shape* of that requirement without
changing the requirement: `entrypoints/background.ts` must export
`defineBackground({ type: "module", main() { ... } })`, imported explicitly from
`wxt/utils/define-background` (not relied on as an auto-import — see the spike
table), and WXT imports that module at build time in Node to read its options —
so top-level `chrome.*` calls break the build. The listeners go inside `main()`,
which still runs synchronously on every worker startup, so the wake-up guarantee
is preserved.

Getting this backwards fails in opposite directions at opposite times: listeners
outside `main()` break `wxt build`; listeners registered inside an `await` break
the worker silently at runtime. Both are worth a comment in the file.

## Phases

| Phase | File | What it delivers |
|-------|------|-----------------|
| 1 | `plan-1-wxt-build-with-javascript.md` | WXT builds the **existing JS**, unchanged, into a loadable extension. Language untouched. |
| 2 | `plan-2-core-types-and-utils.md` | `src/core/types.ts`, `src/core/dom.ts`, and `utils.js` → `utils.ts` under strict. |
| 3 | `plan-3-ui-and-features.md` | `ui/menu`, `ui/drag-drop`, and all four `features/*` converted. |
| 4 | `plan-4-entrypoints.md` | `popup`, `reminder`, `background` converted; `allowJs` turned off. |
| 5 | `plan-5-verification-and-docs.md` | jsdom scripts promoted into the repo; `CLAUDE.md`, `README.md`, `CHANGELOG.md` corrected. |

Phase 1 exists to separate the two risks. "The extension now needs a build step"
and "the extension is now TypeScript" are independent failure modes, and
debugging them together — a blank popup that could be a manifest path or a type
error — is the thing to avoid. After phase 1 the extension is loadable and
behaviourally identical with zero `.ts` source files; every later phase is a
language change verified against a build that already worked.

## Success criteria

- `npm run build` produces `.output/chrome-mv3/`, which loads in
  `chrome://extensions` with no errors in the service-worker console.
- `npx tsc --noEmit` is clean with `strict`, `noUncheckedIndexedAccess`,
  `erasableSyntaxOnly`, and `verbatimModuleSyntax` all on.
- No `.js` file remains under `src/`; no `any`, no `as State`, no `!`
  non-null assertion on a `getElementById` result anywhere in the codebase.
- `node <script>.ts` can `import` `src/core/utils.ts` with no `window` and no
  `matchMedia` stub present, and `preferredTheme()` returns a theme rather than
  throwing — the service-worker environment check that `CLAUDE.md` names as the
  one worth testing.
- Generated `.output/chrome-mv3/manifest.json` is semantically equal to today's
  hand-written `manifest.json`: `manifest_version` 3, same name/version/
  description, `permissions` exactly `["storage", "alarms"]`, **no** host
  permissions, same four icon sizes in both `action.default_icon` and `icons`,
  `background.type` `"module"`, `action.default_popup` `"popup.html"`.
- Manual pass of the behaviours no type checker can see: add via `!buy milk`
  and via a day token; toggle done; double-click to edit (confirming the
  two-clicks-first path still edits a live row); drag a row within a group;
  drag a row onto another group's header; drag onto `UNSCHEDULED`; CSV export;
  all three settings switches; set the reminder time, confirm a single alarm in
  `chrome://extensions` service-worker inspection and that using the reminder
  window does not push the next day's alarm later.
- Ticking an item in the reminder window still updates an open popup — the
  `chrome.storage.onChanged` path.
- `README.md` and `CLAUDE.md` contain no instruction that tells a reader to load
  the repo root.

## Open questions

- **Where do these plan files live?** `.gitignore` lists `.claudeplans`, but this
  skill writes to `plans/`, which is tracked. Decide whether `plans/` should be
  committed as design history or added to `.gitignore`.
- **Version number.** `manifest.json` says `1.0.3`. A migration with no
  user-visible change argues for `1.0.4`; a change that makes the repo
  unloadable-as-is arguably deserves `1.1.0`. Needs a call before phase 5.
- **Icon naming.** WXT auto-generates the manifest `icons` key from
  `public/icon/{size}.png` — but this repo's files are `icons/icon16.png`, and
  WXT does **not** emit `action.default_icon` at all. Two options: rename the
  files to WXT's convention and get `icons` free, or keep the filenames under
  `public/icons/` and declare both keys explicitly. Phase 1 assumes the second:
  `default_icon` needs declaring either way, the manifest stays diffable against
  the deleted one, and no icon file is touched.
- ~~**Does `src/` survive as a directory?**~~ **Resolved by spike:** yes, on
  default config. `src/` stays the module root with `entrypoints/` beside it, and
  no `srcDir` / `entrypointsDir` setting is needed.
- ~~**`popup.css` ownership.**~~ **Resolved by spike:** keep the `<link
  href="../src/popup.css">` in both pages. Vite extracts one hashed stylesheet
  and links it from both — the shared-CSS arrangement survives untouched, so
  there is nothing to decide.
- **Does the IME `Enter` issue reproduce under the dev-reload loop?** Unrelated
  to types, but `wxt dev` is the first time this codebase gets fast iteration on
  a real browser profile, which is the environment where confirming it becomes
  cheap. Not in scope; noted because the opportunity is new.
