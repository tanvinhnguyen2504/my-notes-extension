import { el, query } from './core/dom.ts';
import { DayGroup, DayKey, Item } from './core/types.ts';
import {
  STORAGE_KEY,
  countDone,
  isAllDone,
  loadState,
  groupByDay,
  todayKey,
  moveItem,
  switchTheme,
  nextWidth,
  normalizeState,
  parseDraft,
  progressPercent,
  isTimeOfDay,
  saveState,
  setAllDone,
  sortByPriority,
  touchItem,
} from './core/utils.ts';
import { createDragController } from './ui/drag-drop.ts';
import { closeMenu, installMenuDismissal } from './ui/menu.ts';
import { installSettings, renderSettings } from './features/settings.ts';
import { attachPriorityTag } from './features/priority.ts';
import { attachDueChip } from './features/due-date.ts';
import { downloadCsv } from './features/export.ts';

const listEl = el('list');
const rowTemplate = el<HTMLTemplateElement>('row-tpl');
const countEl = el('count');
const progressEl = el('progress');
const draftEl = el<HTMLInputElement>('draft');
const settingsPanelEl = el('settings-panel');
const settingsButtonEl = el<HTMLButtonElement>('btn-settings');
const checkAllButtonEl = el<HTMLButtonElement>('btn-check-all');
const clearAllButtonEl = el<HTMLButtonElement>('btn-clear-all');
const exportButtonEl = el<HTMLButtonElement>('btn-export-csv');
const addButton = el<HTMLButtonElement>('add');
const groupTemplate = el<HTMLTemplateElement>('group-tpl');

const CLEAR_CONFIRM_MS = 3000;

// normalizeState rather than a literal, so every field the renderers read
// exists from the first frame.
let state = normalizeState(null);
let clearArmed = false;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
// The press that dismisses an editor also completes as a click on .body, which
// would toggle the row off a gesture meant as "close the editor". Holds the
// pressed element so that one click can be ignored.
let editorDismissedBy: Node | null = null;

// Checked rather than asserted: an emptied <template> in popup.html would
// otherwise be a blank list with no error.
function cloneTemplate(template: HTMLTemplateElement): HTMLElement {
  const clone = template.content.firstElementChild?.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    throw new Error(`template #${template.id} has no element to clone`);
  }
  return clone;
}

// Matched on the pressed element rather than a timer: the gap between mousedown
// and click is however long the user holds the button.
function consumeEditorDismissal(event: MouseEvent): boolean {
  if (!editorDismissedBy) {
    return false;
  }
  const pressedEl = editorDismissedBy;
  editorDismissedBy = null;
  const target = event.target;
  if (target === pressedEl) {
    return true;
  }
  return target instanceof Node && target.contains(pressedEl);
}

function renderEmptyState(): void {
  const empty = document.createElement('div');
  empty.className = 'empty';

  const heading = document.createElement('strong');
  heading.textContent = 'Nothing on the list';

  const hint = document.createElement('span');
  hint.textContent = 'Type below to add one. Start with ! to flag it high priority.';

  empty.append(heading, hint);
  listEl.append(empty);
}

// Controls inside .body that must not fall through to the done-toggle below.
const BODY_CONTROLS = '.del, .text, .tag, .due';

