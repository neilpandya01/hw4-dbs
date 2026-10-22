"use client";

import { useRef, useState, type RefObject } from "react";
import { Button } from "@/components/Button";
import { DayPicker, resolveDay, type DayChoice } from "@/components/DayPicker";
import { describedBy, Field, TextInput } from "@/components/Field";
import { useTaskDraft } from "@/components/useTaskDraft";
import { finishOnboarding } from "@/lib/store";

const EXAMPLES = ["Reply to emails", "Do laundry", "Call Mom", "Pay a bill", "Go to the gym"];

/** Step 2: learn by doing. Add one real task, for today or another day, or skip. */
export function FirstTaskStep({
  headingRef,
  today,
  onBack,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  today: string;
  onBack: () => void;
}) {
  const draft = useTaskDraft("Add to my list");
  const [day, setDay] = useState<{ choice: DayChoice; picked: string }>({ choice: "today", picked: "" });
  const [skipWarned, setSkipWarned] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const date = resolveDay(day.choice, day.picked, today);
  const titleMessages = { error: draft.errors.title };

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        // A brand-new list has nothing to be similar to, so pass no tasks.
        const result = draft.submit(date, today, []);
        if (result.id) {
          // Finishing is enough: the welcome page then sends you to the list your task is on.
          finishOnboarding({ addedTask: true });
        } else if (result.errors.title) {
          input.current?.focus();
        }
      }}
    >
      {/* Same card as the other steps: heading and fields inside, buttons below. */}
      <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-1">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink outline-none">
            Add your first task
          </h2>
          <p className="text-sm text-muted">Tap an example or write your own.</p>
        </div>

        <div className="flex flex-col gap-2">
          <p id="examples-label" className="text-sm text-muted">
            Examples
          </p>
          <div role="group" aria-labelledby="examples-label" className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="min-h-9 rounded-full border border-dashed border-line px-3 text-sm text-ink hover:border-accent hover:bg-accent-soft"
                onClick={() => {
                  draft.changeTitle(ex);
                  input.current?.focus();
                }}
              >
                + {ex}
              </button>
            ))}
          </div>
        </div>

        <Field id="first-task" label="Task" {...titleMessages}>
          <TextInput
            ref={input}
            id="first-task"
            autoFocus
            autoComplete="off"
            placeholder="e.g. Call the dentist"
            value={draft.title}
            invalid={!!draft.errors.title}
            aria-describedby={describedBy("first-task", titleMessages)}
            onChange={(e) => draft.changeTitle(e.target.value)}
          />
        </Field>

        <DayPicker
          id="first-task-day"
          choice={day.choice}
          picked={day.picked}
          today={today}
          error={draft.errors.date}
          warning={draft.dateWarning}
          hint="Nothing for today? Choose Tomorrow or pick another day."
          onChoice={(choice) => {
            setDay((d) => ({ ...d, choice }));
            draft.changeDay();
          }}
          onPicked={(picked) => {
            setDay((d) => ({ ...d, picked }));
            draft.changeDay();
          }}
        />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit">Add to my list</Button>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="ghost"
          className="sm:ml-auto"
          onClick={() => {
            // Don't silently throw away something they typed: say so once, then skip.
            if (draft.title.trim() && !skipWarned) return setSkipWarned(true);
            finishOnboarding({ addedTask: false });
          }}
        >
          I&rsquo;ll add tasks later
        </Button>
      </div>
      {skipWarned && draft.title.trim() && (
        <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          &ldquo;{draft.title.trim()}&rdquo; isn&rsquo;t saved yet. Press Add to my list to keep it, or I&rsquo;ll add
          tasks later again to skip it.
        </p>
      )}
    </form>
  );
}
