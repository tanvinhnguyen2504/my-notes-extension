// memos/MemoEmptyState's shape and type scale. It keeps the query in the
// message, which MemoEmptyState does not, because the spec asks for
// `Nothing matches "<query>"` by name.

export function EnglishEmptyState({ query }: { query: string }): React.JSX.Element {
  const needle = query.trim();

  return (
    <div className="flex flex-col items-center justify-center gap-[6px] py-[46px] text-center">
      <div className="text-[13px] text-ink">{needle ? `Nothing matches “${needle}”` : 'Nothing saved yet'}</div>
      <div className="text-[11.5px] text-dim">
        {needle ? 'You can add it below, or clear the search.' : 'Type an English word or sentence below and press Enter.'}
      </div>
    </div>
  );
}
