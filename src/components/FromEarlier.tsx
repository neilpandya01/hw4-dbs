"use client";

import { ageLabel } from "@/lib/dates";
import { plannedDay, type Task } from "@/lib/store";
import { Button } from "./Button";
import { TaskList, TaskRow } from "./TaskRow";
import { useTaskActions } from "./useTaskActions";

/**
 * Today page only: tasks that weren't done on an earlier day and rolled over to today on their own.
 * A separate, tinted group so it's clear why they're here. Each shows the day it was first planned.
 * (At a Glance and the Calendar just put these at the top of today's list.)
 */
export function FromEarlier({ tasks, today }: { tasks: Task[]; today: string }) {
  const actions = useTaskActions();

  return (
    <section
      aria-labelledby="rolled-over-title"
      className="flex flex-col gap-3 rounded-2xl border border-warn/40 bg-warn-soft p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rolled-over-title" className="font-semibold text-warn">
          Rolled over · {tasks.length}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => actions.move(tasks, today, "Today")}>
          Move all to today
        </Button>
      </div>
      <p className="-mt-2 text-sm text-warn">Not done on an earlier day, so these moved to today.</p>
      <TaskList label="Rolled over from earlier days">
        {tasks.map((task) => (
          // One action for the group (Move all to today). For a single task: check it off, or Edit to move or delete it.
          <TaskRow key={task.id} task={task} meta={ageLabel(plannedDay(task), today)} />
        ))}
      </TaskList>
    </section>
  );
}
