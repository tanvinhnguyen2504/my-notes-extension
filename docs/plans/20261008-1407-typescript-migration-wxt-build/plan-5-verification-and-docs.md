# Phase 5 — Verification scripts in-repo, and the docs this invalidated

## Goal

Promote the throwaway jsdom scripts into committed files runnable by plain
`node`, and correct every document that now describes a repo that no longer
exists.

## Tasks

### Verification

- [ ] `npm i -D jsdom @types/jsdom`.
- [ ] Create `verify/` with the scripts written during phases 2–4, kept as
      standalone `node`-runnable `.ts` files using `node:assert`:
      - `verify/utils.ts` — no `window`, no stubs; the service-worker case.
      - `verify/background.ts` — hand-rolled `chrome` stub, no DOM.
      - `verify/popup.ts` — one jsdom boot, exercising add/toggle/delete.
      - `verify/drag.ts` — the real `dragstart`/`dragover`/`drop` sequence, with
        and without `dataTransfer`.
- [ ] Add `"verify": "node verify/utils.ts && node verify/background.ts && node verify/popup.ts && node verify/drag.ts"`.
      Separate processes is not incidental — `popup.ts` and `drag.ts` each boot
      the popup, and ES module caching means a second boot in the same process
      drives the first boot's DOM with no error.
- [ ] `verify/popup.ts` must strip the `<script>` tag out of the HTML before
      handing it to jsdom and import the entry module itself, as `CLAUDE.md`
      already documents. The tag's `src` is now a `.ts` path — update the
      `replace()` string.
- [ ] Exclude `verify/` from the WXT build (it is outside `entrypoints/`, so
      this should be automatic — confirm nothing from it lands in
      `.output/chrome-mv3/`).

### Docs

- [ ] `README.md`: replace every "load the repo root" instruction with
      `npm install` → `npm run build` → load `.output/chrome-mv3/`. Add
      `npm run dev` as the development path and `npm run verify` / `npm run check`.
- [ ] `CLAUDE.md` — the following statements are now false and must be rewritten,
      not patched around:
      - "No build step, no framework, no dependencies" and "The repo root *is*
        the extension" — both now wrong in the opposite direction.
      - "`manifest.json` sits here, and that is the folder you point
        `chrome://extensions` at" → the folder is `.output/chrome-mv3/`, and the
        manifest is generated from `wxt.config.ts`.
      - The "manifest and the two HTML pages stay at the root" paragraph →
        replace with the real new rule: HTML entrypoints live in `entrypoints/`
        and are **emitted flattened** to the output root, which is what keeps
        `url: "reminder.html"` and `default_popup` valid. A page added under
        `src/` is silently never emitted.
      - The layout table → add `wxt.config.ts`, `tsconfig.json`,
        `src/core/types.ts`, `src/core/dom.ts`, `public/icons/`, `verify/`; move
        `background` to `entrypoints/`.
      - "`popup.html` loads `src/popup.js` with `type="module"`" → Vite bundles
        the entrypoint; adding a module still means adding an import, not a
        second `<script>` tag, but for a different reason.
      - The data-model section → point at `src/core/types.ts` as the definition
        and keep the prose explaining *why* `dueDate` is a day key and why
        `theme` stays top-level. The reasoning is still the valuable part; the
        shape is now in the types.
      - The Testing section → `node verify/*.ts` directly, Node 26 strips types
        natively, and the two constraints that keeps on the codebase
        (`erasableSyntaxOnly`, explicit `.ts` import extensions, no `enum`,
        no `@/` alias).
- [ ] `CLAUDE.md` — add to "Traps this codebase has already hit":
      - Entrypoint files are imported by WXT at build time in Node, so top-level
        `chrome.*` in `background.ts` breaks the build; and listeners registered
        after an `await` inside `main()` break the worker at runtime. Opposite
        failures, opposite times.
      - You are now always testing a *build artefact*. A stale `.output/` loaded
        in Chrome looks exactly like code that didn't work.
- [ ] `CLAUDE.md` — add to "Architecture rules": `core/utils.ts` stays DOM-free
      *and* `core/dom.ts` is the only file allowed to reach for `document` by id;
      `lib: ["DOM"]` means the compiler will not catch a `window` reference that
      breaks the worker.
- [ ] `CLAUDE.md` — add the `el()`-over-`!` decision and its reason (a named id
      in the error message, at the point of capture) to "Conventions", next to
      the existing `somethingEl` naming rule.
- [ ] `CHANGELOG.md`: an entry for the migration, noting the breaking change for
      anyone loading unpacked from a clone.
- [ ] Bump the version in `wxt.config.ts` once the open question in `plan.md` is
      answered.

## Implementation notes

- Do the `CLAUDE.md` rewrite as a real pass over the file, not a search and
  replace. Roughly a third of it describes the no-build-step design, and half of
  its value is the *reasons* behind the rules — those survive the migration and
  should be preserved verbatim where they still hold. Deleting a correct
  explanation because its surrounding sentence changed is the main risk here.
- The two documented loose ends (`debounce()` / `formatDate()` unused, the
  suspected IME duplicate `Enter`) stay documented and unfixed. Phase 2 typed
  `debounce()` rather than deleting it precisely so this section stays true.
- Keep `verify/` deliberately unframeworked. `CLAUDE.md` describes verification
  as driving the real files, and `node:assert` + `node`'s native TS support is
  now enough for that — adding Vitest would be a second build toolchain for four
  scripts.

## Verify

- `npm run verify` passes from a clean clone after `npm install` alone.
- `npm run check` clean.
- Follow `README.md` literally from a fresh clone in a scratch directory and
  confirm it produces a loadable extension with no undocumented step.
- Re-read `CLAUDE.md` end to end and confirm no sentence describes the
  pre-migration repo. Every file in the layout table exists; every path
  referenced resolves.
- `grep -rn "repo root\|manifest.json sits\|no build step" README.md CLAUDE.md`
  returns nothing stale.
