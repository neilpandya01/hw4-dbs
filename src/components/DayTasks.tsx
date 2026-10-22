"use client";

import type { Task } from "@/lib/store";
import { Button } from "./Button";
import { TaskList, TaskRow } from "./TaskRow";
import { useTaskActions } from "./useTaskActions";

/** Step 2 + 3: a day's list. Unfinished first, finished below, struck through. */
export function DayTasks({
  tasks,
  day,
  today,
  highlightId,
  label,
}: {
  tasks: Task[];
  day: string;
  today: string;
  highlightId?: string;
  label: string;
}) {
  const actions = useTaskActions();
  const isPast = day < today;

  return (
    <TaskList label={label}>
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          highlight={task.id === highlightId}
          actions={
            isPast && !task.done ? (
              <Button variant="ghost" size="sm" onClick={() => actions.move([task], today, "Today")}>
                Move to today
              </Button>
            ) : undefined
          }
        />
      ))}
    </TaskList>
  );
}
