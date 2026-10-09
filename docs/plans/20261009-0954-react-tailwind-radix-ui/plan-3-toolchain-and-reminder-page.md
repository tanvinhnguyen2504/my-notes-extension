# Phase 3 — React toolchain, proved on the reminder page

## Goal

Install React and Tailwind, and convert the 117-line reminder page to a React
root — the cheapest page on which to prove the whole stack works.

## Tasks

### Spike first (scratchpad, ~20 minutes)

- [ ] Scaffold a throwaway WXT + React project and confirm, before touching this
      repo: `@wxt-dev/module-react@1.2.2` works with WXT 0.21.4 and React 19.3;
      a `.tsx` entrypoint still emits flattened to the output root; and
      `@tailwindcss/vite@4.3.3` composes with WXT's Vite config.
- [ ] Specifically check what the React module does to `tsconfig.json` — it may
      want `jsx: "react-jsx"` and may regenerate `.wxt/tsconfig.json`, which
      this repo overrides with `erasableSyntaxOnly` and
      `verbatimModuleSyntax: false`. Confirm the overrides survive.

### Install

- [ ] `npm i react@19.3.0 react-dom@19.3.0`
- [ ] `npm i -D @types/react @types/react-dom @wxt-dev/module-react@1.2.2 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3`
- [ ] `wxt.config.ts`: add `modules: ["@wxt-dev/module-react"]` and
      `vite: () => ({ plugins: [tailwindcss()] })`.
- [ ] Keep `imports: false`. React is an explicit import like everything else.

### Reminder page

- [ ] `entrypoints/reminder.html`: replace the markup body with
      `<div id="root"></div>` and point the script at `../src/reminder.tsx`.
      The `<link>` to `../src/popup.css` stays — Tailwind does not arrive until
      phase 7.
- [ ] `src/reminder.tsx`: a root that mounts `<ReminderPage />`, replacing
      `src/reminder.ts`.
- [ ] `src/components/NoteRow.tsx`: the **presentational** row — flag, box, text,
      optional due chip, priority tag. Takes `item` plus render-affecting props
      only. No handlers of its own beyond what is passed in.
- [ ] `src/components/ReminderPage.tsx`: loads state in an effect, filters
      undone, sorts by priority, renders the count, the rows, or the "All clear"
      empty state.
- [ ] Port the one-way tick: clicking the box sets `done: true`, saves, re-renders.
      Use the phase-2 reducer's `TOGGLE_DONE`, and keep it one-way — the reminder
      window has never un-ticked.
- [ ] Port Escape-to-close and the dismiss button.
- [ ] Set `data-theme` on `documentElement` from loaded state, as today.
- [ ] Delete `src/reminder.ts`.
- [ ] `npm run check`.

## Implementation notes

- **This phase is the beachhead on purpose.** 117 lines against the popup's 411,
  no drag, no menus, no editing, no settings. If `@wxt-dev/module-react` and the
  flattened-output behaviour have a surprise in them, this is where it should
  surface.
- `NoteRow` is presentational and the interactive behaviour lives in wrappers. The
  reminder row has no drag, no delete, no editing, and a one-way box; the popup
  row has all four. A single `NoteRow` carrying five booleans to switch those on and
  off would be worse than two components — so `NoteRow` renders, and
  `src/components/PopupRow.tsx` (phase 4) wraps it with handlers. Revisit this
  split in phase 4 and collapse it if it is not paying.
- The old architecture rule said _`reminder.ts` never imports `popup.ts`_,
  because `popup.ts` wired itself at module load. That reason is gone, but the
  **constraint should hold in spirit**: the shared `NoteRow` must not pull in
  popup-only wiring. Enforce it structurally by keeping `NoteRow` free of any
  reducer dispatch, any drag hook and any Radix import.
- `src/core/dom.ts` is still used by `popup.ts` at this point. It gets deleted in
  phase 4, not here.
- Node's native type-stripping does not handle JSX, so from this phase on only
  `src/core/` is runnable under plain `node`. Note it; it is why the reducer
  lives there.
- Expect the bundle to jump sharply here — React arrives for a page that is a
  list and two buttons. That is expected and is the cost the budget in phase 8
  measures; do not try to optimise it in this phase.

## Verify

The reminder page cannot be triggered on demand without waiting for an alarm, so
drive it directly:

- `npm run build`, load `.output/chrome-mv3/`, then open the reminder page by its
  extension URL (`chrome-extension://<id>/reminder.html`) rather than waiting for
  the alarm.
- Seed `chrome.storage.local` with a mix of done/undone and HIGH/MEDIUM/LOW
  items, including one with `dueDate: null` and one legacy item with
  `updatedAt: null`.
- Confirm against the pre-migration page, side by side if possible: the count
  text, the priority order, the tag labels, the due chip appearing only when
  `dueDate` is set, the `data-priority` attribute on each row, and the "All
  clear" state when nothing is outstanding.
- Tick an item: it leaves the list, the count drops, and storage is written.
- With the popup open in another window, tick an item here and confirm the popup
  still picks it up — the `chrome.storage.onChanged` path, which this phase must
  not break.
- Escape and the dismiss button both close the window.
- Dark mode: set `theme: "dark"` in storage and confirm the page honours it.
- Service-worker console clean; `npm run check` clean.
