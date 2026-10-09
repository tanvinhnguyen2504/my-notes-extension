# Phase 5 — Radix primitives, and deleting `menu.ts`

## Goal

Replace the hand-rolled popover and switches with Radix, deleting
`src/ui/menu.ts` entirely.

## Tasks

- [ ] `npm i @radix-ui/react-dropdown-menu@2.1.25 @radix-ui/react-switch@1.3.8 @radix-ui/react-collapsible`
- [ ] `src/components/PriorityMenu.tsx`: `DropdownMenu` with
      `DropdownMenu.Trigger` on the priority tag and a
      `DropdownMenu.RadioGroup` of `DropdownMenu.RadioItem` built from
      `PRIORITY_ORDER` and `PRIORITY_LABELS`.
- [ ] Keep `data-priority` on each menu item — `popup.css` colours the swatch
      from `.menu-item[data-priority]`, and that is a contract until phase 7.
- [ ] Drop `side="bottom"`, `align="start"`, `sideOffset={2}` and
      `collisionPadding={6}` onto `DropdownMenu.Content` to reproduce the current
      geometry, including the flip-above-when-no-room behaviour that
      `positionMenu()` hand-rolled.
- [ ] `src/components/SettingSwitch.tsx`: a `Switch.Root` + `Switch.Thumb`
      wrapper used by all three settings toggles, styled from `data-state`
      rather than `aria-checked`.
- [ ] `src/components/SettingsPanel.tsx`: `Collapsible` driving the panel, with
      the gear chip as `Collapsible.Trigger`, plus the reminder-time row shown
      only when the reminder is enabled.
- [ ] Wire the trigger's `aria-expanded` through Radix rather than by hand —
      `Collapsible.Trigger` sets it.
- [ ] **Delete `src/ui/menu.ts`.** Confirm nothing imports it.
- [ ] Delete the `#priority-menu` container from `entrypoints/popup.html` if
      phase 4 left it. Radix portals its own content.
- [ ] `npm run check`.

## Implementation notes

- This is the phase with the clearest payoff: 129 lines of popover mechanics —
  `positionMenu` with its viewport maths, `moveMenuFocus` with the arrow-key
  wrap-around, the `keydown` and `pointerdown` document listeners, the
  `anchorEl`/`menuEl` module state — all replaced by a primitive that also
  handles focus trapping, typeahead and scroll-locking that the hand-rolled
  version never did.
- **Radix portals `DropdownMenu.Content` to `document.body` by default**, outside
  the React root and outside `#root`. Two consequences: `popup.css` selectors
  scoped under a root element would stop matching (check `.menu` and
  `.menu-item` are not nested selectors), and the popup's `data-theme` must be on
  `documentElement` — which phase 4 already ensures — or the portalled menu
  renders in the wrong theme. **This is the most likely visible bug in this
  phase.**
- `listEl.addEventListener("scroll", closeMenu)` exists today so the menu does
  not float away from a scrolled row. Radix handles reposition-on-scroll itself;
  confirm it does rather than porting the listener, and only add
  `onScroll`-driven dismissal if the behaviour actually differs.
- The three switches are `role="switch"` with `aria-checked` today. Radix's
  `Switch` uses `role="switch"` plus `data-state="checked" | "unchecked"` and
  sets `aria-checked` itself. `popup.css` currently styles `.switch` and `.knob`
  off `aria-checked`; those rules need to read `data-state` from this phase, not
  phase 7 — otherwise the toggles look dead for three phases.
- `Collapsible` over a conditional render, because the panel keeps its
  Escape-to-close behaviour and Radix gives `data-state` to style from. The
  trade-off is that the panel stays mounted when closed; with three switches
  that costs nothing.
- Radix is the largest single dependency added in this plan. `@radix-ui/react-dropdown-menu`
  pulls in Floating UI and a dozen internal packages. Record the delta here so
  phase 8's budget has a per-dependency breakdown rather than one number.

## Verify

Manual, against the pre-migration popup:

- Priority menu opens from the tag; the current level is pre-selected and
  focused; the swatch colours are right for all three levels.
- Keyboard: ArrowDown/ArrowUp move through the items and wrap, Enter selects,
  Escape closes and returns focus to the trigger, Tab behaves sanely.
- Outside-click dismisses. Clicking the trigger while open closes it rather than
  reopening.
- Open the menu on a row near the bottom of a scrolled list and confirm it flips
  above rather than being clipped — the behaviour `positionMenu()` hand-rolled.
- Scroll the list with the menu open: it repositions or dismisses, and does not
  float away from its row.
- Picking a level resorts the list and the menu closes.
- **Dark mode with the menu open** — the portal case. Switch to dark, open the
  menu, confirm it is themed. Then do it after a theme toggle without reloading.
- All three settings switches toggle, look correct in both themes, and announce
  correctly (check `aria-checked` in the inspector, which Radix should be
  setting).
- Settings panel opens and closes from the gear, Escape closes it, and
  `aria-expanded` on the trigger tracks.
- Reminder time row appears only when the reminder is on; the time persists.
- `grep -rn "ui/menu" src entrypoints` returns nothing.
