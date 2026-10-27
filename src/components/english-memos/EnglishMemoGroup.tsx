// The memo tab's PINNED / RECENT card, reused for SENTENCES / WORDS: a mono
// label above one bordered surface that the rows divide with hairlines. Returns
// null at zero so a filtered-out group leaves no empty card behind.

type Props = {
  label: string;
  count: number;
  children: React.ReactNode;
};

export function EnglishMemoGroup({ label, count, children }: Props): React.JSX.Element | null {
  if (count === 0) {
    return null;
  }
  return (
    <section className="mb-[12px]">
      <div className="px-[2px] pb-[6px] text-[10px] font-mono tracking-[0.12em] text-dim">{label}</div>
      <div className="rounded-[9px] border border-line bg-surface overflow-hidden">{children}</div>
    </section>
  );
}
