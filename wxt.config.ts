import { defineConfig } from "wxt";

// The manifest is generated from this file plus the contents of entrypoints/.
// HTML entrypoints are emitted flattened to the output root, which is what keeps
// `url: "reminder.html"` in background.js and the generated `default_popup`
// valid -- a page added under src/ instead of entrypoints/ is silently never
// emitted at all.
export default defineConfig({
  // No auto-imports. WXT can inject defineBackground and friends as globals,
  // but nothing else in this codebase is magic, and an identifier you cannot
  // grep for would be the first. It also keeps entrypoints importable by the
  // plain-node verification scripts.
  imports: false,

  manifest: {
    name: "Checklist",
    version: "1.0.4",
    description:
      "A quiet todo checklist in your toolbar. Offline, no account, priority flags.",
    permissions: ["storage", "alarms"],
    // WXT derives `icons` only from public/icon/{size}.png and never emits
    // action.default_icon, so both are declared here rather than renaming the
    // icon files to suit the convention.
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_title: "Checklist",
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
    },
  },
});
