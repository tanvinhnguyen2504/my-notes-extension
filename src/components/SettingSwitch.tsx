// Radix sets role="switch" and aria-checked itself, and adds
// data-state="checked" | "unchecked", which is the hook the utilities below
// use. The Root is a `group` so the knob can read the Root's state.
//
// A bare button rather than a checkbox: the row is the label, and role=switch
// plus aria-checked carries the state to a screen reader without a second
// element.

import * as Switch from '@radix-ui/react-switch';

export interface SettingSwitchProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}

export function SettingSwitch({ id, label, hint, checked, onToggle }: SettingSwitchProps): React.JSX.Element {
  const labelId = `${id}-label`;
  return (
    <div className="flex items-center gap-[10px] min-h-[36px]">
      <span className="flex-1 min-w-0 text-[12.5px]" id={labelId}>
        {label}
        {hint ? <span className="block mt-[2px] text-[10.5px] text-dim">{hint}</span> : null}
      </span>
      <Switch.Root
        id={id}
        className="group flex-none relative w-[36px] h-[20px] rounded-[10px] bg-track transition-[background] duration-[150ms] ease-[ease] data-[state=checked]:bg-teal"
        checked={checked}
        onCheckedChange={onToggle}
        aria-labelledby={labelId}
      >
        <Switch.Thumb className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-surface shadow-knob transition-[left] duration-[150ms] ease-[ease] group-data-[state=checked]:left-[18px]" />
      </Switch.Root>
    </div>
  );
}
