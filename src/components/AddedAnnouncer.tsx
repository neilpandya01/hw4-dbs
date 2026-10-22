"use client";

import { dayName, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";

/** Screen readers can't see the "Just added" highlight, so say it out loud instead. */
export function AddedAnnouncer() {
  const store = useStore();
  const task = store?.lastAddedId ? store.data.tasks.find((t) => t.id === store.lastAddedId) : undefined;
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {task ? `Added "${task.title}" to ${dayName(task.date, todayKey())}.` : ""}
    </div>
  );
}
