"use client";

import type { RefObject } from "react";
import { Button } from "@/components/Button";
import { useWrapUpTime, WrapUpTimeField, type WrapUpDraft } from "@/components/WrapUpTimeField";
import { setWrapUpTime } from "@/lib/store";

/** Step 2: the one question Dayplan needs, when your day usually ends. It must be answered to go on. */
export function WrapUpStep({
  headingRef,
  savedTime,
  draft,
  onDraft,
  onDone,
  onBack,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  savedTime: string | null;
  draft?: WrapUpDraft;
  onDraft: (d: WrapUpDraft) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const wrapUp = useWrapUpTime(savedTime, "Continue", { draft, onDraft });

  function submit() {
    const time = wrapUp.validate();
    if (!time) return;
    setWrapUpTime(time);
    onDone();
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Same card as the overview step. Asked once: the heading is the question, then the pills. */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <h2 id="wrap-up-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink outline-none">
          When do you wrap up?
        </h2>
        <WrapUpTimeField
          id="wrap-up"
          labelledBy="wrap-up-title"
          hint="At this time every day, Dayplan helps you wrap up. You can always change it later."
          state={wrapUp}
        />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit">Continue</Button>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}
