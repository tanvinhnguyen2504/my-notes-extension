import { EMemoType, MemoSubType } from '@/src/core/types/memos';
import { MemoOptionRow } from './MemoOptionRow';

type Props = {
  subType: MemoSubType;
  onChange: (subType: MemoSubType) => void;
};

export function MemoCreateNewNote({ subType, onChange }: Props): React.JSX.Element {
  return <MemoOptionRow type={EMemoType.NOTE} subType={subType} onChange={onChange} />;
}
