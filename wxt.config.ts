import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// Generates the manifest from this file plus entrypoints/. HTML entrypoints are
// emitted flattened to the output root, which keeps `url: "reminder.html"` and
// the generated `default_popup` valid.
export default defineConfig({
  // No auto-imports: an injected global would be the only identifier in this
  // codebase you cannot grep for.
  imports: false,

  modules: ['@wxt-dev/module-react'],

  vite: () => ({ plugins: [tailwindcss()] }),

  manifest: {
    name: 'Tasks',
    version: '1.1.0',
    description: "A small browser extension that improves developers' productivity.",
    permissions: ['storage', 'alarms'],
    // WXT derives `icons` only from public/icon/{size}.png and never emits
    // default_icon, so both are declared rather than renaming the files.
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    action: {
      default_title: 'Tasks',
      default_icon: {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    },
  },
});
