"use client";

import { ButtonLink } from "@/components/Button";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState, ListSkeleton, PageHeader, Section } from "@/components/Page";
import { TaskList, TaskRow } from "@/components/TaskRow";
import { useTaskActions } from "@/components/useTaskActions";
import { useClock } from "@/lib/clock";
import { dayName, formatDay, toKey } from "@/lib/dates";
import { useStore, type Task } from "@/lib/store";

/** What you finished, grouped by the day you finished it. */
export function DoneView() {
  const store = useStore();
  const clock = useClock();
  const actions = useTaskActions();
  if (!store || !clock) return <ListSkeleton />;

  const { today } = clock;
  const done = store.data.tasks.filter((t) => t.done && t.doneAt);
  const byDay = new Map<string, Task[]>();
  for (const task of done) {
    const day = toKey(new Date(task.doneAt!));
    byDay.set(day, [...(byDay.get(day) ?? []), task]);
  }
  const days = [...byDay.keys()].sort().reverse();

  return (
    <>
      <PageHeader title="Done" subtitle={done.length ? `${done.length} finished so far.` : undefined} />
      {days.length === 0 ? (
        <EmptyState title="Finished tasks show up here.">
          <ButtonLink href="/">Check one off on Today</ButtonLink>
        </EmptyState>
      ) : (
        <>
          {days.map((day) => {
            const name = dayName(day, today);
            const tasks = byDay.get(day)!.sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
            return (
              <Section key={day} title={`${name === formatDay(day) ? name : `${name} · ${formatDay(day)}`} · ${tasks.length}`}>
                <TaskList label={`Finished ${formatDay(day)}`}>
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </TaskList>
              </Section>
            );
          })}
          <ConfirmButton
            className="self-start"
            question={`Delete all ${done.length} finished tasks?`}
            confirmLabel="Yes, delete"
            onConfirm={() => actions.letGo(done)}
          >
            Clear finished tasks
          </ConfirmButton>
        </>
      )}
    </>
  );
}
