# Phase 1 — WXT builds the existing JavaScript

## Goal

Get `.output/chrome-mv3/` loading in Chrome and behaving identically to today's
repo-root extension, with every source file still `.js`.

## Tasks

- [ ] `npm init -y`; add `"private": true` and `"type": "module"` to `package.json`.
- [ ] `npm i -D wxt typescript @types/chrome`. WXT 0.21.4 is what the spike
      validated; pin or record it, since the entrypoint and output conventions
      later phases depend on are version-sensitive. `@types/chrome` is required —
      WXT ships no global `chrome` type.
- [ ] Scripts: `dev` → `wxt`, `build` → `wxt build`, `zip` → `wxt zip`,
      `postinstall` → `wxt prepare`, `check` → `tsc --noEmit`.
- [ ] `.gitignore`: add `node_modules/`, `.output/`, `.wxt/`, `stats.html`.
- [ ] Create `entrypoints/`. Move `popup.html` → `entrypoints/popup.html`,
      `reminder.html` → `entrypoints/reminder.html`, and
      `src/background.js` → `entrypoints/background.js`.
- [ ] Fix the `<link>` and `<script src>` paths in both HTML files for their new
      depth (`src/popup.css` → `../src/popup.css`, and likewise the script).
- [ ] Rewrite `entrypoints/background.js` to
      `export default defineBackground({ type: "module", main() { ... } })` with
      all four listener registrations (`alarms.onAlarm`, `runtime.onInstalled`,
      `runtime.onStartup`, `storage.onChanged`) inside `main()`, and its
      `./core/utils.js` import repointed to `../src/core/utils.js`. Import
      `defineBackground` explicitly from `wxt/utils/define-background`.
- [ ] Move `icons/` → `public/icons/` so WXT copies it to the output root
      unchanged, keeping the manifest's icon paths valid as written.
- [ ] Write `wxt.config.ts` with `imports: false` and a `manifest` block
      carrying `name`, `version`, `description`,
      `permissions: ["storage", "alarms"]`, `action.default_title`,
      `action.default_icon`, and `icons` — transcribed field-for-field from the
      current `manifest.json`. No `srcDir` / `entrypointsDir`: the defaults
      already place `entrypoints/` at the root with `src/` beside it.
- [ ] Write `tsconfig.json`: `extends: "./.wxt/tsconfig.json"` plus only
      `allowJs: true`, `checkJs: false`, `erasableSyntaxOnly: true`. The
      remaining flags (`strict`, `noUncheckedIndexedAccess`,
      `allowImportingTsExtensions`, `verbatimModuleSyntax`, `noEmit`) are already
      set by the generated config — restating them adds drift, not safety.
- [ ] Delete the root `manifest.json`.
- [ ] Diff generated vs. deleted manifest and reconcile every difference.

## Implementation notes

- `allowJs: true` / `checkJs: false` is what lets this phase ship with zero
  `.ts` source. It comes off in phase 4.
- WXT writes `action.default_popup` itself from the existence of
  `entrypoints/popup.html`. Do not also set it in the `manifest` block; if the
  generated value is wrong, the entrypoint filename is wrong.
- `type: "module"` on the background is passed through `defineBackground`, not
  the `manifest` block. WXT also injects its own dev-reload machinery into the
  worker in `wxt dev` — expect the dev manifest to differ from the build
  manifest, and compare against `wxt build` output only.
- The reminder window's `url: "reminder.html"` needs **no** change: HTML
  entrypoints are emitted flattened at the output root. Confirmed by spike, but
  still worth eyeballing in the output listing — if it ever stops holding it
  fails at runtime with a blank window and no console error.
- WXT auto-generates `icons` only from `public/icon/{size}.png`, and never
  generates `action.default_icon`. Since this repo's files are `icon16.png` etc.,
  both keys get declared explicitly and no icon file is renamed.
- Keep `defineBackground`'s `main()` synchronous. Registering a listener after an
  `await` means a cold worker can be woken for an event it is not yet listening
  for.
- Expect WXT to want `public/` for anything copied verbatim. If an icon 404s in
  the built extension, the path is `public/`-relative, not repo-relative.

## Verify

- `npm run build` succeeds.
- `diff <(jq -S . .output/chrome-mv3/manifest.json) <(git show HEAD:manifest.json | jq -S .)`
  shows only the differences you can name and accept (`default_popup` now
  generated, any WXT-added `web_accessible_resources`). No new permission, no
  host permission, no missing icon size.
- Load `.output/chrome-mv3/` unpacked. Popup opens, renders existing saved items,
  and the service-worker console is clean.
- `npm run dev` loads the extension and a popup edit reloads without a manual
  re-load in `chrome://extensions`.
- Full manual pass of the behaviour list in `plan.md`'s success criteria. This is
  the baseline every later phase is checked against, so do it properly here —
  in particular drag-to-reschedule and the reminder alarm, the two paths with no
  compile-time safety net at all.
