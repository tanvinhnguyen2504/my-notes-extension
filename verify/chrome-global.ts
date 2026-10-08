// Installs a `chrome` global, and must be imported BEFORE anything that pulls
// in src/core/utils.ts.
//
// utils.ts snapshots `hasChromeStorage` once, at module evaluation time. ES
// import statements are hoisted and evaluated in source order before any
// statement in the importing file runs -- so a stub installed in a test file's
// body arrives too late, loadState() latches onto the localStorage path, and
// every assertion that depends on stored state passes vacuously against an
// empty list. In production this never bites, because a service worker always
// has chrome; in a test it is silent.
//
// Keeping this in its own module is the only way to get the assignment to
// happen before the hoisted imports of the file under test.

export function setChrome(value: unknown): void {
  Object.defineProperty(globalThis, "chrome", {
    value,
    configurable: true,
    writable: true,
  });
}

// A placeholder with just enough shape for utils.ts's check to see storage.
// Tests replace the whole object; utils.ts reads chrome.storage.local.get at
// call time, so a later swap takes effect -- it is only the initial presence
// that is latched.
setChrome({ storage: { local: {} } });
