# Phase 1 — Adopt the `@/` alias and correct CLAUDE.md

## Goal

Make one import convention true across `src/` and `entrypoints/`, and bring
`CLAUDE.md` back in line with what `tsconfig.json` already does — so that the
next session reading the doc does not "fix" the memo code back.

## Tasks

- [ ] Convert every relative import in `src/` and `entrypoints/` to the `@/`
      alias, dropping the explicit `.ts` / `.tsx` extension:
      `'../core/utils.ts'` → `'@/src/core/utils'`.
- [ ] Leave the three already-aliased memo files as they are — they are already
      in the target style and are the reason it was chosen.
- [ ] `CLAUDE.md`: rewrite the two paragraphs stating that imports carry
      explicit extensions and that "the `@/` alias WXT offers is deliberately
      unused" (they appear twice, near-duplicated — collapse to one).
- [ ] `CLAUDE.md`: in **Architecture rules**, replace the "Never a TS `enum`"
      sentence under *Types are derived, never restated*. Record that
      `erasableSyntaxOnly` is now `false`, that `src/core/types/memos.ts` uses
      real enums, and that the derived-const-object pattern still stands for
      `PRIORITY` / `THEME` / `WIDTH`.
- [ ] `CLAUDE.md`: fix the **Testing** paragraph that justifies explicit
      extensions by "the same files run untouched under plain `node`" — its own
      next sentence already says that route is gone.
- [ ] `CLAUDE.md` **Layout** table: add the rows this feature's scaffold already
      created — `src/core/types/memos.ts`, `src/core/types/day.ts`,
      `src/components/memos/`, `src/components/TasksPage.tsx`,
      `src/components/MemoPage.tsx`, `src/components/Tab.tsx`.

## Implementation notes

`@/` resolves to the **project root**, not to `src/` — confirmed in
`.wxt/tsconfig.json`, which maps `"@/*": ["../*"]` relative to `.wxt/`. So the
correct specifier is `@/src/core/utils`, with the `src/` segment included. A
bare `@/core/utils` will not resolve.

Drop the `.ts` extension when aliasing. `allowImportingTsExtensions` is on so
keeping it would compile, but mixing `@/src/core/utils.ts` and
`@/src/core/utils` across files reintroduces exactly the inconsistency this
phase exists to remove — and the three scaffold files already set the
extensionless precedent.

This phase is **mechanical and behaviour-free**. Do it as its own commit so the
memo work that follows has a readable diff; a feature commit carrying 25 import
rewrites hides whatever else is in it.

`entrypoints/background.ts` is included in the sweep. It is imported by WXT at
build time in Node, but through Vite's resolver, so the alias is fine there —
what breaks `wxt build` is touching `chrome` at module scope, not an alias.

Do not reorder or regroup imports while editing them. The surrounding style is
whatever Prettier produced; one changed token per line keeps the diff reviewable.

## Verify

- `npm run check` exits clean.
- `grep -rn "from '\.\./" src/ entrypoints/` returns nothing.
- `grep -rn "from '\./" src/` still returns the same-directory imports —
  those stay relative; only parent-traversing paths are converted.
- `npm run build` succeeds and `.output/chrome-mv3/` still loads in Chrome with
  the task list working exactly as before. Nothing user-visible changed, so any
  visible difference is a bug introduced by this phase.
