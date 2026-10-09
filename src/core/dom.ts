// Element lookups that throw and name what was missing, rather than returning
// null for a `!` to swallow. Kept out of utils.ts, which must stay DOM-free for
// the service worker; this is the only module allowed to reach for ids.

// The single cast in the codebase: nothing can prove #draft is an <input>, so
// it is asserted once, where the id is named.
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`missing element #${id}`);
  }
  return found as T;
}

export function query<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`missing element ${selector}`);
  }
  return found;
}
