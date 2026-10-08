// Boots a real entrypoint page in jsdom, driving the actual HTML and the actual
// module -- no fixtures, no mocks of our own code.
//
// ONE BOOT PER PROCESS. priority.ts captures #priority-menu at import time and
// Node caches ES modules by specifier, so a second boot in the same process
// would drive the first boot's DOM with no error at all. Each verify script
// that needs a page therefore gets its own `node` invocation.
//
// No chrome global is installed: utils.ts then takes its localStorage fallback,
// which jsdom provides. That is also the path the popup runs on when opened as
// a plain page, so it is a real configuration rather than a test-only one.

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

// Every global popup.ts and its imports reach for. The constructors matter as
// much as window/document: popup.ts narrows event.target with `instanceof Node`
// and `instanceof Element`, and those checks fail against a different realm's
// classes even when the object is a perfectly good node.
const GLOBALS = [
  "window",
  "document",
  "localStorage",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLTemplateElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "CustomEvent",
  "Blob",
  "URL",
  "getComputedStyle",
] as const;

export async function bootPage(htmlPath: string, modulePath: string): Promise<JSDOM> {
  const html = readFileSync(htmlPath, "utf8")
    // The page's own <script type="module"> cannot be executed by jsdom, so it
    // is removed and the module is imported directly instead.
    .replace(/<script[^>]*type="module"[^>]*><\/script>/, "");

  const dom = new JSDOM(html, { pretendToBeVisual: true, url: "https://localhost/" });
  const win = dom.window as unknown as Record<string, unknown>;
  const target = globalThis as unknown as Record<string, unknown>;
  for (const name of GLOBALS) {
    target[name] = win[name];
  }

  await import(modulePath);
  // loadState() resolves on a microtask, and the first render happens in its
  // .then -- so nothing is on the page until that has run.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return dom;
}

// jsdom synthesises no dataTransfer, which is exactly the case drag-drop.ts's
// null guards exist for. `withData: true` supplies the minimum a real browser
// would, so both paths can be exercised.
export function dragEvent(type: string, init: { clientY?: number; withData?: boolean } = {}) {
  const event = new (globalThis as unknown as { Event: typeof Event }).Event(type, {
    bubbles: true,
    cancelable: true,
  }) as Event & { clientY?: number; dataTransfer?: unknown };
  event.clientY = init.clientY ?? 0;
  if (init.withData) {
    event.dataTransfer = {
      setData() {},
      getData: () => "",
      effectAllowed: "",
      dropEffect: "",
    };
  }
  return event;
}

export function click(el: Element): void {
  el.dispatchEvent(new (globalThis as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent("click", { bubbles: true, cancelable: true }));
}

export function press(el: Element, key: string): void {
  el.dispatchEvent(
    new (globalThis as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}
