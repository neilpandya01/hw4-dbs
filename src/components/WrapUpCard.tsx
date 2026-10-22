"use client";

import { addDays, ageLabel } from "@/lib/dates";
import { dismissWrapUp, plannedDay, type Task } from "@/lib/store";
import { Button } from "./Button";
import { TaskActions } from "./TaskActions";
import { useTaskActions } from "./useTaskActions";

/** Step 4: after the wrap-up time, decide what happens to what's left. Ignoring it is fine too. */
export function WrapUpCard({ leftovers, today }: { leftovers: Task[]; today: string }) {
  const actions = useTaskActions();
  const tomorrow = addDays(today, 1);

  return (
    <section aria-labelledby="wrap-up-title" className="flex flex-col gap-4 rounded-2xl border border-accent bg-accent-soft p-4">
      <div className="flex flex-col gap-1">
        <h2 id="wrap-up-title" className="text-lg font-semibold text-ink">
          Wrap up your day
        </h2>
        <p className="text-sm text-ink">
          {leftovers.length} left. What should happen to {leftovers.length === 1 ? "it" : "them"}?
        </p>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Tasks left today">
        {leftovers.map((task) => (
          <li key={task.id} className="flex flex-col gap-1.5 rounded-xl bg-surface px-3 py-2.5">
            <div className="flex flex-col">
              <span className="break-words text-ink">{task.title}</span>
              {plannedDay(task) < today && <span className="text-sm text-muted">{ageLabel(plannedDay(task), today)}</span>}
            </div>
            <TaskActions
              task={task}
              today={today}
              before={
                <Button variant="ghost" size="sm" onClick={() => actions.move([task], tomorrow, "Tomorrow")}>
                  Keep for tomorrow
                </Button>
              }
              after={
                <Button variant="danger" size="sm" onClick={() => actions.letGo([task])}>
                  Let it go
                </Button>
              }
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => actions.move(leftovers, tomorrow, "Tomorrow")}>Move all to tomorrow</Button>
        <Button
          variant="secondary"
          onClick={() => dismissWrapUp(today)}
        >
          Not now
        </Button>
      </div>
    </section>
  );
}
