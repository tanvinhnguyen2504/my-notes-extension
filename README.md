# Tasks

A quiet browser-toolbar popup with two modes:

- **Tasks** — a todo checklist grouped by the day you assign each task, so what
  belongs to today is visible at a glance.
- **Dev** — a library of reusable developer snippets (git commands, SQL queries,
  shell one-liners, config blocks, notes), each copyable in one click.

Offline, no account, no network requests. Everything is stored locally in your
own browser.

---

## What you need

- Google Chrome, Microsoft Edge, Brave, or Arc
- [Node.js](https://nodejs.org) 22 or newer
- A copy of this folder on your computer

The extension is written in TypeScript and built with [WXT](https://wxt.dev), so
there **is** a build step. You load the built folder, `.output/chrome-mv3/`, not
the repository root.

---

## Step 1 — Get the files

Either clone the repository:

```bash
git clone <repository-url>
cd my-todo-list-ext
```

…or download the ZIP from the repository page and unzip it somewhere permanent.

> **Pick a permanent location.** The browser loads the extension from this
> folder every time it starts. If you move it to the Trash or rename it later,
> the extension stops working.

Then install the dependencies and build it:

```bash
npm install
npm run build
```

That writes the extension into `.output/chrome-mv3/`. Confirm it is there:

```bash
ls .output/chrome-mv3/manifest.json
```

If that prints the path, you are in the right place. `.output/chrome-mv3/` is the
folder you will point the browser at in the next step — **not** the repository
root, which has no `manifest.json` of its own. The manifest is generated from
`wxt.config.ts` at build time.

---

## Step 2 — Load it into your browser

### Chrome, Edge, Brave, or Arc

1. Open a new tab and go to `chrome://extensions`
   (on Edge use `edge://extensions`).
2. Turn on **Developer mode** using the toggle in the top-right corner.
   Three new buttons appear.
3. Click **Load unpacked**.
4. In the file picker, select `.output/chrome-mv3/` — the folder containing the
   generated `manifest.json`. Select the _folder itself_, not a file inside it.
5. **Tasks** now appears in your extensions list.

### Firefox

`npm run build:firefox` produces `.output/firefox-mv2/`, which you can load via
`about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → the
`manifest.json` inside that folder.

> Treat this as unverified. The build succeeds, but the extension targets
> Chrome: the service worker awaits promise-returning `chrome.alarms` calls,
> which Firefox exposes under `browser.*` rather than `chrome.*`, so the daily
> reminder in particular has not been tested there.

---

## Step 3 — Pin it to your toolbar

By default the icon is hidden in the extensions menu.

1. Click the puzzle-piece **Extensions** icon in the toolbar.
2. Find **Tasks** in the list.
3. Click the pin icon next to it.

The Tasks icon is now visible in your toolbar. Click it to open the popup.

---

## Step 4 — Check that it works

1. Click the Tasks icon.
2. Type `buy milk` in the field at the bottom and press **Enter**.
3. The item appears under the **TODAY** heading.
4. Close the popup and open it again — the item is still there.

If all four happen, the installation is complete.

---

## The two modes

The popup opens on a segmented control: **Tasks** and **>\_ Dev**. Whichever you
used last is the one that opens next time. The **⚙** button sits beside it and
opens settings from either mode.

---

## Tasks mode

### Adding tasks

Type in the field at the bottom and press **Enter**.

Two shortcuts work while typing:

| You type             | You get                                 |
| -------------------- | --------------------------------------- |
| `pay rent`           | A normal task, due today                |
| `!pay rent`          | A **high priority** task                |
| `pay rent @today`    | A task assigned to today                |
| `pay rent @tomorrow` | A task assigned to tomorrow             |
| `pay rent @12/09`    | A task assigned to 12 September         |
| `!pay rent @12/09`   | High priority, assigned to 12 September |

Dates are written day-first: `@12/09` is 12 September, not 9 December. You can
also write the year: `@12/09/2026`.

### Days

New tasks are assigned to **today** unless you type an `@day` token. Tasks are
grouped under the day they are assigned to, with **TODAY** first so it needs no
scrolling, then anything **OVERDUE**, then what is coming up, then tasks with no
day at all.

To move a task to a different day, drag it onto that day's heading.

### Everyday actions

| Action              | How                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Tick a task off     | Click the checkbox (the task's text is for editing instead)                                |
| Rename a task       | Double-click its text, then Enter to save (Escape cancels)                                 |
| Set priority        | Click the priority pill on the row, then pick a level. The day resorts HIGH → MEDIUM → LOW |
| Reorder tasks       | Drag a row up or down                                                                      |
| Move to another day | Drag a row onto that day's heading                                                         |
| Delete one task     | Hover the row and click the `×`                                                            |
| Tick everything off | **✓ MARK ALL** in the header                                                               |
| Delete everything   | **CLEAR** in the header, then click again to confirm                                       |
| Export to CSV       | The **↓** chip in the header                                                                |

---

## Dev mode

A library of snippets you retype too often. Each one has a type, a title and a
body, and copies to the clipboard in a single click.

### The library

| Action                 | How                                                              |
| ---------------------- | ---------------------------------------------------------------- |
| Copy a snippet         | Click **Copy**. It turns teal for a moment and counts the use    |
| Filter by type         | The chips along the top — **All**, Git, SQL, Config, Shell, Note |
| Search                 | The field at the bottom, or press `/` from anywhere              |
| Clear the search       | **Escape**                                                        |
| Move between snippets  | `↑` and `↓`                                                      |
| Copy the focused one   | **Enter**                                                         |
| Pin / unpin            | Right-click the row                                               |
| New snippet            | The **+** button, or press `n`                                   |
| Edit a snippet         | Click its title, or press `e` on the focused row                 |

Pinned snippets sit in a **PINNED** group above **RECENT**. A group with nothing
in it is hidden rather than shown empty.

### The editor

Pick one of five types — **Git**, **SQL**, **Shell**, **Config**, **Note**. The
type decides the body's label, its hint, and the options offered beside it
(which database, which shell, which config format). Git has no options.

| | |
| --- | --- |
| Save | **Save**, or `Cmd`/`Ctrl` + `Enter` |
| Go back | **←**, or **Escape** |
| Delete | **Delete**, then **Confirm delete** within 3 seconds |
| Pin it | The **Pin to the top** switch |

A few behaviours worth knowing:

- Switching type swaps in an example body **only** while you have not edited it.
- An empty body cannot be saved. An empty title is stored as `Untitled git`
  (or whichever type you chose).
- If the body looks like it contains a password, token or API key, an amber
  warning appears. It is advisory — it never blocks a save.
- **PREVIEW IN LIBRARY** at the bottom is the real row, so what you see is what
  the library will show.

---

## Settings

The **⚙** button beside the mode switch.

| Setting            | What it does                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| **Dark mode**      | Switches the whole popup, both modes                                   |
| **Wide mode**      | Widens the popup and wraps long task text instead of truncating it     |
| **Daily reminder** | Opens a reminder window at the time you pick                           |

### Resizing in wide mode

With **Wide mode** on, drag either edge of the popup to set its width. The size
is remembered, and is held between 380px and 780px — Chrome clips a popup wider
than 800px rather than scrolling it.

### Daily reminder

With **Daily reminder** switched on, a small window opens in the middle of your
screen at the time you chose, listing only the tasks flagged **HIGH** that are
still outstanding. Tick them off there or press **Escape** to dismiss it.

If nothing high priority is outstanding at that time, no window opens.

---

## Updating after the code changes

If you pull new commits, you have to rebuild — the browser is loading
`.output/chrome-mv3/`, which only changes when you build:

```bash
npm install   # only if the dependencies changed
npm run build
```

Then go to `chrome://extensions`, find **Tasks**, and click the circular
**reload** arrow on its card.

### Working on the code

```bash
npm run dev
```

This opens a browser with the extension loaded and rebuilds on every save, so
there is no manual reload step.

| Command         | What it does                                        |
| --------------- | --------------------------------------------------- |
| `npm run dev`   | Build, launch a browser, and reload on save         |
| `npm run build` | Build `.output/chrome-mv3/` for loading or shipping |
| `npm run check` | Type-check everything with `tsc --noEmit`           |
| `npm run zip`   | Package the build for store submission              |

---

## Removing it

Go to `chrome://extensions` and click **Remove** on the Tasks card.
Your saved tasks and snippets are deleted along with it.

---

## Troubleshooting

**"Manifest file is missing or unreadable"**
You selected the wrong folder — most likely the repository root, which has no
`manifest.json`. Run `npm run build` and select `.output/chrome-mv3/`.

**I pulled new code and nothing changed**
The browser loads the built folder, not the source. Run `npm run build`, then
click the reload arrow on the extension's card.

**The icon is not in my toolbar**
It is installed but not pinned. See Step 3.

**My tasks or snippets disappeared**
They are stored per browser profile. A different profile, or a different
browser, has its own separate list. Removing and re-adding the extension also
clears them.

**The popup opens unstyled**
A stale build. Run `npm run build` and reload the extension. Under `npm run dev`
this also happens if the dev server is not running — the page loads its styles
from it.

**Nothing happens when I click the icon**
Open `chrome://extensions`, find Tasks, and click **Errors** or the
**service worker** link to see what failed. This usually means the folder was
edited while loaded — click the reload arrow.

**Firefox forgot the extension**
Expected. Temporary add-ons do not survive a restart; repeat Step 2.

---

## Privacy

The extension requests two permissions: `storage`, and `alarms` for the daily
reminder. It has no host permissions and makes no network requests, so nothing
you save ever leaves your machine.

Snippets are stored exactly as typed. The editor warns when a body looks like it
holds a credential, but it does not stop you saving one — treat the library as
you would any local notes file.

---

## Project layout

Entry points live in `entrypoints/` — that is where WXT looks. Everything else
lives under `src/`, layered `core ← storages ← components`, with nothing
importing upward.

WXT emits HTML entrypoints **flattened to the output root**, so
`entrypoints/popup.html` is served as `popup.html` inside the built extension.
That is what keeps `url: "reminder.html"` in the service worker valid. A page
added under `src/` instead of `entrypoints/` is simply never built.

| File                                 | What it holds                                                          |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `wxt.config.ts`                      | Build config, the React and Tailwind plugins, and the manifest fields  |
| `tsconfig.json`                      | Extends WXT's generated config                                         |
| `entrypoints/popup.html`             | The popup's shell: one `<div id="root">`                               |
| `entrypoints/reminder.html`          | The reminder window's shell                                            |
| `entrypoints/background.ts`          | Service worker: owns the reminder alarm                                |
| `src/popup.tsx` · `src/reminder.tsx` | The two React roots. Each imports `styles.css`                         |
| `src/styles.css`                     | `@theme` design tokens, light/dark via `data-theme`, the layered reset |
| `src/core/types.ts`                  | `Task`, `State`, `Settings`, `Priority` and friends                    |
| `src/core/types/memos.ts`            | The memo types, their sub-types and `IMemo`                            |
| `src/core/utils.ts`                  | Parsing, priority and clamps. Pure — no DOM, no storage                |
| `src/core/day_utils.ts`              | Day keys, their formatting, and grouping by day                        |
| `src/core/memo_utils.ts`             | Memo helpers, the library filters, the secret scan                     |
| `src/core/reducer.ts`                | Every state transition, as a pure function                             |
| `src/storages/`                      | One module per storage slice, plus the chrome/localStorage fallback    |
| `src/components/`                    | The React tree: the shell, both modes, and the reminder window         |
| `src/components/memos/`              | The snippet library and its editor                                     |
| `src/hooks/useDragDrop.ts`           | Drag-to-reorder and drag-to-reschedule                                 |
| `src/hooks/useWidthDrag.ts`          | Drag-to-resize the popup in wide mode                                  |
| `src/features/export.ts`             | CSV export                                                             |
| `public/icons/`                      | Toolbar icons at 16 / 32 / 48 / 128 px, copied to the output root      |

State is three `chrome.storage.local` keys — `tasks.v1`, `settings.v1` and
`memo.v1` — written independently so a change to one cannot clobber another.

### Built with

React 19, [Radix UI](https://www.radix-ui.com) primitives for the tabs, the
priority menu and the settings controls, and Tailwind CSS v4 for design tokens —
all bundled by [WXT](https://wxt.dev). There is no test framework;
`npm run check` type-checks and the rest is verified by using the extension.

Contributor-facing notes — the architecture rules, the data model, and the traps
this codebase has already hit — live in `CLAUDE.md`.
