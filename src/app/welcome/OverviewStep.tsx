"use client";

import type { RefObject } from "react";
import { Button } from "@/components/Button";

/** Step 1: what Dayplan is and how it works, before asking anything. */
export function OverviewStep({
  headingRef,
  onDone,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onDone: () => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink outline-none">
          Plan your tasks day by day.
        </h2>
        <p className="text-ink">Dayplan is a to-do list where every task belongs to a day.</p>
        <ol className="flex flex-col gap-3 text-ink">
          {[
            "Add tasks to today, or to any day ahead.",
            "Check them off as you go.",
            "At the end of your day, keep or move what's left. Nothing gets lost.",
          ].map((line, i) => (
            <li key={line} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
              >
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">Everything is saved on this device. No account needed.</p>
      </section>
      <Button className="self-start" onClick={onDone}>
        Get started
      </Button>
    </>
  );
}
