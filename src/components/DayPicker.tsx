"use client";

import type { ReactNode } from "react";
import { addDays } from "@/lib/dates";
import { ChoiceChips, FieldError } from "./ChoiceChips";
import { describedBy, TextInput } from "./Field";

export type DayChoice = "today" | "tomorrow" | "pick";

export function resolveDay(choice: DayChoice, picked: string, today: string): string {
  if (choice === "today") return today;
  if (choice === "tomorrow") return addDays(today, 1);
  return picked;
}

const options: { value: DayChoice; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "pick", label: "Pick a day" },
];

/** Today / Tomorrow / Pick a day, plus a date input for "Pick a day". */
export function DayPicker({
  id,
  choice,
  picked,
  today,
  error,
  warning,
  hint,
  onChoice,
  onPicked,
}: {
  id: string;
  choice: DayChoice;
  picked: string;
  today: string;
  error?: string;
  /** A soft warning (e.g. a likely typo in the year); the next submit accepts it. */
  warning?: string;
  hint?: ReactNode;
  onChoice: (c: DayChoice) => void;
  onPicked: (key: string) => void;
}) {
  const dateId = `${id}-date`;

  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={choice !== "pick" ? describedBy(id, { error, hint }) : undefined}
    >
      <legend className="mb-1.5 text-sm font-medium text-ink">Day</legend>
      <ChoiceChips name={id} options={options} value={choice} onChange={onChoice} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {choice === "pick" && (
        <div className="mt-2 flex flex-col gap-1.5">
          <label htmlFor={dateId} className="text-sm font-medium text-ink">
            Date
          </label>
          <TextInput
            id={dateId}
            type="date"
            min={today}
            max="9999-12-31"
            value={picked}
            invalid={!!error}
            aria-describedby={describedBy(id, { error })}
            onChange={(e) => onPicked(e.target.value)}
          />
        </div>
      )}
      <FieldError id={id} error={error} />
      {warning && !error && (
        <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {warning}
        </p>
      )}
    </fieldset>
  );
}
