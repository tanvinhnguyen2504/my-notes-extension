import { EMemoType, MemoSubType } from '@/src/core/types/memos';
import { MemoCreateNewConfig } from './MemoCreateNewConfig';
import { MemoCreateNewDatabase } from './MemoCreateNewDatabase';
import { MemoCreateNewNote } from './MemoCreateNewNote';
import { MemoCreateNewShell } from './MemoCreateNewShell';

type Props = {
  type: EMemoType;
  subType: MemoSubType;
  onChange: (subType: MemoSubType) => void;
};

export function MemoCreateNew({ type, subType, onChange }: Props): React.JSX.Element | null {
  switch (type) {
    // GIT has no option row; subType stays ANY_REPO via normalizeMemos.
    case EMemoType.GIT:
      return null;
    case EMemoType.DATABASE:
      return <MemoCreateNewDatabase subType={subType} onChange={onChange} />;
    case EMemoType.SHELL:
      return <MemoCreateNewShell subType={subType} onChange={onChange} />;
    case EMemoType.CONFIG:
      return <MemoCreateNewConfig subType={subType} onChange={onChange} />;
    case EMemoType.NOTE:
      return <MemoCreateNewNote subType={subType} onChange={onChange} />;
  }
}