function renderRow(item: Item, index: number, dayKey: DayKey | null): HTMLElement {
  const row = cloneTemplate(rowTemplate);
  row.dataset.priority = String(item.priority);
  row.dataset.done = String(item.done);
  query(row, '.box').textContent = item.done ? '✓' : '';

  const textEl = query(row, '.text');
  textEl.textContent = item.text;
  // The label is a single ellipsised line, so the full text is only ever
  // readable from the tooltip.
  textEl.title = item.text;

  attachPriorityTag(query(row, '.tag'), item, (priority) => {
    touchItem(item).priority = priority;
    // Mutate, stamp, sort, re-render, in that order. The resort invalidates the
    // `index` every handler closed over, which saveAndRender() re-derives.
    // `item` is a reference, so it follows its own object through the sort.
    state.items = sortByPriority(state.items);
    saveAndRender();
  });
  attachDueChip(query(row, '.due'), query<HTMLInputElement>(row, '.due-input'), item, (dayKey) => {
    assignDay(index, dayKey);
    saveAndRender();
  });

  query(row, '.body').addEventListener('click', (event) => {
    if (consumeEditorDismissal(event)) {
      return;
    }
    // .text is the double-click edit target; toggling here would re-render the
    // row before dblclick could fire. The rest have their own handlers.
    const target = event.target;
    if (target instanceof Element && target.closest(BODY_CONTROLS)) {
      return;
    }
    item.done = !item.done;
    touchItem(item);
    saveAndRender();
  });
  textEl.addEventListener('dblclick', () => {
    startEditing(row, item);
  });

  query(row, '.del').addEventListener('click', () => {
    state.items.splice(index, 1);
    saveAndRender();
  });

  dragController.attachRow(row, index, dayKey);
  return row;
}

function renderGroup(group: DayGroup): void {
  const section = cloneTemplate(groupTemplate);
  section.dataset.key = group.key;
  section.dataset.overdue = String(!!group.key && group.key < todayKey());

  const head = query(section, '.group-head');
  query(head, '.group-label').textContent = group.label;
  query(head, '.group-date').textContent = group.date;
  query(head, '.group-count').textContent = `${group.done}/${group.entries.length}`;
  dragController.attachGroupHeader(head, group.key || null);

  group.entries.forEach(({ item, index }) => section.append(renderRow(item, index, group.key || null)));
  listEl.append(section);
}

// The only two places a completed drop is allowed to touch the list.
const dragController = createDragController({
  listEl,
  onRowDrop: ({ from, to, dayKey }) => {
    assignDay(from, dayKey);
    state.items = moveItem(state.items, from, to);
    saveAndRender();
  },
  onGroupDrop: ({ from, dayKey }) => {
    assignDay(from, dayKey);
    saveAndRender();
  },
});

// A drop into another day's group is a reassignment, not just a reorder.
function assignDay(index: number, dayKey: DayKey | null): void {
  const item = state.items[index];
  // Unreachable -- every index comes from a rendered row -- but returning beats
  // the TypeError the untyped version threw.
  if (!item) {
    return;
  }
  if ((item.dueDate || null) === dayKey) {
    return;
  }
  touchItem(item).dueDate = dayKey;
}

function disarmClear(): void {
  clearTimeout(clearTimer ?? undefined);
  clearTimer = null;
  clearArmed = false;
}

function renderActions(): void {
  const isEmpty = !state.items.length;
  // One button, two directions: once everything is ticked the only useful move
  // is to untick it.
  const allDone = isAllDone(state.items);
  checkAllButtonEl.disabled = isEmpty;
  checkAllButtonEl.textContent = allDone ? '✕ UNMARK ALL' : '✓ MARK ALL';
  checkAllButtonEl.title = allDone ? 'Clear every tick' : 'Mark everything done';
  checkAllButtonEl.dataset.allDone = String(allDone);
  clearAllButtonEl.disabled = isEmpty;
  exportButtonEl.disabled = isEmpty;
  clearAllButtonEl.textContent = clearArmed ? 'SURE?' : 'CLEAR';
  clearAllButtonEl.dataset.armed = String(clearArmed);
}

