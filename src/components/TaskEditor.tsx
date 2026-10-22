"use client";

import { useEffect, useRef, useState } from "react";
import { useClock } from "@/lib/clock";
import { addDays, dayName } from "@/lib/dates";
import { deleteTasks, updateTask, useStore, type Task } from "@/lib/store";
import { farFutureWarning, similarWarning, validateTask, type TaskErrors } from "@/lib/validate";
import { Button } from "./Button";
import { DayPicker, resolveDay, type DayChoice } from "./DayPicker";
import { describedBy, Field, TextInput } from "./Field";
import { useToast } from "./Toast";

function initialDay(date: string, today: string): { choice: DayChoice; picked: string } {
  if (date === today) return { choice: "today", picked: "" };
  if (date === addDays(today, 1)) return { choice: "tomorrow", picked: "" };
  return { choice: "pick", picked: date };
}

/**
 * Fix a mistake on any task: rename it, move it to another day, or delete it.
 * Escape or Cancel closes without saving. Moving or deleting offers Undo.
 */
export function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const store = useStore();
  const clock = useClock();
  const toast = useToast();
  const today = clock?.today ?? task.date;
  const [title, setTitle] = useState(task.title);
  const [day, setDay] = useState(() => initialDay(task.date, today));
  const [errors, setErrors] = useState<TaskErrors>({});
  const [titleWarning, setTitleWarning] = useState<string>();
  const [dateWarning, setDateWarning] = useState<string>();
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const id = `edit-${task.id}`;
  const date = resolveDay(day.choice, day.picked, today);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  function save() {
    const found = validateTask(title, date, today, { originalDate: task.date });
    setErrors(found);
    if (found.title || found.date) {
      if (found.title) input.current?.focus();
      return;
    }
    const titleChanged = title.trim() !== task.title;
    const dateChanged = date !== task.date;
    if (!titleChanged && !dateChanged) return onClose();

    // Soft warnings stop the first save only; pressing Save again keeps the change.
    const similar = similarWarning(title, date, store?.data.tasks ?? [], { excludeId: task.id, button: "Save" });
    const far = dateChanged && farFutureWarning(date, today, "Save");
    const key = (kind: string) => `${kind}|${title.trim()}|${date}`;
    if (similar && !acknowledged.includes(key("similar"))) {
      setTitleWarning(similar.message);
      setAcknowledged((a) => [...a, key("similar")]);
      return;
    }
    if (far && !acknowledged.includes(key("far"))) {
      setDateWarning(far);
      setAcknowledged((a) => [...a, key("far")]);
      return;
    }

    const undo = updateTask(task.id, { title, date });
    // A rename is visible right where you are. A new day moves the task out of view, so offer Undo.
    if (dateChanged) toast(`Moved "${title.trim()}" to ${dayName(date, today)}`, undo);
    onClose();
  }

  const titleMessages = { error: errors.title, warning: titleWarning };

  return (
    <form
      noValidate
      aria-label={`Edit "${task.title}"`}
      className="flex flex-col gap-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field id={id} label="Task" {...titleMessages}>
        <TextInput
          ref={input}
          id={id}
          autoComplete="off"
          value={title}
          invalid={!!errors.title}
          aria-describedby={describedBy(id, titleMessages)}
          onChange={(e) => {
            setTitle(e.target.value);
            setErrors((x) => ({ ...x, title: undefined }));
            setTitleWarning(undefined);
          }}
        />
      </Field>
      <DayPicker
        id={`${id}-day`}
        choice={day.choice}
        picked={day.picked}
        today={today}
        error={errors.date}
        warning={dateWarning}
        onChoice={(choice) => {
          setDay((d) => ({ ...d, choice }));
          setErrors((x) => ({ ...x, date: undefined }));
          setDateWarning(undefined);
        }}
        onPicked={(picked) => {
          setDay((d) => ({ ...d, picked }));
          setErrors((x) => ({ ...x, date: undefined }));
          setDateWarning(undefined);
        }}
      />
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button type="submit">Save</Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          className="ml-auto"
          onClick={() => {
            const undo = deleteTasks([task.id]);
            toast(`Deleted "${task.title}"`, { undo, seconds: 10 });
          }}
        >
          Delete task
        </Button>
      </div>
    </form>
  );
}
