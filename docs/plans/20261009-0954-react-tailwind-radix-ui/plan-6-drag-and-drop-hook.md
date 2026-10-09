# Phase 6 — Drag and drop as a hook

## Goal

Port `src/ui/drag-drop.ts` into a React hook that keeps native HTML5 events and
keeps hover markers out of React state, then delete the imperative controller.

## Tasks

- [ ] `src/hooks/useDragDrop.ts` exposing `onRowDrop` / `onGroupDrop` callbacks
      and returning prop-getters: `rowProps(index, dayKey)` and
      `groupProps(dayKey)`, each returning the five / three drag handlers.
- [ ] Keep the dragged index in a **`useRef`, not `useState`**. It changes on
      `dragstart` and `dragend` and must not cause a render.
- [ ] Keep the marker classes applied with `classList` via the event's own
      `currentTarget`, not by rendering. `dragover` fires continuously; rendering
      from it is the one thing this hook must not do.
- [ ] Port verbatim, with the comments: `preventDefault()` on `dragover` or the
      drop never fires; `dataTransfer.setData()` or Firefox refuses to start the
      drag; `dataTransfer` may be null, guarded *after* the drag state is set;
      the drop side read back off the marker class rather than recomputed.
- [ ] Keep `dropSide()` and `insertionIndex()` as exported pure functions. They
      are DOM-light and testable, and `insertionIndex` is the bridge to
      `moveItem`'s coordinate system.
- [ ] Wire `onRowDrop` to dispatch `REASSIGN_DAY` then `MOVE_ITEM`, and
      `onGroupDrop` to dispatch `REASSIGN_DAY` — the same order as today's two
      callbacks.
- [ ] Suspend and resume `draggable` while the inline editor is open. In React
      this is a prop on the row driven by the editing state, not a method call:
      `draggable={!isEditing}`.
- [ ] Clear all markers on `dragend` and on `drop`, including on rows the pointer
      passed over.
- [ ] **Delete `src/ui/drag-drop.ts`** and, if it is now empty, the `src/ui/`
      directory.
- [ ] `npm run check`.

## Implementation notes

- The whole point of this phase is that it is **not** a rewrite. The current
  module works, its traps are documented, and the gesture is tuned. The hook is
  a container for the same code with the module-level `let draggedIndex` becoming
  a ref and the `addEventListener` calls becoming returned props.
- Two renders-per-drag budget: one on `drop` (the list changed) and nothing else.
  If React DevTools shows renders during `dragover`, the hover state has leaked
  into React and the trap is back.
- `classList` manipulation on nodes React owns is normally wrong, because the
  next render overwrites it. Here it is safe *because* nothing renders during the
  drag, and markers are cleared on `drop` before the render that follows. Put
  that reasoning in a comment — it is the kind of thing a later reader
  "corrects".
- `draggable={!isEditing}` moves the suspend/resume from an imperative call to
  derived state, which is a genuine simplification. It is also the one place the
  hook's shape differs from the module's, so check that starting an edit mid-list
  does not leave a neighbouring row undraggable.
- Marker classes are `popup.css` contracts (`.dragging`, `.drop-before`,
  `.drop-after`, `.drop-into`) until phase 7. Keep the exact strings.
- Drop targets include group headers, which are a different component from rows.
  `groupProps` must be spread onto the `.group-head` element specifically — the
  current code attaches to `head`, not to the whole `.group` section, and
  widening that would change which drops land.

## Verify

Manual, and this is the phase where manual verification carries the most weight
— there is no automated coverage of a drag gesture:

- Drag a row up and down within one group and confirm it lands where the marker
  showed, both above and below the midpoint of the target row.
- Drag to the first and last positions in a group.
- Drag onto another day's group header: the row reschedules and does not
  reorder.
- Drag onto the `UNSCHEDULED` group header: `dueDate` becomes `null` in storage,
  not `""`.
- Drag onto `TODAY` from `OVERDUE` and confirm the group counts update on both.
- Drop a row on itself: nothing happens, no stray marker.
- Start a drag and press Escape / drag outside the window: `dragend` clears the
  `dragging` class and every marker.
- Scroll the list mid-drag and confirm markers still track the right rows.
- Open an inline editor, then try to drag that row: it must not start. Close the
  editor; dragging works again. Check the neighbouring rows stayed draggable
  throughout.
- Reorder, then immediately double-click a row to edit: the editor opens on the
  row you clicked. This is the stable-key assertion from phase 1, exercised
  through the gesture most likely to break it.
- Reorder, close the popup, reopen: the order persisted.
- React DevTools profiler: record a drag across several rows and confirm the
  render count is 1, on the drop.
