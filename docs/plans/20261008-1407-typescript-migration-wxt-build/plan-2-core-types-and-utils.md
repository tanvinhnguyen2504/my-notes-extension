# Phase 2 — The model types and `core/utils.ts`

## Goal

Convert the 40-export, DOM-free `src/core/utils.js` to TypeScript under full
strict, and give the state model real types that the rest of the migration can
lean on.

## Tasks

- [ ] Create `src/core/types.ts` with: `Priority`, `Theme`, `Width`, `DayKey`,
      `TimeOfDay`, `Item`, `ReminderSettings`, `Settings`, `State`, and
      `DayGroup` (whatever `groupByDay()` actually returns — read it, do not
      guess the field names).
- [ ] Derive the literal unions from the existing const objects rather than
      restating them:
      `export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];`
      and the same for `Theme` and `Width`. Keeps one source of truth and keeps
      `PRIORITY.*` the only way to name a level.
- [ ] Keep `PRIORITY`, `THEME`, `WIDTH` as `as const` objects in `utils.ts`. No
      TS `enum` — non-erasable, so it would break `node utils.ts` and trip
      `erasableSyntaxOnly`.
- [ ] Rename `utils.js` → `utils.ts`; annotate all 40 exports.
- [ ] `normalizeState(saved: unknown): State` and
      `normalizeSettings(saved: unknown): Settings`. These are the type
      boundary — everything inside them narrows `unknown` by hand, everything
      downstream gets a real `State`. No `as State`.
- [ ] Make `isDayKey` and `isTimeOfDay` type predicates
      (`value is DayKey` / `value is TimeOfDay`) so the existing guards narrow
      instead of needing a cast at each call site.
- [ ] Type the storage-availability check. `hasChromeStorage` currently reads
      `typeof chrome !== "undefined" && chrome.storage && chrome.storage.local`;
      under strict this wants to be a `boolean`, not a truthy object.
- [ ] `loadState(): Promise<State>`, `saveState(state: State): void`,
      `preferredTheme(): Theme`, `nextReminderTime(time: TimeOfDay, from?: Date): number`,
      `moveItem(items: Item[], from: number, to: number): Item[]`,
      `touchItem(item: Item): Item` — and the rest in the same spirit.
- [ ] Type `debounce()` generically (`<A extends unknown[]>(fn: (...a: A) => void, wait: number)`)
      even though it is unused. Do not delete it; it is a documented loose end,
      and removing it is a separate decision.
- [ ] Fix whatever `noUncheckedIndexedAccess` surfaces. `sortByPriority`,
      `moveItem`, and the day-key string slicing in `formatDayKey` /
      `shiftDayKey` are the likely sites: indexed reads now yield
      `T | undefined`.
- [ ] Repoint the three importers (`entrypoints/background.js`, `src/popup.js`,
      `src/reminder.js`) at `utils.ts`.

## Implementation notes

- **`utils.ts` must stay DOM-free and worker-safe.** This is the architecture
  rule most at risk in this phase, because strict mode makes `window` annoying
  and the tempting fix is a DOM type import. `preferredTheme()`'s
  `typeof window` guard stays exactly as it is; type the function's return, not
  its environment.
- Do not let `lib: ["DOM"]` in the inherited WXT tsconfig lull you — it makes
  `window` *type-check* inside `utils.ts` while still being `undefined` in the
  service worker at runtime. The guard is the only thing standing between this
  file and a silent worker failure on the empty-storage path, and no compiler
  setting will tell you if it goes.
- `normalizeState` deliberately does **not** backfill `updatedAt`. Type it
  `updatedAt: number | null` and keep the behaviour — a missing stamp renders
  blank rather than claiming a date.
- `dueDate: DayKey | null`. Both the legacy case and a drop on `UNSCHEDULED`
  produce `null`, so this is a genuine nullable, not a migration gap.
- Import specifiers get explicit `.ts` extensions, for the `node`-runnable
  reason in `plan.md`.
- Use `import type { ... }` for type-only imports. `verbatimModuleSyntax` makes
  this mandatory rather than stylistic.

## Verify

- `npm run check` clean.
- `npm run build` succeeds; load the output and confirm the popup still renders
  saved items — this exercises `normalizeState` against real stored data.
- A scratchpad script runs `node` directly against the file with **no** stubs at
  all and no `window`:
  `import { normalizeState, preferredTheme, nextReminderTime } from "../src/core/utils.ts"`
  — asserts `normalizeState(null)` returns a complete state with
  `settings.reminder.time === "09:00"`, `preferredTheme()` returns a `Theme`
  rather than throwing, and `nextReminderTime("09:00", new Date(...))` lands on
  the expected instant. This is the service-worker environment; it is the test
  that matters most in this phase.
- Round-trip: `normalizeState(JSON.parse(JSON.stringify(someRealState)))` is
  deep-equal to the input, confirming no field was lost to a type-driven rewrite.
