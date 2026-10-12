import * as Tabs from '@radix-ui/react-tabs';

const TRIGGER =
  'flex flex-1 justify-center items-center gap-[4px] h-[26px] px-[10px] rounded-[7px] text-[12px] font-medium leading-none ' +
  'text-dim hover:text-ink ' +
  'data-[state=active]:bg-teal data-[state=active]:text-on-teal data-[state=active]:shadow-segment';

export function Tab(): React.JSX.Element {
  return (
    <Tabs.List className="w-full inline-flex gap-[2px] p-[3px] rounded-[9px] bg-chip" aria-label="Popup mode">
      <Tabs.Trigger value="tasks" className={TRIGGER}>
        <div className="text-center">Tasks</div>
      </Tabs.Trigger>
      <Tabs.Trigger value="memos" className={TRIGGER}>
        <div className="text-center">
          <span className="font-mono text-[11px]">&gt;_</span>
          Dev
        </div>
      </Tabs.Trigger>
    </Tabs.List>
  );
}
