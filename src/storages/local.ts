// The only module that talks to a storage backend.
//
// Plain functions, not a class: touching `chrome` at module scope breaks
// `wxt build`, which imports entrypoints in Node.

// Per call, never snapshotted -- a module-level constant latches the
// localStorage path before a test can install a `chrome` stub.
function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
}

// The type boundary: `normalize` must return a usable value for every input,
// `undefined` included.
export function readDataByKeyFromStorage<T>(key: string, normalize: (saved: unknown) => T): Promise<T> {
  return new Promise<T>((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.local.get([key], (result) => {
        resolve(normalize(result && result[key]));
      });
      return;
    }
    try {
      resolve(normalize(JSON.parse(localStorage.getItem(key) ?? 'null')));
    } catch (_) {
      resolve(normalize(null));
    }
  });
}

export function writeKey(key: string, value: unknown): void {
  if (hasChromeStorage()) {
    chrome.storage.local.set({ [key]: value });
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // A full localStorage is not worth crashing the popup over.
  }
}
