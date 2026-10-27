function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
}

export function getDataFromStorageByKey<T>(key: string, normalize: (saved: unknown) => T): Promise<T> {
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

export function setDataToStorageByKey(key: string, value: unknown): void {
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
