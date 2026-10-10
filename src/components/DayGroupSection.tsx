import { todayKey } from '../core/day_utils.ts';
import { DayGroup } from '../core/types/day.ts';

export interface DayGroupSectionProps {
  group: DayGroup;
  headProps: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
}

export function DayGroupSection({ group, headProps, children }: DayGroupSectionProps): React.JSX.Element {
  return (
    <section
      className="group block mt-[2px] first:mt-0"
      data-key={group.key}
      data-overdue={String(!!group.key && group.key < todayKey())}
    >
      {/* Sticky against the list, which is the scroll container. `group-head`
          stays as a bare class hook: useDragDrop adds `drop-into` to it. */}
      <header
        className="group-head sticky top-0 z-[2] flex items-center gap-[7px] pt-[7px] px-[12px] pb-[6px] bg-bg border-b border-hair text-[9.5px] font-medium leading-none tracking-[0.08em] text-dim"
        {...headProps}
      >
        <span className="text-ink group-data-[key='']:text-clay-ink group-data-[overdue=true]:text-clay-ink">
          {group.label}
        </span>
        <span className="flex-1">{group.date}</span>
        <span className="flex-none">
          {group.done}/{group.entries.length}
        </span>
      </header>
      {children}
    </section>
  );
}
