"use client";

import { useEffect, useRef } from "react";
import { setWrapUpTime } from "@/lib/store";
import { Button } from "./Button";
import { useWrapUpTime, WrapUpTimeField } from "./WrapUpTimeField";

/** The same question as onboarding. Saving changes the time for every day; Escape or Cancel closes. */
export function WrapUpEditor({ current, onClose }: { current: string; onClose: () => void }) {
  const wrapUp = useWrapUpTime(current, "Save");
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const radios = form.current?.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const checked = [...(radios ?? [])].find((r) => r.checked);
    (checked ?? radios?.[0])?.focus();
  }, []);

  return (
    <form
      ref={form}
      id="wrap-up-editor"
      noValidate
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      aria-labelledby="wrap-up-editor-title"
      className="flex flex-col gap-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        const time = wrapUp.validate();
        if (!time) return;
        setWrapUpTime(time);
        onClose();
      }}
    >
      <h2 id="wrap-up-editor-title" className="text-base font-semibold text-ink">
        Daily wrap-up time
      </h2>
      <WrapUpTimeField
        id="edit-wrap-up"
        legend="When are you usually done with tasks for the day?"
        hint="This applies to every day. The Wrap up your day card shows up at this time."
        state={wrapUp}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit">Save</Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
