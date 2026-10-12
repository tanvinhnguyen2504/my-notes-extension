type Props = {
  filtered: boolean;
};

export function MemoEmptyState({ filtered }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-[6px] py-[46px] text-center">
      <div className="text-[13px] text-ink">{filtered ? 'Nothing matches' : 'No snippets yet'}</div>
      <div className="text-[11.5px] text-dim">
        {filtered ? 'Try another type or clear the search.' : 'Press + to save your first command.'}
      </div>
    </div>
  );
}
