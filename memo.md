# Developer Mode — build prompts

Copy-paste prompts for Claude Code / Cursor / any coding agent. Run them **in order**, one per session or commit. Each is self-contained.

Attach or keep these in the repo so the agent can read them:

- `extension/` (current extension: `manifest.json`, `popup.html`, `popup.css`, `popup.js`)
- `Developer Mode Mockups.dc.html` (design reference: screens 1a, 1b, 2a)
- `extension/DEV-MODE-PLAN.md`

---

## 0. Context primer (paste first, every session)

```
You are working on a Manifest V3 browser extension in ./extension called "Checklist".
It is plain HTML/CSS/JS: no framework, no build step, no npm. Keep it that way.
Storage: chrome.storage.local only, with a localStorage fallback when chrome.storage is missing.
Permissions: "storage" only. Do not add permissions unless the prompt says so.

Design system (match exactly):
- Popup width 380px, height grows with content, max 600px; the list scrolls, header and footer stay fixed.
- Fonts: "DM Sans" for UI, "JetBrains Mono" for code/meta, with system fallbacks.
- Light tokens: bg #f7f5f1, surface #fffdfa, ink #17161a, dim rgba(23,22,26,.62), line rgba(23,22,26,.09).
- Dark tokens: bg #16171b, surface #1b1c21, ink #f2f0ec, dim rgba(242,240,236,.62), line rgba(255,255,255,.1).
- Accent teal oklch(0.62 0.11 175) = success/copied. Clay oklch(0.58 0.13 40) = high priority.
- Type dots: git oklch(0.6 0.13 40), sql oklch(0.62 0.12 250), config oklch(0.62 0.12 140),
  shell rgba(23,22,26,.45), note oklch(0.7 0.1 85).
- Code blocks: bg #17161a, text #eae7e1, 11.5px JetBrains Mono.
- Rows 44px min, radius 7–9px, 1px hairlines, no shadows except a soft popup card shadow.
- Theme via html[data-theme="light|dark"] and CSS variables in popup.css.

Rules: small focused diffs, no dead code, no comments that narrate. After each change,
tell me exactly how to reload and test it at chrome://extensions.
```

---

## 1. Mode switch: Tasks | Dev

```
Add a two-mode switch to the popup header, matching screen 1a in Developer Mode Mockups.dc.html.

- Replace the "Tasks" title with a segmented control: [Tasks] [>_ Dev].
  Track: rgba(23,22,26,.06), 3px padding, radius 9px. Active segment: surface bg, ink text,
  0 1px 2px rgba(0,0,0,.08) shadow, radius 7px, height 26px, 12px/500 DM Sans.
- Keep the theme toggle and add a "+" ghost button (28x28) to the right.
- Tasks mode shows the existing task list unchanged.
- Dev mode shows an empty <main id="dev"> for now.
- Persist the last mode in storage under "checklist.mode"; restore on open.
- Split JS: storage.js (load/save helpers), tasks.js (existing logic), dev.js (new), popup.js (boot + mode switch).
```

## 2. Snippet library (screen 1a)

```
Build the Dev mode library in dev.js, matching screen 1a.

Data, key "checklist.dev.v1":
{ snippets: [{ id, type: "git|sql|config|shell|note", title, body, pinned, uses, updatedAt }] }
Seed with 6 examples on first run (use the ones in the mockup).

UI:
- Filter chips row: All / Git / SQL / Config / Shell / Note. Chip = 24px pill, 6px type dot.
  Active chip is ink bg + surface text.
- Two groups: "PINNED" then "RECENT" (sorted by updatedAt desc). Group label: 10px mono, .12em tracking, dim.
  Hide a group if empty.
- Each group is a surface card (radius 9px, 1px line border, 10px side margin).
- Row: type dot, title (13px/500, ellipsis), body first line (11px mono, dim, ellipsis), Copy button.
- Copy button: 26px tall, 1px border. On click write body to clipboard, button turns teal "✓ Copied" for 1.2s,
  increment uses, set updatedAt.
- Footer becomes search: 34px field, placeholder "Search snippets", "/" keycap on the right.
  Filters title + body, case-insensitive, combined with the active chip.
- "/" anywhere focuses search; Esc clears it.
- Empty state: "No snippets yet" + "Press + to save your first command."
```

