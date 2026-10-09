// The popover menu shared by the row's controls. Owns the menu DOM, its
// position, and which trigger opened it. Knows nothing about todo items: a
// caller passes a trigger and entries, and gets keyboard handling and dismissal.
//
// Only one menu is open at a time, which is why that state lives at module
// scope rather than being threaded through callers.

// `priority` is a plain number, not a Priority: this module must not know what
// the levels mean. See the layering rule in CLAUDE.md.
export interface MenuEntry {
  label: string;
  priority?: number | null;
  checked?: boolean;
  onPick: () => void;
}

let anchorEl: HTMLElement | null = null;
let menuEl: HTMLElement | null = null;

export function isMenuOpen(): boolean {
  return anchorEl !== null;
}

export function menuAnchor(): HTMLElement | null {
  return anchorEl;
}

export function closeMenu(): void {
  // One guard for both: they are set and cleared together in openMenu.
  if (!anchorEl || !menuEl) {
    return;
  }
  anchorEl.setAttribute("aria-expanded", "false");
  anchorEl = null;
  menuEl.hidden = true;
  menuEl.textContent = "";
  menuEl = null;
}

// data-priority is a contract with popup.css, which colours the swatch from it.
// Entries without one render no swatch.
function buildMenuItem({
  label,
  priority = null,
  checked = false,
  onPick,
}: MenuEntry): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "menu-item";
  item.role = "menuitemradio";
  item.setAttribute("aria-checked", String(checked));

  if (priority !== null) {
    item.dataset.priority = String(priority);
    const dot = document.createElement("span");
    dot.className = "menu-dot";
    item.append(dot);
  }

  const labelEl = document.createElement("span");
  labelEl.className = "menu-label";
  labelEl.textContent = label;

  const check = document.createElement("span");
  check.className = "menu-check";
  check.textContent = "✓";

  item.append(labelEl, check);
  item.addEventListener("click", onPick);
  return item;
}

// Flips above when there is no room below. Fixed positioning, so the scrolling
// list cannot clip it.
function positionMenu(el: HTMLElement, triggerEl: HTMLElement): void {
  const anchor = triggerEl.getBoundingClientRect();
  const menu = el.getBoundingClientRect();
  const margin = 6;

  const fitsBelow = anchor.bottom + menu.height + margin <= window.innerHeight;
  const top = fitsBelow ? anchor.bottom + 2 : anchor.top - menu.height - 2;
  const left = Math.min(anchor.left, window.innerWidth - menu.width - margin);

  el.style.top = `${Math.max(margin, top)}px`;
  el.style.left = `${Math.max(margin, left)}px`;
}

function menuItems(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(".menu-item")];
}

export function openMenu(el: HTMLElement, triggerEl: HTMLElement, entries: MenuEntry[]): void {
  closeMenu();

  entries.forEach((entry) => el.append(buildMenuItem(entry)));

  anchorEl = triggerEl;
  menuEl = el;
  triggerEl.setAttribute("aria-expanded", "true");
  el.hidden = false;
  positionMenu(el, triggerEl);

  const items = menuItems(el);
  // An empty menu is a caller bug. The untyped version read items[0] off an
  // empty array and threw on .focus() of undefined; this says what went wrong.
  const checked = items.find((item) => item.getAttribute("aria-checked") === "true");
  const focusTarget = checked ?? items[0];
  if (!focusTarget) {
    throw new Error("openMenu called with no entries");
  }
  focusTarget.focus();
}

// Clicking a trigger that is already showing its menu closes it, so every
// caller wiring a trigger wants this rather than openMenu() directly.
export function toggleMenu(el: HTMLElement, triggerEl: HTMLElement, entries: MenuEntry[]): void {
  if (anchorEl === triggerEl) {
    closeMenu();
    return;
  }
  openMenu(el, triggerEl, entries);
}

function moveMenuFocus(step: number): void {
  if (!menuEl) {
    return;
  }
  const items = menuItems(menuEl);
  if (!items.length) {
    return;
  }
  const active = document.activeElement;
  const current = active instanceof HTMLElement ? items.indexOf(active) : -1;
  items[(current + step + items.length) % items.length]?.focus();
}

// Escape and the arrow keys, plus click-outside. Wired once at startup so
// popup.ts does not have to carry menu concerns in its event setup.
export function installMenuDismissal(): void {
  document.addEventListener("keydown", (event) => {
    if (!anchorEl) {
      return;
    }
    if (event.key === "Escape") {
      const triggerEl = anchorEl;
      closeMenu();
      triggerEl.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveMenuFocus(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveMenuFocus(-1);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!anchorEl || !menuEl) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && menuEl.contains(target)) {
      return;
    }
    if (target === anchorEl) {
      return;
    }
    closeMenu();
  });
}
