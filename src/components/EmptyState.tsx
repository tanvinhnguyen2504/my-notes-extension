export function EmptyState(): React.JSX.Element {
  return (
    <div className="py-[46px] px-[24px] text-center text-dim">
      <strong className="block mb-[6px] text-ink font-medium text-[13.5px]">Nothing on the list</strong>
      <span className="text-[12px] leading-[1.5]">
        Type below to add one. Start with ! to flag it high priority.
      </span>
    </div>
  );
}
