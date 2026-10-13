// `currentColor` so the icon follows text-dim / text-teal from the caller --
// a colour literal in a .tsx file is the one thing the token system forbids.

type Props = {
  filled: boolean;
};

export function PinIcon({ filled }: Props): React.JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 17v5" strokeLinecap="round" />
      <path d="M9 3h6l-1 7 3 3v2H7v-2l3-3-1-7Z" fill={filled ? 'currentColor' : 'none'} strokeLinejoin="round" />
    </svg>
  );
}
