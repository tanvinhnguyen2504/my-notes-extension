import { EMemoType, MemoSubType } from '@/src/core/types/memos';
import { MemoOptionRow } from './MemoOptionRow';

type Props = {
  subType: MemoSubType;
  onChange: (subType: MemoSubType) => void;
};

export function MemoCreateNewShell({ subType, onChange }: Props): React.JSX.Element {
  return <MemoOptionRow type={EMemoType.SHELL} subType={subType} onChange={onChange} />;
}
