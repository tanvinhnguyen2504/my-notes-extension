export function MemoSecretWarning(): React.JSX.Element {
  return (
    <div className="rounded-[7px] bg-warn-bg px-[10px] py-[8px] text-[11px] leading-[1.4] text-warn-ink">
      This looks like a password or token. Remove it before saving.
    </div>
  );
}
