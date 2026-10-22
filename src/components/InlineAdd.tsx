"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { dayName } from "@/lib/dates";
import type { Task } from "@/lib/store";
import { AutocompleteInput, useAutocomplete } from "./Autocomplete";
import { Button } from "./Button";
import { describedBy, Field } from "./Field";
import { useTaskDraft } from "./useTaskDraft";

/**
 * "+ Add task" under a day: opens a small field right there, so you can add to that day
 * without leaving the page. It closes once the task is added; Cancel or Esc closes it without adding.
 */
export function InlineAdd({ date, today, tasks }: { date: string; today: string; tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const day = dayName(date, today);

  // Close when the page is hidden by navigation, so it isn't still open on return.
  useLayoutEffect(() => () => setOpen(false), []);

  if (!open) {
    return (
      <Button ref={opener} variant="ghost" size="sm" className="self-start" onClick={() => setOpen(true)}>
        + Add task to {day}
      </Button>
    );
  }
  return (
    <InlineAddForm
      date={date}
      today={today}
      tasks={tasks}
      label={`Add a task to ${day}`}
      onClose={() => {
        setOpen(false);
        requestAnimationFrame(() => opener.current?.focus());
      }}
    />
  );
}

function InlineAddForm({
  date,
  today,
  tasks,
  label,
  onClose,
}: {
  date: string;
  today: string;
  tasks: Task[];
  label: string;
  onClose: () => void;
}) {
  const draft = useTaskDraft();
  const complete = useAutocomplete(draft.title, tasks);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const messages = {
    error: draft.errors.title ?? draft.errors.date,
    warning: draft.warning?.message ?? draft.dateWarning,
    hint: complete.hint,
  };

  useEffect(() => input.current?.focus(), []);

  return (
    <form
      noValidate
      className="rounded-xl border border-line bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        // Added: close, and the new task shows highlighted in the list. Errors or warnings: stay open.
        if (draft.submit(date, today, tasks).id) onClose();
        else input.current?.focus();
      }}
    >
      <Field id={id} label={label} {...messages}>
        <div className="flex flex-wrap gap-2">
          <AutocompleteInput
            ref={input}
            id={id}
            wrapperClassName="min-w-40 flex-1"
            suggestion={complete.suggestion}
            onAccept={draft.changeTitle}
            onDismiss={complete.dismiss}
            placeholder="e.g. Call the dentist"
            autoComplete="off"
            value={draft.title}
            invalid={!!messages.error}
            aria-describedby={describedBy(id, messages)}
            onChange={(e) => draft.changeTitle(e.target.value)}
            onKeyDown={(e) => {
              // Esc closes the field (when there's no suggestion for Esc to hide first).
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <div className="flex gap-2">
            <Button type="submit">Add</Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Field>
    </form>
  );
}
