# Phase 4 — Memo type tokens, code-block tokens, and the label primitive

## Goal

Get `memo.md` §0's memo-type palette into `@theme` as tokens in both themes, and
rewire `constants.ts` and `MemoLabel` to use them — so that no colour literal
ever reaches a memo `.tsx` file.

## Tasks

- [ ] `src/styles.css` `@theme`: add the type-dot tokens from `memo.md` §0 —
      `--color-type-git: oklch(0.6 0.13 40)`,
      `--color-type-database: oklch(0.62 0.12 250)`,
      `--color-type-config: oklch(0.62 0.12 140)`,
      `--color-type-shell: rgba(23, 22, 26, 0.45)`,
      `--color-type-note: oklch(0.7 0.1 85)`.
- [ ] `src/styles.css` `@theme`: add the code-block tokens —
      `--color-code-bg: #17161a`, `--color-code-ink: #eae7e1`.
- [ ] `src/styles.css` `@theme`: add the secret-warning tokens —
      an amber `--color-warn-bg` / `--color-warn-ink` pair for the §3 box.
- [ ] `src/styles.css` `@theme`: add `--font-mono` as a system monospace stack
      (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`), generating
      the `font-mono` utility.
- [ ] `src/styles.css` `html[data-theme="dark"]`: override the tokens that must
      change — `--color-type-shell: rgba(242, 240, 236, 0.45)`,
      `--color-code-bg: #0f1013`, and the §5 warning pair
      (`oklch(0.3 0.06 70)` background, `oklch(0.88 0.08 80)` text).
      The four `oklch` dot colours carry over unchanged.
- [ ] `src/components/memos/constants.ts`: replace `ESubTypeMemo` and
      `MemoLabelBySubtype` with maps keyed on `EMemoType` imported from
      `@/src/core/types/memos` —
      - `MEMO_TYPE_LABELS: Record<EMemoType, string>` → `Git`, `SQL`, `Shell`,
        `Config`, `Note` (the chip and pill text from §2/§3).
      - `MEMO_TYPE_DOT: Record<EMemoType, string>` → the `bg-type-*` utility
        name per type.
      - `MEMO_SUBTYPE_LABELS: Record<MemoSubType, string>` → the option-pill
        text (`Postgres`, `MySQL`, `SQLite`, `Mongo`, `Any repo`,
        `This project`, `.env`, `JSON`, `YAML`, `TOML`, `bash / zsh`,
        `PowerShell`, `fish`, `Plain`, `Markdown`).
      - `MEMO_BODY_LABELS: Record<EMemoType, string>` → `COMMAND`, `QUERY`,
        `COMMAND`, `CONFIG`, `NOTE` — the §3 body-field label.
      - `MEMO_OPTION_LABELS: Record<EMemoType, string>` → `SCOPE`, `DATABASE`,
        `SHELL`, `FORMAT`, `STYLE`.
- [ ] `src/components/memos/MemoLabel.tsx`: replace the stray `` className="`$`" ``
      with the real dot-plus-text label — a `6px` round dot coloured from
      `MEMO_TYPE_DOT[type]` and the text from `MEMO_TYPE_LABELS[type]`. Drop the
      pointless fragment wrapper.

## Implementation notes

**The scaffold's current colours are broken twice over.** `constants.ts` holds
`'background-blue-200 outline-blue-500 text-white'`: `background-` is not a
Tailwind prefix (`bg-` is), so that class does nothing at all. And even spelled
correctly, a palette literal in a `.tsx` file breaks the one rule that keeps
this design themeable — colour values live in `@theme` only, which is also how
`html[data-theme="dark"]` recolours the entire app without a single `dark:`
prefix. Tokens are not stylistic preference here; they are the mechanism.

**Keying on `type` rather than `subType` is the actual correction.** The
scaffold mapped colours per database engine (`POSTGRESQL`, `MONGODB`, `MYSQL`),
but §0 and §2 give one dot colour per *type* and the filter chips are per type.
Sub-types get text labels, not colours.

Tailwind v4 generates a utility from a token name, so `--color-type-git` yields
`bg-type-git`, `text-type-git` and `border-type-git` for free. That is why the
map can hold a utility *name* string and still honour the no-literals rule — the
value itself never leaves `styles.css`.

**`MEMO_TYPE_LABELS[DATABASE]` is `SQL`, not `Database`.** The enum member is
`DATABASE` (clearer in code, and it owns the Postgres/MySQL/SQLite/Mongo
sub-types), while the *UI* text follows `memo.md`'s chip label. Keeping the code
name and the display name separate is why a label map exists at all.

**Fonts are a deliberate compromise.** §0 asks for DM Sans and JetBrains Mono,
but an MV3 page cannot fetch Google Fonts under the default CSP — it would mean
bundling four `.woff2` files into `public/` and hand-writing `@font-face`. A
system mono stack behind `--font-mono` gets the monospace *role* right now; if
you later want the real faces it is a token change plus the files, with no
component edits. `body`'s `Arial, sans-serif` UI font is left alone in this
phase — changing it reflows the existing task list, which is out of scope.

Sizes stay arbitrary-value utilities (`text-[11px]`, `h-[26px]`), not the
default scale. The design is specified in px and this codebase's conversion
premise was zero rounding.

## Verify

- `npm run check` exits clean.
- `npm run build`, then `grep -o "color-type-[a-z]*" .output/chrome-mv3/*.css`
  shows all five tokens emitted.
- Temporarily render one `MemoLabel` per type on the Dev tab: five distinct dot
  colours, each with the right text (`Git`, `SQL`, `Shell`, `Config`, `Note`).
- Toggle the theme: the shell dot inverts (dark grey → light grey) and the four
  `oklch` dots stay recognisably themselves.
- `grep -rnE "#[0-9a-fA-F]{3,6}|oklch\(|rgba\(" src/components/` returns
  nothing. No colour literal reached a component.
