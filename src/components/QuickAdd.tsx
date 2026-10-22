"use client";

import { useRef } from "react";
import type { Task } from "@/lib/store";
import { Button } from "./Button";
import { AutocompleteInput, useAutocomplete } from "./Autocomplete";
import { describedBy, Field } from "./Field";
import { useTaskDraft } from "./useTaskDraft";

/** Step 1, the fast path: type and press Enter to put a task on today. */
export function QuickAdd({ today, tasks }: { today: string; tasks: Task[] }) {
  const draft = useTaskDraft();
  const input = useRef<HTMLInputElement>(null);
  const id = "quick-add";
  const complete = useAutocomplete(draft.title, tasks);
  const messages = { error: draft.errors.title, warning: draft.warning?.message, hint: complete.hint };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        draft.submit(today, today, tasks);
        input.current?.focus();
      }}
    >
      <Field id={id} label="Add a task for today" {...messages}>
        <div className="flex gap-2">
          <AutocompleteInput
            ref={input}
            id={id}
            wrapperClassName="min-w-0 flex-1"
            suggestion={complete.suggestion}
            onAccept={draft.changeTitle}
            onDismiss={complete.dismiss}
            placeholder="e.g. Call the dentist"
            autoComplete="off"
            value={draft.title}
            invalid={!!draft.errors.title}
            aria-describedby={describedBy(id, messages)}
            onChange={(e) => draft.changeTitle(e.target.value)}
          />
          <Button type="submit">Add</Button>
        </div>
      </Field>
    </form>
  );
}
