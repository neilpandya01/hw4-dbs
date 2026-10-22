"use client";

import { useId, useLayoutEffect, useState, type ReactNode } from "react";
import { dayName, formatDay, isValidKey } from "@/lib/dates";
import { moveTasks, type Task } from "@/lib/store";
import { farFutureWarning } from "@/lib/validate";
import { Button } from "./Button";
import { FieldError } from "./ChoiceChips";
import { describedBy, TextInput } from "./Field";
import { useToast } from "./Toast";

/**
 * A task's action buttons in one row, with "Pick a day" in the middle. Picking a day opens its
 * date field in a panel *under* the row, so the buttons never get split apart.
 *   [Keep for tomorrow] [Pick a day] [Let it go]
 *   ┌ Move "Call Mom" to  [ date ] [Move] [Cancel] ┐
 */
export function TaskActions({ task, today, before, after }: { task: Task; today: string; before?: ReactNode; after?: ReactNode }) {
  const [picking, setPicking] = useState(false);

  // Close when the page is hidden by navigation, so it isn't still open on return.
  useLayoutEffect(() => () => setPicking(false), []);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {before}
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={picking}
          className={picking ? "bg-accent-soft" : ""}
          onClick={() => setPicking((p) => !p)}
        >
          Pick a day
        </Button>
        {after}
      </div>
      {picking && <MoveToDayForm task={task} today={today} onClose={() => setPicking(false)} />}
    </div>
  );
}

/** The date field for "Pick a day", with its own errors. Escape or Cancel closes it. */
function MoveToDayForm({ task, today, onClose }: { task: Task; today: string; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [confirmedFar, setConfirmedFar] = useState<string>();
  const toast = useToast();
  const id = useId();

  return (
    <form
      noValidate
      className="flex flex-col gap-1.5 rounded-xl border border-line bg-bg p-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!date) return setError("Pick a day for this task.");
        if (!isValidKey(date)) return setError("That's not a real date. Check the year.");
        if (date < today) return setError("Pick today or a later day.");
        if (date === task.date) return setError(`It's already on ${formatDay(date)}. Pick a different day.`);
        const far = farFutureWarning(date, today, "Move");
        if (far && confirmedFar !== date) {
          setConfirmedFar(date);
          return setWarning(far);
        }
        const undo = moveTasks([task.id], date);
        toast(`Moved "${task.title}" to ${dayName(date, today)}`, undo);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium text-ink">
        Move &ldquo;{task.title}&rdquo; to
      </label>
      <div className="flex flex-wrap gap-2">
        <TextInput
          id={id}
          type="date"
          min={today}
            max="9999-12-31"
          value={date}
          autoFocus
          className="min-w-40 flex-1"
          invalid={!!error}
          aria-describedby={describedBy(id, { error })}
          onChange={(e) => {
            setDate(e.target.value);
            setError(undefined);
            setWarning(undefined);
          }}
        />
        <div className="flex gap-2">
          <Button type="submit">Move</Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
      <FieldError id={id} error={error} />
      {warning && !error && (
        <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {warning}
        </p>
      )}
    </form>
  );
}
