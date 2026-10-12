# Phase 7 — The memo editor

## Goal

Build `memo.md` screen 2a: the editor that replaces the library view when `+` is
pressed — type pills, title, a per-type option row, a dark code body with line
count and hint, the secret warning, the pin toggle, and a live preview of the
row as it will appear in the library.

## Tasks

- [ ] New `src/components/memos/MemoEditor.tsx` — the editor shell and the one
      place the draft lives. Owns a `useState<IMemo>` draft plus a
      `bodyEdited: boolean` flag, and renders: header, type pills, title field,
      the per-type option row via `MemoCreateNew`, the body field, the warning,
      the pin toggle, and the preview.
- [ ] `src/components/memos/MemoCreateNew.tsx`: change the props to
      `{ type, subType, onChange }` and add the `NOTE` case to the switch. Keep
      the existing dispatch shape — it is the right structure.
- [ ] New `src/components/memos/MemoCreateNewNote.tsx`, matching its four
      siblings.
- [ ] `MemoCreatNewGit.tsx`, `MemoCreateNewDatabase.tsx`,
      `MemoCreateNewShell.tsx`, `MemoCreateNewConfig.tsx`: each renders its own
      option row — the §3 label from `MEMO_OPTION_LABELS` and one small mono
      pill per legal sub-type from `MEMO_SUBTYPES[type]`, active pill in a teal
      tint. (`MemoCreateNewDatabase` currently returns the literal string
      `MemoCreateNewGit` — a copy-paste slip to fix while you are in there.)
- [ ] New `src/components/memos/MemoBodyField.tsx`: the dark code textarea —
      `bg-code-bg text-code-ink font-mono text-[11.5px]`, `min-h-[112px]`,
      `resize-y`, `spellCheck={false}`. The label comes from
      `MEMO_BODY_LABELS[type]`, the line count sits on the right, and a one-line
      per-type hint sits below.
- [ ] New `src/components/memos/MemoSecretWarning.tsx`: the amber box using the
      phase-4 `--color-warn-*` tokens, text `"This looks like a password or
      token. Remove it before saving."`, rendered only when
      `looksLikeSecret(draft.content)`.
- [ ] `src/components/memos/constants.ts`: add `MEMO_TITLE_PLACEHOLDERS`,
      `MEMO_BODY_HINTS` and `MEMO_EXAMPLE_BODIES`, one entry per `EMemoType`.
- [ ] `src/components/MemoPage.tsx`: add a `view` state
      (`'library' | 'editor'`) and swap between the list and the editor in
      place — not a new window, per §3. The `+` button from phase 5 sets
      `'editor'`; `←` returns to `'library'`.
- [ ] `src/components/memos/MemoEditor.tsx`: Save dispatches `ADD_MEMO`, flips
      the button to a teal `✓ Saved` for 1.6s, then returns to the library.
      Save is refused on an empty `content`; an empty `label` becomes
      `defaultLabel(type)`.
- [ ] `src/components/memos/MemoEditor.tsx`: the pin toggle as a Radix
      `Switch` (`30×18`, teal when on), reusing the `SettingSwitch` pattern.
- [ ] `src/components/memos/MemoEditor.tsx`: the `PREVIEW IN LIBRARY` footer,
      rendering the **real `MemoRow`** against the draft.

## Implementation notes

**The draft lives in the editor and reaches the reducer exactly once, on Save.**
Dispatching per keystroke would write `memo.v1` on every character and — because
`background.ts` re-syncs the alarm on every storage write — turn typing into a
stream of worker wake-ups. It would also make `Esc`-to-discard impossible, since
there would be nothing to discard. The reducer stays the place state *changes*;
an unsaved draft is not state yet.

**`bodyEdited` is why switching type can swap the example body.** §3: "switching
type swaps in an example body ONLY if the user hasn't edited it." Set the flag on
the body field's first `onChange` and never clear it. Do not try to infer it by
comparing the body against the example map — a user who types the example
verbatim then switches type would have their text replaced, and a user who
deletes everything would not get a fresh example.

**React's `onChange` is the DOM's `input` event, not `change`.** This is already
a recorded trap here: the reminder time field needs its own local draft because a
controlled input bound straight to saved state overwrites partial typing. The
editor's local draft gives every field the same protection for free — which is
another reason not to route keystrokes through the reducer.

**Guard bodies are braced, and `else if` is not a guard clause.** `CLAUDE.md`
records a brace-normalising pass that rewrote `} else if (cond) {` into
`} else { if (cond) {} … }` and thereby made an editor's `settle(false)` run for
every key except `Enter` — one character typed, editor closed, edit lost. The
body field's key handling is the same shape of code. Write the branches flat and
braced.

**Rendering the real `MemoRow` in the preview is the point.** A hand-built
preview drifts from the row the first time the row changes, and a preview that
lies is worse than none. Pass the draft plus a flag that disables the Copy
button, so the preview cannot write to the clipboard or dispatch
`COUNT_MEMO_COPY` against a memo that does not exist yet.

**Switching type must re-clamp `subType`.** The draft's current sub-type is
almost certainly illegal for the new type — `MEMO_SUBTYPES[next][0]` is the
replacement, with the `noUncheckedIndexedAccess` fallback phase 2 already needed
in `newMemo`.

The editor is taller than the `520px` body. It scrolls **inside** `main`, with
the header and the Save button pinned — the body is `overflow: hidden` and a
growing page would simply clip, putting Save out of reach. Same reason the
compose row is pinned in the task list.

Keep the secret warning advisory. §3 does not say it blocks Save, and it should
not: a false positive on a legitimate `token = $1` in a SQL snippet would make
the memo unsaveable with no override.

Do **not** add tags or variables fields. §3 forbids both explicitly.

## Verify

- `npm run check` exits clean.
- `+` replaces the library with the editor in the same popup; `←` returns.
- Each of the five type pills shows its own option row with the right label
  (`SCOPE` / `DATABASE` / `SHELL` / `FORMAT` / `STYLE`) and the right pills.
- Switching type with an untouched body swaps the example; type one character
  into the body, switch type again, and the text survives.
- Switching from `DATABASE`/`POSTGRESQL` to `GIT` leaves the option row showing
  `Any repo`, not a blank or a stale database pill.
- The line count matches the body's actual line count, including after a paste.
- Typing `AWS_SECRET_KEY=abc123` shows the amber warning; deleting it hides it.
  Also check `ghp_` + 20 chars and a `https://user:pass@host` URL.
- The preview footer updates live and matches the library row exactly — compare
  side by side after saving. Its Copy button does nothing.
- Save with an empty body: refused, nothing written. Save with a body and no
  title: stored as `Untitled git` (or the matching type).
- Save a pinned memo: `✓ Saved` for ~1.6s, return to the library, and it appears
  under `PINNED`.
- Reopen the popup: the memo is still there, with every field intact in
  `chrome.storage.local`.
