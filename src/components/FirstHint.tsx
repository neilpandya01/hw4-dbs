"use client";

import { formatTime } from "@/lib/dates";
import { dismissFirstHint, wrapUpTime, type Data } from "@/lib/store";
import { Button } from "./Button";

/** Shown once after onboarding, next to the first task, until the first check-off or "Got it". */
export function FirstHint({ data }: { data: Data }) {
  if (!data.showFirstHint) return null;
  return (
    <aside
      aria-label="How Dayplan works"
      className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4 sm:flex-row sm:items-start"
    >
      <div className="flex flex-1 flex-col gap-1 text-sm text-ink">
        <p className="font-semibold">You&rsquo;re set up. Your first task is on the list.</p>
        <p>Check the box when it&rsquo;s done.</p>
        <p>
          At {formatTime(wrapUpTime(data))} each day, Dayplan asks what to do with anything left. If you skip that,
          leftovers roll over to the next day.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={dismissFirstHint}>
        Got it
      </Button>
    </aside>
  );
}
