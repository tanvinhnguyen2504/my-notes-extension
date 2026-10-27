# Phase 5 — Keyboard, focus and both popup widths

## Goal

Make the tab fully usable from the keyboard and correct at compact and wide
width, with no horizontal scroll in either.

## Tasks

- [ ] `EnglishPage.tsx`: a `keydown` listener on `document`, registered in an
      effect, that handles `/` (focus search, `preventDefault`) and `Escape`
      (clear the query, blur the search). It must ignore `/` while the target is
      an `<input>`.
- [ ] Verify the listener cannot collide with `MemosPage`'s identical `/` and
      `Esc` handling.
- [ ] Focus rings: confirm every new control shows the unlayered
      `:focus-visible` ring from `styles.css`, and add a rule there for any
      control that needs to hand its ring to a parent (the add bar's inputs, if
      the row treatment calls for it).
- [ ] Touch targets: both icon buttons 40×40; the `Add` button and both inputs
      at least 40 px tall; the `Delete` text button padded to 40 px of hit area
      even though its text is smaller.
- [ ] Compact width (380 px): the toolbar's search and 3-way filter must not
      overflow — stack them on two rows if one row cannot hold both. The row's
      text column gets `min-w-0` so a long sentence wraps instead of pushing the
      icon buttons out.
- [ ] Wide mode (`html[data-width='wide']`): check whether the `row` / `compose`
      class hooks in `styles.css` need English equivalents, and add them
      **unlayered** if so.
- [ ] A dark-theme pass over every new surface.

## Implementation notes

**The `/` and `Esc` collision is real and is why this is its own phase.**
`MemosPage` already registers a `document`-level `keydown` doing exactly this.
Radix `Tabs` unmounts the inactive panel, so only one of the two listeners is
ever mounted — which is what makes two identical handlers safe. That safety is
load-bearing and silent: if a later change keeps both panels mounted
(`forceMount`, or moving the panels out of Radix), `/` clears the wrong search
box. Note it in a comment at the listener.

**`Esc` must not close the popup instead.** In an extension popup `Escape`
dismisses the window, and a `keydown` handler that does not `preventDefault`
gets both behaviours — the query clears and the popup vanishes. Call
`preventDefault()` when there is a query to clear, and let the default through
when there is not, so `Esc` still closes an idle popup.

**Horizontal scroll comes from the row, not the page.** The icon buttons are
`flex-none`; the text column needs `min-w-0` or flexbox refuses to shrink it
below its content width and the buttons get pushed past the edge. This is the
same `min-height: 0` lesson `#root` already carries, on the other axis.

**Do not solve a toolbar overflow with utility ordering.** If search and filter
compete for width, the fix is `flex-wrap` plus explicit `basis`, not two
conflicting width utilities — Tailwind sorts by property, so equal-specificity
competitors are a coin toss.

**Any wide-mode rule goes unlayered.** `html[data-width='wide']` is an
*override* and must beat a utility; putting it in `@layer base` makes it lose,
silently and in a way grepping the stylesheet does not reveal.

## Verify

- With the English tab active: `/` focuses the search from anywhere, typing `/`
  *inside* an input types a slash, `Esc` with a query clears it and keeps the
  popup open, `Esc` with no query closes the popup.
- Switching to the Dev tab, `/` still focuses the memo search — one handler, not
  two.
- At 380 px and at the widest wide setting, no horizontal scrollbar appears and
  the longest seeded sentence wraps with both icon buttons still fully visible.
- Tabbing through the panel reaches, in order: search, the three filter buttons,
  each row's text button and its two icons, both add inputs, `Add` — each with a
  visible ring.
- `getComputedStyle` on both icon buttons reports 40 px in each dimension.
- Every new surface is legible in dark mode, and the plan's rule holds: no
  colour literal in any new `.tsx`.
