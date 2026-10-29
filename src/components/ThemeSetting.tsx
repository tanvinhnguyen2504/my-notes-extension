// A radiogroup rather than Radix: no segmented primitive is installed, and the
// brief rules out new libraries. role="radiogroup" + aria-checked carries the
// state that Tabs.Trigger would otherwise provide.
//
// The track and the selected fill reuse Tab.tsx's treatment so the two
// segmented controls in the popup read as one component.

import { ThemePreference } from '@/src/core/types';
import { THEME_PREFERENCE } from '@/src/core/utils';

// The hover is scoped to the UNSELECTED segments on purpose. Bare
// `hover:text-ink` ties `aria-checked:text-on-teal` on specificity, and
// Tailwind sorts by property rather than by the order written -- so the
// selected segment's hover colour would be a coin toss.
const SEGMENT =
  'flex-1 h-[22px] px-[8px] rounded-[6px] text-[11px] font-medium leading-none text-dim ' +
  'aria-[checked=false]:hover:text-ink ' +
  'aria-checked:bg-teal aria-checked:text-on-teal aria-checked:shadow-segment';

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: THEME_PREFERENCE.SYSTEM, label: 'System' },
  { value: THEME_PREFERENCE.LIGHT, label: 'Light' },
  { value: THEME_PREFERENCE.DARK, label: 'Dark' },
];

interface ThemeSettingProps {
  value: ThemePreference;
  onChange: (preference: ThemePreference) => void;
}

export function ThemeSetting({ value, onChange }: ThemeSettingProps): React.JSX.Element {
  const labelId = 'set-theme-label';

  return (
    <div className="flex items-center gap-[10px] min-h-[36px]">
      <span className="flex-1 min-w-0 text-[12.5px]" id={labelId}>
        Theme
      </span>
      <div
        className="flex-none inline-flex gap-[2px] w-[168px] p-[3px] rounded-[9px] bg-chip"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {OPTIONS.map((option) => {
          return (
            <button
              key={option.value}
              id={`btn-theme-${option.value}`}
              className={SEGMENT}
              type="button"
              role="radio"
              aria-checked={option.value === value}
              onClick={() => {
                onChange(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
