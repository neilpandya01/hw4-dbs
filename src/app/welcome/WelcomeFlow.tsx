"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ListSkeleton } from "@/components/Page";
import type { WrapUpDraft } from "@/components/WrapUpTimeField";
import { useClock } from "@/lib/clock";
import { addedHref } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { FirstTaskStep } from "./FirstTaskStep";
import { OverviewStep } from "./OverviewStep";
import { WrapUpStep } from "./WrapUpStep";

const STEPS = ["overview", "time", "task"] as const;
type Step = (typeof STEPS)[number];

/**
 * The first visit, required for anyone new:
 *   1. /welcome             Read the overview: what Dayplan is and how it works.
 *   2. /welcome?step=time   Set the time you usually wrap up (required).
 *   3. /welcome?step=task   Add a first task (by example), for today or another day, or add later.
 * Each step has its own URL, so the browser's Back button goes to the previous step.
 * Someone who has already finished onboarding is sent on: to their new task's list right
 * after finishing, or to Today if they open /welcome later.
 */
export function WelcomeFlow() {
  const store = useStore();
  const clock = useClock();
  const router = useRouter();
  const requested = useSearchParams().get("step");
  const onboarded = !!store?.data.onboarded;

  // Finished: leave /welcome. Just after adding a first task, go where that task lives.
  const justAdded = store?.lastAddedId ? store.data.tasks.find((t) => t.id === store.lastAddedId) : undefined;
  const target = justAdded && clock ? addedHref(justAdded.date, clock.today) : "/";
  useEffect(() => {
    if (onboarded) router.replace(target);
  }, [onboarded, target, router]);

  if (!store || !clock || onboarded) return <ListSkeleton />;

  const timeSaved = !!store.data.settings.wrapUpTime;
  // Step 3 needs a wrap-up time; without a step in the URL, resume where they left off.
  let step: Step = STEPS.includes(requested as Step) ? (requested as Step) : timeSaved ? "task" : "overview";
  if (step === "task" && !timeSaved) step = "time";

  return <Flow step={step} savedTime={store.data.settings.wrapUpTime} today={clock.today} />;
}

function Flow({ step, savedTime, today }: { step: Step; savedTime: string | null; today: string }) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  // The step 2 choice lives here, so it survives going Back to the overview and forward again.
  const [draft, setDraft] = useState<WrapUpDraft>();

  // Moving between steps puts focus on the new heading, so keyboard and screen reader users land in the right place.
  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step]);

  function go(next: Step) {
    router.push(next === "overview" ? "/welcome" : `/welcome?step=${next}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome to Dayplan</h1>
        <p className="text-sm font-medium text-muted" aria-live="polite">
          Step {STEPS.indexOf(step) + 1} of {STEPS.length}
        </p>
      </div>
      {step === "overview" && <OverviewStep headingRef={heading} onDone={() => go("time")} />}
      {step === "time" && (
        <WrapUpStep
          headingRef={heading}
          savedTime={savedTime}
          draft={draft}
          onDraft={setDraft}
          onDone={() => go("task")}
          onBack={() => go("overview")}
        />
      )}
      {step === "task" && <FirstTaskStep headingRef={heading} today={today} onBack={() => go("time")} />}
    </div>
  );
}
