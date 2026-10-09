# Phase 8 — Bundle budget and the documentation this invalidated

## Goal

Measure the bundle against its budget, and correct every document that describes
the imperative UI.

## Tasks

### Budget

- [ ] Record the final figures: popup JS, reminder JS, background JS and CSS,
      raw and gzipped. Baseline to compare against is the pre-migration
      **27.6 kB** of code and CSS (popup chunk 10.19 kB, reminder 1.51 kB,
      background 1.46 kB, wxt-plugins 4.60 kB, dom 926 B, CSS 8.95 kB).
- [ ] Break the growth down per dependency — React/react-dom, each Radix
      package, Tailwind's emitted CSS — using the per-phase deltas recorded in
      phases 3, 5 and 7. One aggregate number cannot be acted on.
- [ ] Check against the budget in `plan.md`: **under 180 kB raw / 60 kB gzipped**
      for popup JS + CSS. If it is over, say so plainly rather than adjusting the
      budget.
- [ ] Measure popup open latency on a cold profile — click the toolbar icon and
      watch for a visible blank frame. This is the only user-facing regression
      risk in the whole plan, and it is the reason the budget exists.
- [ ] If latency is visible, record the options rather than acting: lazy-import
      the settings panel and the priority menu, or drop Radix's collapsible for a
      conditional render. Do not optimise speculatively.
- [ ] Confirm the generated manifest still differs from the pre-migration one
      only by asset filenames — no new permission, no host permission, the same
      four icon sizes, `background.type: "module"`.

### `CLAUDE.md`

- [ ] Opening: the stack sentence gains React 19, Tailwind v4 and Radix. The
      `.output/chrome-mv3/` and flattened-entrypoint paragraphs stay true as-is.
- [ ] Layout table: add `src/components/`, `src/hooks/`, `src/core/reducer.ts`,
      `src/styles.css`; remove `src/core/dom.ts`, `src/ui/menu.ts`,
      `src/ui/drag-drop.ts`, `src/popup.css`, `src/features/priority.ts`,
      `src/features/due-date.ts`, `src/features/settings.ts`.
- [ ] Architecture rules: `utils.ts` stays DOM-free (unchanged, and now also the
      reason the reducer lives beside it); `drag-drop` never touching the list
      becomes the hook reporting through callbacks; `reminder.ts never imports
    popup.ts` becomes the narrower rule that the shared `NoteRow` must stay free of
      reducer dispatch, drag wiring and Radix imports; add that **every list row
      carries `key={item.id}`** and why.
- [ ] Replace the `render()` rebuilds-every-row rule. The opposite is now true,
      and the new rule worth stating is that nothing may render during a drag —
      which is now achieved by refs rather than by avoiding re-render.
- [ ] **Traps: rewrite, do not delete.** Four entries — the `.body` catch-all,
      single-click-vs-double-click, never-re-render-during-a-drag, and
      module-level `getElementById` — must keep their explanation and gain a line
      saying this no longer applies and what made it stop applying (stable keys,
      per-element handlers, no module-level DOM). The reasoning is the valuable
      part and a future reader needs to know why the shape of the code is what it
      is.
- [ ] Add new traps: React omits `data-x={false}` so data attributes must be
      strings; Radix portals its content outside the React root, so `data-theme`
      has to be on `documentElement`; an effect that saves on every state change
      writes back the state that just arrived from `chrome.storage.onChanged`;
      `classList` manipulation in the drag hook is only safe because nothing
      renders mid-drag.
- [ ] Data model: document `Item.id` — what it is for, that it is backfilled by
      `normalizeState`, and that it is _not_ the addressing scheme.
- [ ] Conventions: `.tsx` for components, `.ts` for everything else; no hex
      literals outside `@theme`; data attributes as strings.
- [ ] Testing: note that Node's native type-stripping no longer covers
      components, so only `src/core/` is runnable under plain `node` — which is
      why the reducer is there. `npm run check` remains the only committed gate.

### `README.md` and `CHANGELOG.md`

- [ ] `README.md`: rewrite the Project layout table and its opening paragraph.
      The install and build instructions are unchanged, which is worth
      confirming by following them from a clean clone.
- [ ] `CHANGELOG.md`: one entry. Note explicitly that there is no user-visible
      change, and record the bundle growth as a known cost.
- [ ] Bump the version once the open question in `plan.md` is settled.

## Implementation notes

- Do the `CLAUDE.md` pass by reading the file end to end, not by search and
  replace. Roughly a third of it describes the imperative UI, and half its value
  is the reasoning behind the rules — which mostly survives. The failure mode is
  deleting a correct explanation because the sentence around it changed.
- The trap rewrites are the most valuable part of this phase. "This used to bite,
  here is why, here is why it cannot now" tells a reader more than an absent
  entry, and it is the only thing stopping someone reintroducing a `.body`
  catch-all handler because it looked convenient.
- Be straight about Tailwind in the docs. It did not solve a problem this
  codebase had; Radix and React's reconciliation did. A changelog that claims
  otherwise will mislead whoever reads it next.
- Budget numbers go in `CHANGELOG.md`, not just in a commit message. The cost of
  this migration is permanent and should be findable.

## Verify

- `npm run check` clean; `npm run build` clean; `.output/chrome-mv3/` loads with
  no errors in the popup or service-worker console.
- Measured bundle figures recorded, and either inside the budget or explicitly
  called out as over it.
- Follow `README.md` literally from a fresh clone in a scratch directory and
  confirm it produces a loadable extension with no undocumented step.
- Read `CLAUDE.md` end to end: every file in the layout table exists, every path
  resolves, and no sentence describes the pre-React UI as current.
- `grep -rn "render() rebuilds\|catch-all click handler\|getElementById" CLAUDE.md`
  returns only the rewritten historical entries, each carrying its "no longer
  applies" line.
- Full manual pass of the behaviour list in `plan.md`'s success criteria, in both
  themes and both widths, as the final gate.