## 3. New note editor (screen 2a)

```
Build the "New note" editor in dev.js, matching screen 2a. It replaces the list view
(not a new window) when "+" is pressed; "←" returns to the list.

TaskHeader: ← back, "New note" title, dark "Save" button (turns teal "✓ Saved" for 1.6s, then returns to list).

Fields, top to bottom:
1. TYPE: 5 pills (Git, SQL, Config, Shell, Note), 28px, active = ink bg.
2. TITLE: 34px input. Placeholder depends on type (e.g. SQL: "e.g. Orders by user, last 7 days").
3. Type-specific option row (small mono pills, active = teal tint):
   SQL → DATABASE: Postgres / MySQL / SQLite / Mongo
   Git → SCOPE: Any repo / This project
   Config → FORMAT: .env / JSON / YAML / TOML
   Shell → SHELL: bash / zsh, PowerShell, fish
   Note → STYLE: Plain / Markdown
4. BODY: dark code textarea (min 112px, resize vertical, no spellcheck). Label changes per type
   (QUERY / COMMAND / CONFIG / NOTE). Line count on the right. One-line hint below per type.
   Switching type swaps in an example body ONLY if the user hasn't edited it.
5. Secret warning (amber box) when body matches:
   /(password|passwd|pwd|secret|token|api[_-]?key)\s*[=:]\s*\S+|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|:\/\/[^\s:\/]+:[^\s@\/]+@/i
   Text: "This looks like a password or token. Remove it before saving."
6. "Pin to top of library" toggle (30x18 switch, teal when on).

Footer: "PREVIEW IN LIBRARY", a live preview of the row exactly as it will appear in the list.

Do NOT add tags or variables fields.
Save requires a non-empty body; empty title becomes "Untitled <type>".
Store the type option as `meta` on the snippet.
```

## 4. Edit and delete

```
In Dev mode:
- Clicking a row (not the Copy button) opens the same editor prefilled, titled "Edit note".
- Add a "Delete" text button in the editor header, left of Save, dim; red on hover
  (light bg oklch(0.94 0.04 25), text oklch(0.45 0.15 25)). Confirm inline: button text becomes
  "Confirm delete" for 3s.
- Right-click on a row toggles pinned.
```

## 5. Dark theme pass

```
Make every new Dev mode element work in html[data-theme="dark"] using only the existing CSS variables.
Code blocks stay #17161a in light; in dark use #0f1013 with a 1px line border so they don't merge
with the surface. Check: chips, cards, copy button, editor inputs, secret warning
(dark: bg oklch(0.3 0.06 70), text oklch(0.88 0.08 80)), toggle, preview card.
List every selector you changed.
```

## 6. Keyboard and polish

```
- manifest.json: add "commands" → "_execute_action" with suggested key Alt+Shift+K.
- In the library: ↑/↓ moves a visible focus ring between rows, Enter copies the focused row,
  E opens edit, N opens New note.
- In the editor: Cmd/Ctrl+Enter saves, Esc goes back (ask before discarding unsaved changes).
- Add prefers-reduced-motion guard; otherwise a 180ms ease-out on view switches and the Copied state.
- All buttons get :focus-visible outline 2px teal, offset 2px.
```

---

## Vibe prompts (quick iterations)

Use these any time after step 3:

- `Make the library denser: 36px rows, hide the body preview line until hover.`
- `Show the full body on hover as a dark tooltip, max 6 lines, mono.`
- `Add light syntax colour in the editor body for SQL keywords and git subcommands. No libraries; a simple overlay <pre> behind a transparent textarea.`
- `Group the library by type instead of Pinned/Recent, with a collapse arrow per group.`
- `Add a "Copied N times" counter in dim mono on the right of each title.`
- `Replace the filter chips with a single dropdown to save vertical space.`
- `Make the popup 420px wide and test that nothing truncates awkwardly.`
- `Audit contrast for every text colour in light and dark; fix anything under 4.5:1.`
- `Review popup.css for duplicate or dead rules and remove them.`