// Commits on Enter or blur, reverts on Escape. An emptied field is a cancel,
// not a delete.
function startEditing(row: HTMLElement, item: Item): void {
  const textEl = query(row, '.text');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit';
  input.value = item.text;
  input.spellcheck = false;

  dragController.suspendRow(row);

  // Capture phase, so it runs before the press blurs the input and settles.
  const notePress = (event: MouseEvent) => {
    const target = event.target;
    if (target instanceof Node && !input.contains(target)) {
      editorDismissedBy = target;
    }
  };
  document.addEventListener('mousedown', notePress, true);

  let settled = false;
  const settle = (commit: boolean) => {
    if (settled) {
      return;
    }
    settled = true;
    document.removeEventListener('mousedown', notePress, true);

    const nextText = input.value.trim();
    if (commit && nextText && nextText !== item.text) {
      item.text = nextText;
      touchItem(item);
      saveAndRender();
      return;
    }
    dragController.resumeRow(row);
    input.replaceWith(textEl);
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      settle(true);
    } else {
      if (event.key === 'Escape') {
      }
      settle(false);
    }
  });
  input.addEventListener('blur', () => {
    settle(true);
  });

  textEl.replaceWith(input);
  input.focus();
  input.select();
}

// Attributes on <html>, a contract with popup.css: renaming one here breaks the
// styling with no error anywhere.
function applyAppearance(): void {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.width = state.settings.width;
}

function renderProgress(): void {
  countEl.textContent = `${countDone(state.items)} of ${state.items.length}`;
  progressEl.style.width = `${progressPercent(state.items)}%`;
}

function render(): void {
  applyAppearance();
  renderProgress();
  renderActions();
  renderSettings(state);

  listEl.textContent = '';

  if (!state.items.length) {
    renderEmptyState();
    return;
  }
  groupByDay(state.items).forEach(renderGroup);
}

function saveAndRender(): void {
  saveState(state);
  render();
}

function addItem(): void {
  const item = parseDraft(draftEl.value);
  if (!item) {
    return;
  }

  state.items.push(item);
  draftEl.value = '';
  disarmClear();
  saveAndRender();
}

function handleEventListener(): void {
  addButton.addEventListener('click', addItem);
  draftEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      addItem();
    }
  });
  checkAllButtonEl.addEventListener('click', () => {
    state.items = setAllDone(state.items, !isAllDone(state.items));
    disarmClear();
    saveAndRender();
  });
  clearAllButtonEl.addEventListener('click', () => {
    if (!clearArmed) {
      clearArmed = true;
      clearTimer = setTimeout(() => {
        clearArmed = false;
        render();
      }, CLEAR_CONFIRM_MS);
      render();
      return;
    }
    disarmClear();
    state.items = [];
    saveAndRender();
  });
  // Backstop: a press that dismissed an editor without landing on a row would
  // otherwise leave the flag set and eat the next real click. document is above
  // .body, so this runs after it.
  document.addEventListener('click', () => {
    editorDismissedBy = null;
  });
  listEl.addEventListener('scroll', closeMenu);
  exportButtonEl.addEventListener('click', () => {
    downloadCsv(state.items);
  });
}

installMenuDismissal();
installSettings({
  panel: settingsPanelEl,
  trigger: settingsButtonEl,
  onToggleTheme: () => {
    state.theme = switchTheme(state.theme);
    saveAndRender();
  },
  onToggleWidth: () => {
    state.settings.width = nextWidth(state.settings.width);
    saveAndRender();
  },
  onToggleReminder: () => {
    state.settings.reminder.enabled = !state.settings.reminder.enabled;
    saveAndRender();
  },
  onPickReminderTime: (time) => {
    // Clearing the control reports "". Keep the last good time rather than
    // writing something the worker cannot schedule.
    if (!isTimeOfDay(time)) {
      return;
    }
    state.settings.reminder.time = time;
    saveAndRender();
  },
});

// The reminder window writes the same key, and loadState()'s .then replaces
// `state` wholesale -- without this, a tick there is undone by the next save.
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    const change = changes[STORAGE_KEY];
    if (area !== 'local' || !change) {
      return;
    }
    const incoming = normalizeState(change.newValue);
    // Fires for this popup's own writes too, and re-rendering would destroy an
    // open editor for nothing.
    if (JSON.stringify(incoming) === JSON.stringify(state)) {
      return;
    }
    state = incoming;
    render();
  });
}
handleEventListener();

loadState().then((savedState) => {
  state = savedState;
  render();
  draftEl.focus();
});
