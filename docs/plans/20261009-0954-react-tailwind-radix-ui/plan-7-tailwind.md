# Phase 7 — Tailwind, dismantling `popup.css`

## Goal

Move the 28 design tokens into Tailwind's `@theme` and replace the ~40 component
classes with utilities on the components, with zero visual change.

## Tasks

- [x] `src/styles.css`: `@import "tailwindcss";` then an `@theme` block holding
      the 28 custom properties from `popup.css`'s `:root`, renamed to Tailwind's
      namespaces so they generate utilities — `--color-bg`, `--color-surface`,
      `--color-ink`, `--color-teal`, `--color-pri-high`, `--color-tag-high-bg`
      and so on.
- [x] Port the dark theme as a plain CSS block overriding the same properties
      under `html[data-theme="dark"]`. **Not** Tailwind's `dark:` variant: the
      theme is an explicit attribute the app sets from saved state, not a media
      query, and redefining the tokens means every utility follows without a
      single `dark:` prefix anywhere.
- [x] Point both HTML entrypoints at `src/styles.css`.
- [x] Convert component by component, in dependency order — leaf components
      first (`NoteRow`, `DueChip`, `SettingSwitch`), containers last (`PopupPage`,
      `Header`). Delete each class from `popup.css` as its last user goes, so the
      file shrinks monotonically and anything left at the end is genuinely
      orphaned.
- [x] Port the data-attribute rules to variants:
      `data-[done=true]:line-through`, `data-[priority=2]:bg-tag-high-bg`,
      `data-[overdue=true]:text-pri-high`, `data-[unset=true]:opacity-60`,
      `data-[armed=true]:bg-pri-high`, and `data-[width=wide]:` on the root.
- [x] Style Radix from its own attributes the same way:
      `data-[state=checked]:`, `data-[state=open]:`, `data-[highlighted]:`.
- [x] Keep anything genuinely global in CSS rather than forcing it into
      utilities: the `:root`/`@theme` block, the `html[data-theme="dark"]`
      override, the popup's fixed body width, scrollbar styling, and any
      `::selection` or focus-visible defaults.
- [x] Delete `src/popup.css` once empty.
- [x] `npm run check` and a build; confirm one CSS asset is emitted and both
      pages link it.

## Implementation notes

- **No hex literal may appear in a `.tsx` file.** Tokens live in `@theme` and
  are referenced through generated utilities. This is the single rule that keeps
  the design themeable; it is also the rule a Tailwind migration most commonly
  breaks, because inlining one colour is always easier than naming it.
- Tailwind v4 needs no `tailwind.config.js` and no `content` globs — it scans
  automatically. Do not create one out of habit; a stray config file changes
  behaviour in ways that are hard to trace back.
- The data-attribute values must stay **strings**. `data-done={String(item.done)}`,
  not `data-done={item.done}` — React omits a `false` attribute entirely and
  `data-[done=false]:` would stop matching. Phase 4 already requires this; it
  becomes load-bearing here.
- Dismantling leaf-first matters: converting `PopupPage` early leaves its
  children styled by CSS rules whose cascade has shifted, and the resulting
  visual drift is hard to attribute. One component per step, visual check after
  each.
- `.dragging`, `.drop-before`, `.drop-after` and `.drop-into` are applied by
  `classList` from the drag hook, not by rendering, so they **cannot** become
  utilities — a utility class string is not something `classList.add()` can
  compose meaningfully. Keep these four as real CSS classes in `src/styles.css`.
  This is the one place the Tailwind conversion stops, and it is a correctness
  constraint, not a preference.
- `.edit` is applied to an input created by React but styled while replacing a
  label; check it has no sibling-selector dependency on `.text` before
  converting.
- Expect the CSS asset to shrink (Tailwind emits only what is used) while the
  JSX grows. Record both in phase 8 rather than claiming a win from one.
- This phase has the weakest safety net in the plan: no compiler, no test, only
  the eye. Work in small steps and keep the pre-migration popup open beside it.

## Verify

Side-by-side visual comparison against the `pre-react` tag's build, in both
themes and both widths. Load the old build in one window and the new in another.

- Every row state: done and not-done; all three priorities; with and without a
  due date; overdue; unscheduled.
