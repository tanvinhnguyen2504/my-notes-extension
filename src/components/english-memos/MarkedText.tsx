import { parseBrackets } from '@/src/core/english_utils';

const MARK = 'rounded-[4px] px-[3px] bg-mark-bg text-mark-fg';

export function MarkedText({ en }: { en: string }): React.JSX.Element {
  const segments = parseBrackets(en);

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.marked) {
          return <span key={index}>{segment.text}</span>;
        }
        return (
          <span key={index} className={MARK}>
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
