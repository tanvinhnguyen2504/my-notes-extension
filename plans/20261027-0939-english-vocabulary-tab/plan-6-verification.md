# Phase 6 — Verification and the manual checklist

## Goal

Pin every pure rule in `core/english_utils.ts` with executable assertions, and
hand over a short Chrome checklist for the parts only a browser can show.

## Tasks

- [ ] A scratchpad script run with `npx tsx`, covering every pure rule that
      survives the scope cut:
      - **Type detection** — `follow up` ⇒ word; `on track` ⇒ word;
        `Hi.` ⇒ sentence (punctuation rule alone); `Could you walk me through
        the timeline?` ⇒ sentence; a 4-word phrase with no punctuation ⇒
        sentence; a 3-word phrase ⇒ word (the boundary).
      - **Bracket parsing and stripping** — a single pair, two pairs, no pair,
        an unmatched `[`, an unmatched `]`, and `stripBrackets` agreeing with
        `parseBrackets(...).map(s => s.text).join('')` on all of them.
      - **Diacritic-blind search** — `tien do` matches `tiến độ`;
        `DEADLINE` matches `deadline`; `dung` matches `đúng`; a needle with
        diacritics still matches the undiacritised text.
      - **Duplicate detection** — `'  Deadline  '` hits `deadline`;
        `'dead line'` does not; an empty string does not.
      - **`normalizeEnglish`** — `undefined`, `null`, `{}`, `[{}]`, and an item
        missing `id` / `createdAt` all produce complete items, and an
        unrecognised field on a saved item does not survive the load.
- [ ] Delete the script once green, per the repo's documented practice.
- [ ] `npm run check` and `npm run build`.
- [ ] Write the manual checklist into this file's `Verify` section as the
      hand-off.

## Implementation notes

**This is a scratchpad script, not a retained suite, and that is a deliberate
choice the user may want to overrule.** The repo has no runner; adding one means
adding **vitest** as a dev dependency, which the spec says to ask about first.
See the open question in `plan.md`. The assertions above are written so that
moving them into `*.test.ts` under vitest is a mechanical change — pure inputs,
pure outputs, no DOM.

**Use `node:assert/strict`, not a hand-rolled compare.** `assert.deepStrictEqual`
on the `parseBrackets` segments is what catches a segment boundary off by one
character, which an `assert(a.length === b.length)` does not.

**Put the script in the session scratchpad, not in the repo.** Nothing under
`src/` or the project root should carry a file that `tsc --noEmit` then type-
checks as production code.

**Do not test the components here.** There is no jsdom, no renderer, and the
notes in `CLAUDE.md` about `renderToStaticMarkup` and realm-sensitive
`instanceof` describe work that is out of this phase's scope.

## Verify

`npm run check` clean, `npm run build` clean, then in Chrome with
`.output/chrome-mv3/` loaded:

**List and search**
1. Fresh profile ⇒ English tab shows 13 items, counts `All 13 / Sentences 7 /
   Words 6`.
2. `tien do` in the search matches the timeline sentence. `zzz` shows
   `Nothing matches "zzz"`.
3. `Words` shows 6 rows; counts do not move while typing.
4. Brackets render as highlights with no literal `[` or `]`, in both themes.

**Row actions**
5. Copy ⇒ clipboard holds the bracket-free text; the icon checks for ~1.2 s.
6. Listen speaks it in an English voice; two rows in quick succession speak only
   the second.
7. Clicking a row's text opens the example; clicking another closes the first.
8. Delete ⇒ Undo toast; `Undo` restores the row in place; waiting 5 s makes the
   deletion stick across a popup reopen.

**Add bar**
9. `prioritize` while on `Sentences` ⇒ hint says word, save switches the filter
   to `Words`, inputs clear, focus stays, the new row flashes.
10. `  Deadline  ` ⇒ nothing added, the existing row scrolls in and flashes.
11. `Add` is disabled with an empty English input.
12. Telex-typed Vietnamese + Enter adds exactly one item.

**Keyboard and layout**
13. `/` focuses search; `/` inside an input types a slash; `Esc` with a query
    clears it and keeps the popup open; `Esc` with no query closes it.
14. No horizontal scrollbar at 380 px or in wide mode; the longest sentence
    wraps with both icons visible.


