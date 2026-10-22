"use client";

import { useRef, useState } from "react";
import { addTask, type Task } from "@/lib/store";
import { farFutureWarning, similarWarning, validateTask, type TaskErrors } from "@/lib/validate";

/**
 * The add-a-task rules shared by quick-add, the /add form, and onboarding:
 * hard errors block; soft warnings ("too similar", "more than a year away") block once,
 * and the second submit adds it. What the person typed is never cleared on an error.
 */
/** `button` is the submit button's label, so soft warnings can say "press Add again". */
export function useTaskDraft(button = "Add") {
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<TaskErrors>({});
  const [warning, setWarning] = useState<{ message: string; match: Task }>();
  const [dateWarning, setDateWarning] = useState<string>();
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const lastAddedAt = useRef(0);

  function changeTitle(value: string) {
    setTitle(value);
    if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
    setWarning(undefined);
  }

  /** Call when the day changes, so its error and warning don't linger. */
  function changeDay() {
    setErrors((e) => ({ ...e, date: undefined }));
    setDateWarning(undefined);
  }

  /** Returns the new task's id when it was added, otherwise the errors to focus. */
  function submit(date: string, today: string, tasks: Task[]): { id?: string; errors: TaskErrors } {
    // An extra Enter right after adding shouldn't flash "Enter a task name."
    if (!title.trim() && Date.now() - lastAddedAt.current < 1500) return { errors: {} };

    const found = validateTask(title, date, today);
    setErrors(found);
    if (found.title || found.date) return { errors: found };

    const key = (kind: string) => `${kind}|${title.trim()}|${date}`;
    const similar = similarWarning(title, date, tasks, { button });
    if (similar && !acknowledged.includes(key("similar"))) {
      setWarning(similar);
      setAcknowledged((a) => [...a, key("similar")]);
      return { errors: {} };
    }
    const far = farFutureWarning(date, today, button);
    if (far && !acknowledged.includes(key("far"))) {
      setDateWarning(far);
      setAcknowledged((a) => [...a, key("far")]);
      return { errors: {} };
    }

    // No message: the new task appears highlighted on its list, and Edit can remove it.
    const { id } = addTask(title, date);
    lastAddedAt.current = Date.now();
    setTitle("");
    setWarning(undefined);
    setDateWarning(undefined);
    setAcknowledged([]);
    return { id, errors: {} };
  }

  return { title, changeTitle, changeDay, errors, setErrors, warning, dateWarning, submit };
}