- Every group label: `TODAY`, `TOMORROW`, `YESTERDAY`, `OVERDUE`, `UPCOMING`,
  `UNSCHEDULED` — each has its own styling in the current CSS.
- Header: the mark-all button in both directions, the clear button armed and
  unarmed, the export and settings chips, their disabled states on an empty
  list.
- Progress bar at 0%, part-way, and 100%.
- The priority menu: all three swatches, the checked tick, the highlighted item
  under keyboard focus.
- Settings: all three switches on and off, the reminder time input, the hint
  text.
- Empty state and the reminder page's "All clear" state.
- The inline editor while open.
- All four drag states: `dragging`, `drop-before`, `drop-after`, `drop-into`.
- Wide mode: the popup widens and the task text wraps.
- Dark mode for every item above, and a theme toggle without a reload.
- `grep -rn "#[0-9a-fA-F]\{3,6\}" src --include="*.tsx"` returns nothing.
- `src/popup.css` is gone and nothing references it.

## Outcome

Done, with deviations worth recording.

**`@import "tailwindcss"` was not used.** Preflight would reset every element on
the way in, against the zero-visual-change premise. `theme.css` and
`utilities.css` are imported directly, so the `*`, `body` and `button` rules in
`styles.css` stand in for the reset. One consequence: any utility that assumes
Preflight needs care. `border-b` happens to be safe because Tailwind v4 declares
`@property --tw-border-style` with `initial-value: solid`.

**Four component classes survive as bare hooks**, not by oversight: `row`,
`text`, `compose` and `group-head`. `html[data-width="wide"] .text`,
`body.reminder .text`, `body.reminder .row` and `body.reminder .compose` are
descendant rules whose condition lives on `<html>`/`<body>`, outside the React
root, and an ancestor selector cannot reach into a utility. `group-head` survives
for the same reason the four drag classes do -- `useDragDrop` adds `drop-into` to
it. Being unlayered, all of these beat the utilities layer regardless of
specificity, which is what an override needs to do.

**The CSS asset grew rather than shrank** -- 12.7 kB to 19.2 kB raw, 4.1 kB
gzipped. The phase 7 note predicted a shrink; it was wrong for this codebase.
There are ~14 components with almost no repetition between them, so one verbose
escaped selector per declaration costs more than the ~40 hand-written rules it
replaced. The popup payload went 341 kB / 104 kB gzipped to 348 kB / 108 kB.

**Ordering had to become explicit.** Several old rules relied on source order at
equal specificity -- the done-state tag colour sat below the three priority
colours deliberately, with a comment saying so. Tailwind sorts utilities by
property rather than by the order they are written, so every such pair is now
stated as mutually exclusive conditions
(`group-data-[priority=2]:group-data-[done=false]:`), and the chip's armed
colour is scoped `data-[armed=false]:hover:` so it wins by specificity. This is
strictly more robust than what it replaced.

### Also fixed on the way through

- An orphaned, broken `.priority-label` block (two `1px solidr` typos,
  `font-size: 12rem`, raw `red`/`blue`/`green`) that nothing rendered.
- Dead rules: `.dot`, `.box.ghost`, `.menu[hidden]`, `.setting[hidden]`.
- `.switch[aria-checked]` and `.menu-item:focus-visible` now key off Radix's own
  `data-state` and `data-highlighted`. The second was a latent bug: Radix
  focuses menu items programmatically, where `:focus-visible` is a browser
  heuristic rather than a guarantee.
- `.menu`'s `position: fixed` removed -- Radix's Popper already positions the
  portalled wrapper, and a second fixed element inside it fights the collision
  handling `sideOffset`/`collisionPadding` ask for.
- Five comments still naming the deleted `popup.css`.

### Verified automatically

- All 32 converted state rules are present in the emitted CSS, checked by
  grepping the build output.
- A `renderToStaticMarkup` pass pins the 12-point markup contract the remaining
  CSS depends on: the four surviving class hooks, and every data attribute
  rendered as a string.
- `grep -rn "#[0-9a-fA-F]\{3,6\}" src --include="*.tsx"` returns nothing.

### Still to verify by eye

The side-by-side comparison above has not been run; it needs two browser windows
and a human. Riskiest items in order: the priority menu's position and flip (the
`position: fixed` removal), the keyboard-highlighted menu item, the switch knob
transition, and wide mode's text wrapping.
