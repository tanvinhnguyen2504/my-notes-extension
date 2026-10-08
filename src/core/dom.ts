// Element lookups that fail loudly.
//
// Under strict mode getElementById returns HTMLElement | null, so every lookup
// needs handling. These throw rather than returning null, and they name what
// was missing: a wrong id in popup.html is the failure mode CLAUDE.md describes
// as "fails at runtime with no error at edit time", and the alternative --
// getElementById("draft")! at each site -- turns it into a "Cannot read
// properties of null" several frames from the cause.
//
// This file is separate from utils.ts on purpose. utils.ts is imported by the
// service worker and must stay DOM-free; this is the only module allowed to
// reach for the document by id.

// The cast is the one in the codebase, and it is contained here deliberately:
// nothing can prove at compile time that #draft is an <input>, so the
// association is asserted once, at the point where the id is named, rather than
// at every use of the result.
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
