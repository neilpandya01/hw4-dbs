"use client";

import { deleteTasks, moveTasks, type Task } from "@/lib/store";
import { useToast } from "./Toast";

const describe = (tasks: Task[]) => (tasks.length === 1 ? `"${tasks[0].title}"` : `${tasks.length} tasks`);

/** Moves and deletes, each confirmed with an Undo toast instead of a dialog. */
export function useTaskActions() {
  const toast = useToast();
  return {
    move(tasks: Task[], date: string, where: string) {
      const undo = moveTasks(tasks.map((t) => t.id), date);
      toast(`Moved ${describe(tasks)} to ${where}`, undo);
    },
    letGo(tasks: Task[]) {
      const undo = deleteTasks(tasks.map((t) => t.id));
      toast(`Deleted ${describe(tasks)}`, { undo, seconds: 10 });
    },
  };
}
