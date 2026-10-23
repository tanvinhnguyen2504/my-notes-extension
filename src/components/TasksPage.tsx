import { useState } from 'react';
import { groupByDay } from '@/src/core/day_utils';
import { Action } from '@/src/core/reducer';
import { DayKey, State } from '@/src/core/types';
import { progressPercent } from '@/src/core/utils';
import { downloadCsv } from '@/src/features/export';
import { useDragDrop } from '@/src/hooks/useDragDrop';
import { Compose } from './Compose';
import { DayGroupSection } from './DayGroupSection';
import { EmptyState } from './EmptyState';
import { TaskHeader } from './TaskHeader';
import { PopupRow } from './PopupRow';
import { Progress } from './Progress';

interface TasksPageProps {
  state: State;
  dispatch: (action: Action) => boolean;
}

export function TasksPage({ state, dispatch }: TasksPageProps): React.JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);

  const { rowProps, groupProps } = useDragDrop({
    onRowDrop: ({ from, to, dayKey }) => {
      dispatch({ type: 'SET_DAY', index: from, dayKey });
      dispatch({ type: 'MOVE_ITEM', from, to });
    },
    onGroupDrop: ({ from, dayKey }) => {
      dispatch({ type: 'SET_DAY', index: from, dayKey });
    },
  });

  const groups = groupByDay(state.tasks);

  return (
    <>
      <TaskHeader
        state={state}
        onMarkAll={() => {
          dispatch({ type: 'MARK_ALL' });
        }}
        onClearAll={() => {
          dispatch({ type: 'CLEAR_ALL' });
        }}
        onExport={() => {
          downloadCsv(state.tasks);
        }}
      />

      <Progress percent={progressPercent(state.tasks)} />

      <main id="list" className="flex-1 min-h-0 overflow-y-auto py-[4px]">
        {state.tasks.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((group) => {
            const dayKey: DayKey | null = group.key || null;
            return (
              <DayGroupSection key={group.key} group={group} headProps={groupProps(dayKey)}>
                {group.entries.map(({ item, index }) => {
                  return (
                    <PopupRow
                      key={item.id}
                      item={item}
                      index={index}
                      dayKey={dayKey}
                      editing={editingId === item.id}
                      onStartEditing={() => {
                        setEditingId(item.id);
                      }}
                      onStopEditing={() => {
                        setEditingId(null);
                      }}
                      onToggle={() => {
                        dispatch({ type: 'TOGGLE_DONE', index });
                      }}
                      onDelete={() => {
                        dispatch({ type: 'DELETE_ITEM', index });
                      }}
                      onRename={(text) => {
                        dispatch({ type: 'RENAME_ITEM', index, text });
                      }}
                      onSetPriority={(priority) => {
                        dispatch({ type: 'SET_PRIORITY', index, priority });
                      }}
                      onSetDay={(key) => {
                        dispatch({ type: 'SET_DAY', index, dayKey: key });
                      }}
                      dragHandlers={rowProps(index, dayKey)}
                    />
                  );
                })}
              </DayGroupSection>
            );
          })
        )}
      </main>

      <Compose
        autoFocus
        onAdd={(text) => {
          return dispatch({ type: 'ADD_ITEM', text });
        }}
      />
    </>
  );
}
