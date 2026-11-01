export const ACTION = 'flex-none inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px]';

export const IDLE = 'text-dim hover:text-ink hover:bg-chip';

export const DANGER = 'text-danger-ink hover:bg-chip';

// Reveal-on-hover. An action that is currently *doing* something opts out by
// not using it -- which is why the copied pill carries no REVEAL.
export const REVEAL = 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100';

export const COPIED_PILL =
  'flex-none inline-flex items-center justify-center gap-[5px] h-[26px] min-w-[72px] px-[10px] rounded-[7px] ' +
  'bg-teal border border-teal text-on-teal text-[11.5px] font-medium leading-none';

// The copied tint has to read against --color-surface in both themes, so it is
// mixed from the teal token rather than being a second hard-coded colour.
export const COPIED_ROW = 'bg-[color-mix(in_oklch,var(--color-teal)_7%,transparent)]';
