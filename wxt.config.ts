import { defineConfig } from "wxt";

// Generates the manifest from this file plus entrypoints/. HTML entrypoints are
// emitted flattened to the output root, which keeps `url: "reminder.html"` and
// the generated `default_popup` valid.
export default defineConfig({
  // No auto-imports: an injected global would be the only identifier in this
  // codebase you cannot grep for.
  imports: false,

  manifest: {
    name: "Checklist",
    version: "1.0.4",
    description:
      "A quiet todo checklist in your toolbar. Offline, no account, priority flags.",
    permissions: ["storage", "alarms"],
    // WXT derives `icons` only from public/icon/{size}.png and never emits
    // default_icon, so both are declared rather than renaming the files.
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
