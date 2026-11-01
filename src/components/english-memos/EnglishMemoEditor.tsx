import { useEffect, useRef, useState } from 'react';
import { detectType, draftFromEnglishItem, EnglishDraft } from '@/src/core/english_utils';
import { ENGLISH_TYPE, EnglishItem } from '@/src/core/types/english';
import { EKeyboardKey } from '@/src/core/types/keyboard';

const FIELD =
  'w-full h-[30px] rounded-[7px] border border-line bg-surface px-[9px] [font:inherit] text-[12.5px] text-ink outline-0 placeholder:text-dim focus:border-teal';

const LABEL = 'flex-none w-[58px] text-[10px] font-mono tracking-[0.12em] text-dim';

const BUTTON = 'flex-none h-[28px] px-[11px] rounded-[8px] text-[11px] font-medium leading-none';

type Props = {
  item: EnglishItem;
  onSave: (draft: EnglishDraft) => void;
  onCancel: () => void;
};

export function EnglishMemoEditor({ item, onSave, onCancel }: Props): React.JSX.Element {
  // Seeded once from the item. A prop-synced draft would discard the user's
  // typing every time storage replayed the state from another window.
  const [draft, setDraft] = useState<EnglishDraft>(() => {
    return draftFromEnglishItem(item);
  });
  const enRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    enRef.current?.focus();
    enRef.current?.select();
  }, []);

  const ready = draft.en.trim().length > 0;

  // Re-read live from the SAME detectType the save will use, so the hint and
  // the group the row lands in cannot disagree.
  const willBeWord = detectType(draft.en.trim()) === ENGLISH_TYPE.WORD;
  const moving = willBeWord !== (item.type === ENGLISH_TYPE.WORD);

  const change = (field: keyof EnglishDraft, value: string): void => {
    setDraft((current) => {
      return { ...current, [field]: value };
    });
  };

  const save = (): void => {
    if (!ready) {
      return;
    }
    onSave(draft);
  };

  // Enter saves and Escape cancels from any field. The page shortcuts are
  // disabled while this is open, so Escape is ours to claim.
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === EKeyboardKey.ESCAPE) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== EKeyboardKey.ENTER || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    save();
  };

  return (
    <div className="flex flex-col gap-[6px] pb-[10px]">
      <div className="flex items-center gap-[8px]">
        <label className={LABEL} htmlFor={`english-edit-en-${item.id}`}>
          ENGLISH
        </label>
        <input
          id={`english-edit-en-${item.id}`}
          ref={enRef}
          className={FIELD}
          type="text"
          placeholder="English word or sentence"
          autoComplete="off"
          value={draft.en}
          onChange={(event) => {
            change('en', event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="flex items-center gap-[8px]">
        <label className={LABEL} htmlFor={`english-edit-vi-${item.id}`}>
          VIỆT
        </label>
        <input
          id={`english-edit-vi-${item.id}`}
          className={FIELD}
          type="text"
          placeholder="Nghĩa tiếng Việt"
          autoComplete="off"
          lang="vi"
          value={draft.vi}
          onChange={(event) => {
            change('vi', event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {/* The row only renders `pos` for a word, so offering it for a sentence
          would be a field whose value never appears anywhere. */}
      {willBeWord ? (
        <div className="flex items-center gap-[8px]">
          <label className={LABEL} htmlFor={`english-edit-pos-${item.id}`}>
            POS
          </label>
          <input
            id={`english-edit-pos-${item.id}`}
            className={FIELD}
            type="text"
            placeholder="v. / n. / adj."
            autoComplete="off"
            value={draft.pos}
            onChange={(event) => {
              change('pos', event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-[8px]">
        <label className={LABEL} htmlFor={`english-edit-example-${item.id}`}>
          EXAMPLE
        </label>
        <input
          id={`english-edit-example-${item.id}`}
          className={FIELD}
          type="text"
          placeholder="A sentence using it"
          autoComplete="off"
          value={draft.example}
          onChange={(event) => {
            change('example', event.target.value);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="flex items-center gap-[8px] pt-[2px]">
        <p className="flex-1 min-w-0 m-0 text-[10.5px] leading-[14px] text-teal italic">
          {moving ? `Will move to ${willBeWord ? 'WORDS' : 'SENTENCES'}.` : ''}
        </p>
        <button
          id={`btn-english-edit-cancel-${item.id}`}
          className={`${BUTTON} border border-line text-dim hover:text-ink hover:bg-chip`}
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          id={`btn-english-edit-save-${item.id}`}
          className={`${BUTTON} bg-teal text-on-teal font-semibold disabled:bg-chip disabled:text-dim disabled:cursor-default`}
          type="button"
          disabled={!ready}
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  );
}
