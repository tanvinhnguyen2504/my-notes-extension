# Plan: Memos — developer snippet library

## Goal

Add a second mode to the popup: a **Memos** library of reusable developer
snippets (git commands, SQL queries, shell one-liners, config blocks, plain
notes), each one copyable to the clipboard in a single click, pinnable, and
editable through a type-aware editor. The popup becomes two modes behind a
segmented control — `Tasks` (everything that exists today, unchanged) and
`Dev` (the memo library) — with the last used mode restored on open.

The value is that the things a developer retypes most often are the things they
remember worst: the exact `git` incantation, the join they wrote last sprint,
the `.env` block a new machine needs. A toolbar popup is the right surface
because it is one keystroke away from any tab and needs no account.

## Scope

**In scope**

- `IMemo` promoted from a reserved placeholder to the real `memos` slice type,
  with a per-type `subType` and a `uses` counter.
- `memo.v1` storage slice: a real normalizer, load and save.
- Memo actions in `core/reducer.ts`, addressed **by id** (not by index).
- Page-level state lifted out of `TasksPage` into `PopupPage`.
- A persisted popup mode, stored on the `settings` slice.
- The library view: filter chips, `PINNED` / `RECENT` groups, rows with a
  copy button, empty state.
- Search footer with `/` to focus and `Esc` to clear, plus arrow-key row
  navigation.
- The editor view: type pills, title, per-type option row, dark code body with
  a line count and per-type hint, secret-pattern warning, pin toggle, and a
  live library preview.
- Edit, delete (with inline confirm) and right-click pin toggle.
- Memo-type design tokens in `styles.css`, light and dark.
- `@/` alias adopted across `src/`, and `CLAUDE.md` corrected to match reality.

**Out of scope**

- Tags and variables fields on a memo. `memo.md` §3 forbids these explicitly.
- Any migration of the legacy `checklist.v1` key. It stays inert, as today.
- Seeding six example snippets on first run (`memo.md` §2). The mockup HTML that
  defines them is not in the repo — see Open questions.
- Bundling DM Sans / JetBrains Mono as web fonts — see Open questions.
- Syncing memos across devices, sharing, or import/export. CSV export stays
  tasks-only.
- Touching the reminder window. `ReminderPage` is tasks-only and stays that way.

## Architecture / Design decisions

**`memo.md` is a spec for a codebase that no longer exists.** It describes
"plain HTML/CSS/JS: no framework, no build step, no npm", and names `popup.css`,
`dev.js`, `storage.js` and `extension/`. This repo is WXT 0.21 + React 19 +
Radix + Tailwind v4. The resolution used throughout this plan: **`memo.md`'s
design system (§0) and behaviour specs (§1–§6) are the contract; its file-layout
instructions are translated** into the existing `core ← storages ← components`
layering. Every deliberate deviation is called out in the phase that makes it.

**Memos address by id; tasks address by index.** Every existing task action
carries an `index` into `state.tasks`, which works because the task list renders
in array order. The memo library does not: it is filtered by chip, filtered by
search, split into two groups and sorted by `updatedAt`. A rendered position
carries no information about the array, so every memo action takes `id: string`.
This is a genuine asymmetry in the reducer and is intentional.

**`subType` is clamped by the normalizer, not encoded in the type.** The
alternative — making `IMemo` a discriminated union over `type` so that only a
`DATABASE` memo can hold `POSTGRESQL` — would force a narrow at every call site
that renders a row generically, which is most of them. Instead `IMemo` stays
flat with `subType: MemoSubType`, and a `MEMO_SUBTYPES: Record<EMemoType,
readonly MemoSubType[]>` map is the single source of which values are legal for
which type. `normalizeMemos` consults it and falls back to the type's first
entry. This follows the house rule that **the slice normalizer is the type
boundary** — if a shape cannot be proven, the fix goes in the normalizer.

**Page-level state moves to `PopupPage`.** Today `TasksPage` owns the reducer,
`loadState()`, the `chrome.storage.onChanged` listener and the effect that
writes `data-theme` / `data-width` onto `<html>`. Radix `Tabs` unmounts the
inactive panel, so as written: opening on the Memos tab never applies the saved
theme, and every tab switch re-runs `loadState()` and replaces state wholesale.
`PopupPage` takes all four over and passes `state` + `dispatch` down. `TasksPage`
and `MemosPage` become presentational consumers.

**Mode is a `settings` field, not a fourth storage key.** `memo.md` §1 says
"persist the last mode under `checklist.mode`". A fourth key would need its own
normalizer, its own load, and its own branch in `persistChanged`, to hold one
string that is already a view preference sitting beside `theme` and `width`. So
`Settings` grows `mode: PopupMode`. Consequence worth knowing: switching tabs
now writes `settings.v1`, and `background.ts` re-syncs the reminder alarm on
every storage write — which is safe only because `syncAlarm()` compares the
existing alarm against the computed time and leaves a match alone.

**Memo persistence is free, if the reducer behaves.** `persistChanged` writes a
slice when its **reference** changed. Every memo case must return a new `memos`
array and a new memo object. A case that mutates in place writes nothing *and*
skips the re-render — one mistake with two invisible symptoms.

**Type colours become `@theme` tokens.** `memo.md` §0 gives the dot palette as
raw `oklch()` values, and the scaffold's `constants.ts` currently holds Tailwind
palette classes (`background-blue-200`, which is not a real utility — `bg-` is
the prefix). Both violate the one rule that keeps this design themeable: colour
values live in `@theme` only. The palette lands as `--color-type-*` tokens and
`constants.ts` maps a type to the generated utility names.

