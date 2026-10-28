import { detectType } from '@/src/core/english_utils';
import { ENGLISH_TYPE } from '@/src/core/types/english';

const INPUT =
  'min-w-0 h-[40px] px-[10px] rounded-[9px] border border-line bg-chip [font:inherit] text-[12.5px] text-ink placeholder:text-dim focus-within:border-teal';

type Props = {
  en: string;
  vi: string;
  enRef: React.RefObject<HTMLInputElement | null>;
  onEnChange: (value: string) => void;
  onViChange: (value: string) => void;
  onSave: () => void;
};

// The hint reads from the SAME detectType the save uses. A second heuristic
// inline here is a rule that can drift from what actually gets stored.
function hintWhenInputEnglishMemo(en: string): string {
  const trimmed = en.trim();
  if (!trimmed) {
    return '';
  }
  if (detectType(trimmed) === ENGLISH_TYPE.WORD) {
    return 'Will be saved as a word.';
  }
  return 'Will be saved as a sentence. Tip: put parts you change in [brackets].';
}

export function EnglishAddBar({ en, vi, enRef, onEnChange, onViChange, onSave }: Props): React.JSX.Element {
  const ready = en.trim().length > 0;

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return;
    }
    if (!ready) {
      return;
    }
    onSave();
  };

  return (
    <section className="flex-none px-[12px] pt-[8px] pb-[10px] bg-surface border-t border-line">
      <div className="flex items-center gap-[8px]">
        <input
          id="english-add-en"
          ref={enRef}
          className={`${INPUT} flex-[3]`}
          type="text"
          placeholder="English word or sentence"
          aria-label="English word or sentence"
          autoComplete="off"
          value={en}
          onChange={(event) => {
            onEnChange(event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <input
          id="english-add-vi"
          className={`${INPUT} flex-[2]`}
          type="text"
          placeholder="Nghĩa tiếng Việt"
          aria-label="Nghĩa tiếng Việt"
          autoComplete="off"
          lang="vi"
          value={vi}
          onChange={(event) => {
            onViChange(event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          id="btn-english-add"
          className="flex-none h-[40px] px-[12px] rounded-[9px] bg-teal text-on-teal text-[12px] font-semibold disabled:bg-chip disabled:text-dim disabled:cursor-default"
          type="button"
          disabled={!ready}
          onClick={onSave}
        >
          Add
        </button>
      </div>

      {hintWhenInputEnglishMemo(en) && (
        <p className="m-0 mt-[6px] h-[14px] text-[10.5px] leading-[14px] text-teal italic">{hintWhenInputEnglishMemo(en)}</p>
      )}
    </section>
  );
}
