import * as Switch from '@radix-ui/react-switch';
import { useEffect, useState } from 'react';
import { defaultLabel, firstSubType, looksLikeSecret } from '@/src/core/memo_utils';
import { EMemoType, IMemo, MEMO_TYPE_LABELS, MemoSubType } from '@/src/core/types/memos';
import { MEMO_EXAMPLE_BODIES, MEMO_TITLE_PLACEHOLDERS, MEMO_TYPE_DOT } from './constants';
import { MemoBodyField } from './MemoBodyField';
import { MemoCreateNew } from './MemoCreateNew';
import { MemoRow } from './MemoRow';
import { MemoSecretWarning } from './MemoSecretWarning';

const SAVED_MS = 1600;

const TYPES: readonly EMemoType[] = [EMemoType.GIT, EMemoType.DATABASE, EMemoType.CONFIG, EMemoType.SHELL, EMemoType.NOTE];

const CONFIRM_MS = 3000;

type Props = {
  draft: IMemo;
  editing: boolean;
  onSave: (memo: IMemo) => void;
  onDelete: () => void;
  onBack: () => void;
};

export function MemoEditor({ draft: initial, editing, onSave, onDelete, onBack }: Props): React.JSX.Element {
  const [draft, setDraft] = useState<IMemo>(() => {
    if (initial.content === '') {
      return { ...initial, content: MEMO_EXAMPLE_BODIES[initial.type] };
    }
    return initial;
  });
  const [bodyEdited, setBodyEdited] = useState(initial.content !== '');
  const [saved, setSaved] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => {
      setSaved(false);
      onBack();
    }, SAVED_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [saved, onBack]);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => {
      setArmed(false);
    }, CONFIRM_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [armed]);

  const pickType = (type: EMemoType): void => {
    setDraft((current) => {
      const next: IMemo = { ...current, type, subType: firstSubType(type) };
      if (!bodyEdited) {
        next.content = MEMO_EXAMPLE_BODIES[type];
      }
      return next;
    });
  };

  const save = (): void => {
    if (draft.content.trim() === '') {
      return;
    }
    const label = draft.label.trim() === '' ? defaultLabel(draft.type) : draft.label.trim();
    onSave({ ...draft, label });
    setSaved(true);
  };

  const canSave = draft.content.trim() !== '';

  // Cmd/Ctrl+Enter, because a bare Enter stays a newline in the textarea.
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onBack();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col" onKeyDown={onKeyDown}>
      <div className="flex-none flex items-center gap-[10px] px-[12px] pb-[10px]">
        <button
          className="flex-none w-[28px] h-[28px] rounded-[8px] border border-line text-[13px] leading-none text-dim hover:text-ink hover:bg-chip"
          type="button"
          title="Back to the library"
          aria-label="Back to the library"
          onClick={onBack}
        >
          ←
        </button>
        <span className="flex-1 min-w-0 text-[13px] font-medium">{editing ? 'Edit memo' : 'New memo'}</span>
        {editing ? (
          <button
            className={`flex-none h-[28px] px-[9px] rounded-[8px] text-[11px] font-medium leading-none ${
              armed ? 'text-danger-ink' : 'text-dim hover:text-danger-ink'
            }`}
            type="button"
            title="Delete this memo"
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              onDelete();
            }}
          >
            {armed ? 'Confirm delete' : 'Delete'}
          </button>
        ) : null}
        <button
          className={`flex-none h-[28px] px-[11px] rounded-[8px] border text-[11px] font-medium leading-none ${
            saved
              ? 'border-teal text-teal'
              : 'border-line text-dim hover:text-ink hover:bg-chip disabled:opacity-[0.35] disabled:cursor-default'
          }`}
          type="button"
          disabled={!canSave}
          onClick={save}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[14px] px-[12px] pb-[14px]">
        <div className="flex flex-wrap items-center gap-[6px]">
          {TYPES.map((type) => {
            const on = draft.type === type;
            return (
              <button
                key={type}
                className={`flex-none inline-flex items-center gap-[5px] h-[26px] px-[10px] rounded-[7px] border text-[11px] font-medium leading-none ${
                  on ? 'bg-ink text-surface border-ink' : 'border-line text-dim hover:text-ink'
                }`}
                type="button"
                onClick={() => {
                  pickType(type);
                }}
              >
                <span className={`flex-none w-[6px] h-[6px] rounded-full ${MEMO_TYPE_DOT[type]}`} />
                {MEMO_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[10px] font-mono tracking-[0.12em] text-dim" htmlFor="memo-title">
            TITLE
          </label>
          <input
            id="memo-title"
            className="w-full h-[30px] rounded-[7px] border border-line bg-surface px-[9px] text-[12.5px] text-ink outline-0 placeholder:text-dim"
            type="text"
            value={draft.label}
            placeholder={MEMO_TITLE_PLACEHOLDERS[draft.type]}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setDraft((current) => {
                return { ...current, label: event.target.value };
              });
            }}
          />
        </div>

        <MemoCreateNew
          type={draft.type}
          subType={draft.subType}
          onChange={(subType: MemoSubType) => {
            setDraft((current) => {
              return { ...current, subType };
            });
          }}
        />

        <MemoBodyField
          type={draft.type}
          value={draft.content}
          onChange={(content) => {
            setBodyEdited(true);
            setDraft((current) => {
              return { ...current, content };
            });
          }}
        />

        {looksLikeSecret(draft.content) ? <MemoSecretWarning /> : null}

        <div className="flex items-center gap-[10px] min-h-[36px]">
          <span className="flex-1 min-w-0 text-[12.5px]" id="memo-pin-label">
            Pin to the top
          </span>
          <Switch.Root
            id="memo-pin"
            className="group flex-none relative w-[30px] h-[18px] rounded-[9px] bg-track transition-[background] duration-[150ms] data-[state=checked]:bg-teal"
            checked={draft.isPinned}
            aria-labelledby="memo-pin-label"
            onCheckedChange={(checked) => {
              setDraft((current) => {
                return { ...current, isPinned: checked };
              });
            }}
          >
            <Switch.Thumb className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-surface shadow-knob transition-[left] duration-[150ms] group-data-[state=checked]:left-[14px]" />
          </Switch.Root>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="text-[10px] font-mono tracking-[0.12em] text-dim">PREVIEW IN LIBRARY</div>
          <div className="rounded-[9px] border border-line bg-surface overflow-hidden">
            <MemoRow
              row={{ ...draft, label: draft.label.trim() === '' ? defaultLabel(draft.type) : draft.label }}
              copied={false}
              preview
              onCopy={() => {
                return;
              }}
              onOpen={() => {
                return;
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