**The secret scan lives in `core/`.** `looksLikeSecret(body)` is a pure function
of a string, so it belongs beside the other pure helpers — not inside the editor
component. It goes in a new `core/memo_utils.ts`, alongside `touchMemo()`,
mirroring `touchItem()`.

## Phases

| Phase | File | What it delivers |
|-------|------|-----------------|
| 1 | `plan-1-alias-migration-and-doc-update.md` | `@/` alias across `src/`; `CLAUDE.md` corrected on aliases, enums and `erasableSyntaxOnly`. No behaviour change. |
| 2 | `plan-2-memo-domain-model-and-storage.md` | Final `IMemo`, the sub-type maps, a real `normalizeMemos`, `core/memo_utils.ts`, and the memo cases in the reducer. |
| 3 | `plan-3-lift-state-and-mode-switch.md` | Reducer, storage, listener and theme effect moved to `PopupPage`; `Tab.tsx` repurposed as the real segmented control; `mode` persisted. |
| 4 | `plan-4-memo-type-tokens.md` | `--color-type-*`, code-block and warning tokens in both themes; `constants.ts` and `MemoLabel` wired to them. |
| 5 | `plan-5-library-view.md` | `MemosPage`: filter chips, `PINNED` / `RECENT` cards, `MemoRow` with a working copy button, empty state. |
| 6 | `plan-6-search-and-keyboard.md` | Search footer, `/` focus, `Esc` clear, combined chip+query filtering, arrow-key row focus. |
| 7 | `plan-7-memo-editor.md` | The New-memo editor: type pills, title, per-type option row, code body, secret warning, pin toggle, live preview. |
| 8 | `plan-8-edit-delete-and-dark-pass.md` | Open editor from a row, delete with inline confirm, right-click pin, full dark-theme pass, focus rings, reduced-motion guard. |

## Success criteria

- `npm run check` exits clean after every phase.
- `npm run build` produces `.output/chrome-mv3/`, and loading that folder at
  `chrome://extensions` shows the segmented control in the popup header.
- Closing the popup on the Dev tab and reopening it lands on the Dev tab, in
  the correct saved theme.
- Creating a memo, closing the popup and reopening it shows the memo. The value
  under `memo.v1` in `chrome.storage.local` is an array of complete `IMemo`
  objects.
- Ticking a task in the reminder window while the popup is open on the Tasks tab
  still updates the popup — the `onChanged` listener survived the move.
- Clicking a row's Copy button puts `content` on the clipboard, flips the button
  to a teal `✓ Copied` for 1.2s, and increments that memo's `uses`.
- Typing `AWS_SECRET_KEY=abc123` into the editor body shows the amber warning;
  removing it hides the warning again.
- Saving a memo with an empty title stores `Untitled <type>`; saving with an
  empty body is refused.
- Switching the editor's type replaces the example body **only** when the user
  has not edited it.
- Every new surface is legible in `html[data-theme="dark"]`, and no `.tsx` file
  added by this work contains a colour literal.
- `grep -rn "from '\.\./" src/` returns nothing after phase 1.

## Open questions

- **The mockup HTML is not in the repo and the design link 403s.** `memo.md`
  references `Developer Mode Mockups.dc.html` (screens 1a, 1b, 2a) and
  `extension/DEV-MODE-PLAN.md`; neither exists here, and
  `claude.ai/design/p/865d1cdb…` is not fetchable. §0's token list is complete
  enough to build from, but two things depend on the file: the six seed snippets
  (§2) and the exact pixel geometry of screens 1a/2a. **Saving the `.dc.html`
  into the repo would unblock both.** Until then, seeding is out of scope and
  the layout follows §0's numbers.
- **Fonts.** §0 asks for DM Sans (UI) and JetBrains Mono (code/meta); `body`
  currently sets `Arial, sans-serif`. An extension page cannot pull Google Fonts
  under the default MV3 CSP, so this means either bundling four font files in
  `public/` and writing `@font-face`, or using a system stack. Phase 4 assumes a
  system stack behind a `--font-mono` token; switching to bundled faces later is
  a token change plus the files.
- **Six-type question deferred, not closed.** `NOTE` is being added, so the five
  types are `GIT`, `DATABASE`, `SHELL`, `CONFIG`, `NOTE`. `memo.md` §0's dot
  palette names `sql` where this plan says `database`; the token is named
  `--color-type-database` with §0's `sql` value.
- **Two filenames do not match their contents** and both are left alone, since
  no file you created may be removed: `src/components/MemoPage.tsx` exports
  `MemosPage`, and `src/components/memos/MemoCreatNewGit.tsx` is missing an `e`
  in `Create`. Both are safe `git mv` + import-update operations if you want
  them done — say so and they fold into phase 1.
- **`body` is a fixed `380×520` with `overflow: hidden`.** §0 describes "height
  grows with content, max 600px", which this codebase already diverged from
  deliberately (a growing popup put the compose row out of reach). The editor
  view is tall, so it must scroll **inside** `main` rather than grow the body.
  Phase 7 assumes that; revisit only if the editor feels cramped at 520px.
- **`uses` is being added to `IMemo`** because §2 increments a use count on
  copy, but nothing in §1–§6 ever *displays* it (one of the vibe prompts does).
  It is stored and unread until then.
