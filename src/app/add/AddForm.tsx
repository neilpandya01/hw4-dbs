"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { DayPicker, resolveDay, type DayChoice } from "@/components/DayPicker";
import { AutocompleteInput, useAutocomplete } from "@/components/Autocomplete";
import { describedBy, Field } from "@/components/Field";
import { ListSkeleton } from "@/components/Page";
import { useTaskDraft } from "@/components/useTaskDraft";
import { useClock } from "@/lib/clock";
import { addDays, addedHref, dayHref, formatDay, isValidKey } from "@/lib/dates";
import { useStore, type Task } from "@/lib/store";
import { MAX_TITLE } from "@/lib/validate";

/** Step 1: jot a task for a certain day. `/add?date=2026-10-23` pre-fills the day. */
export function AddForm() {
  const store = useStore();
  const clock = useClock();
  const preset = useSearchParams().get("date");
  // Next keeps a page you left alive (hidden). bfcacheId changes on every fresh visit to /add,
  // so clicking "+ Add" always gives a clean form, while browser Back still restores a draft.
  const { bfcacheId } = useRouter();
  if (!store || !clock) return <ListSkeleton />;
  return <Form key={`${bfcacheId}|${preset}`} today={clock.today} preset={preset} tasks={store.data.tasks} />;
}

function initialChoice(preset: string | null, today: string): { choice: DayChoice; picked: string } {
  if (!preset || !isValidKey(preset) || preset <= today) return { choice: "today", picked: "" };
  if (preset === addDays(today, 1)) return { choice: "tomorrow", picked: "" };
  return { choice: "pick", picked: preset };
}

function Form({ today, preset, tasks }: { today: string; preset: string | null; tasks: Task[] }) {
  const router = useRouter();
  const draft = useTaskDraft();
  const [{ choice, picked }, setDay] = useState(() => initialChoice(preset, today));
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const date = resolveDay(choice, picked, today);
  const length = draft.title.trim().length;
  const complete = useAutocomplete(draft.title, tasks);
  const titleMessages = {
    error: draft.errors.title,
    warning: draft.warning?.message,
    hint: complete.hint ?? (length > MAX_TITLE - 20 ? `${length} of ${MAX_TITLE} characters` : undefined),
  };

  const pastLink = preset && isValidKey(preset) && preset < today ? preset : null;

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        // A double-click is safe: the first submit clears the field, and an empty
        // submit right after an add is ignored, so no button needs disabling.
        const result = draft.submit(date, today, tasks);
        if (result.id) {
          router.push(addedHref(date, today));
          return;
        }
        // Put the cursor on the first field that needs attention.
        if (result.errors.date && !result.errors.title) {
          formRef.current?.querySelector<HTMLElement>('input[type="date"], input[type="radio"]:checked')?.focus();
        } else {
          titleRef.current?.focus();
        }
      }}
    >
      {pastLink && (
        <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          This link was for {formatDay(pastLink)}, which has passed. Pick a day below.
        </p>
      )}
      <Field id="title" label="Task" {...titleMessages}>
        <AutocompleteInput
          ref={titleRef}
          id="title"
          suggestion={complete.suggestion}
          onAccept={draft.changeTitle}
          onDismiss={complete.dismiss}
          autoFocus
          autoComplete="off"
          placeholder="e.g. Call the dentist"
          value={draft.title}
          invalid={!!draft.errors.title}
          aria-describedby={describedBy("title", titleMessages)}
          onChange={(e) => draft.changeTitle(e.target.value)}
        />
      </Field>

      <DayPicker
        id="day"
        choice={choice}
        picked={picked}
        today={today}
        error={draft.errors.date}
        warning={draft.dateWarning}
        onChoice={(c) => {
          setDay({ choice: c, picked });
          draft.changeDay();
        }}
        onPicked={(p) => {
          setDay({ choice, picked: p });
          draft.changeDay();
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
        <Button type="submit">
          Add
        </Button>
        <ButtonLink variant="secondary" href={preset && isValidKey(preset) ? dayHref(preset, today) : "/"}>
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
