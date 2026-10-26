"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ListSkeleton } from "@/components/Page";
import type { WrapUpDraft } from "@/components/WrapUpTimeField";
import { useClock } from "@/lib/clock";
import { addedHref } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useWeatherSettings } from "@/lib/weatherSettings";
import { WeatherSetup } from "@/components/WeatherSetup";
import { FirstTaskStep } from "./FirstTaskStep";
import { OverviewStep } from "./OverviewStep";
import { WrapUpStep } from "./WrapUpStep";

const STEPS = ["overview", "time", "weather", "task"] as const;
type Step = (typeof STEPS)[number];

/**
 * The first visit, required for anyone new:
 *   1. /welcome             Read the overview: what Dayplan is and how it works.
 *   2. /welcome?step=time   Set the time you usually wrap up (required).
 *   3. /welcome?step=weather  Weather: your location, or a city if you'd rather not share it, or none.
 *   4. /welcome?step=task   Add a first task (by example), for today or another day, or add later.
 * Each step has its own URL (step 1 is ?step=overview), so Back and the browser's Back button go to the
 * previous step. Opening or reloading /welcome at any URL lands on the step you'd reached; after that,
 * the URL decides (Back can go to earlier steps, but never past an unanswered one).
 * Someone who has already finished onboarding is sent on: to their new task's list right
 * after finishing, or to Today if they open /welcome later.
 */
export function WelcomeFlow() {
  const store = useStore();
  const clock = useClock();
  const router = useRouter();
  const requested = useSearchParams().get("step");
  const onboarded = !!store?.data.onboarded;
  const weather = useWeatherSettings();
  // The first time this page shows (open or reload), go to the step reached, whatever the URL says.
  const [arrived, setArrived] = useState(false);

  // Finished: leave /welcome. Just after adding a first task, go where that task lives.
  const justAdded = store?.lastAddedId ? store.data.tasks.find((t) => t.id === store.lastAddedId) : undefined;
  const target = justAdded && clock ? addedHref(justAdded.date, clock.today) : "/";
  useEffect(() => {
    if (onboarded) router.replace(target);
  }, [onboarded, target, router]);

  if (!store || !clock || onboarded || weather.status === "loading") return <ListSkeleton />;

  const timeSaved = !!store.data.settings.wrapUpTime;
  // Weather is answered once a choice is saved (location, city, or off). If settings can't be
  // reached at all, the weather step says so and lets them continue, so it counts as answered.
  const weatherAnswered = weather.status === "error" || weather.settings.mode !== null;
  // Where they'd reached: the first step still to answer. The overview has nothing to save, so someone
  // already on the time step (by URL) stays there.
  const reached: Step = !timeSaved
    ? requested === "time" || requested === "weather" || requested === "task"
      ? "time"
      : "overview"
    : weatherAnswered
      ? "task"
      : "weather";
  const asked = STEPS.includes(requested as Step) ? (requested as Step) : null;
  // On arrival (or with no step in the URL) resume; afterwards follow the URL, never past an unanswered step.
  let step: Step = !arrived || !asked ? reached : asked;
  if ((step === "weather" || step === "task") && !timeSaved) step = "time";
  if (step === "task" && !weatherAnswered) step = "weather";

  return (
    <Arrive
      step={step}
      urlStep={asked}
      onArrived={setArrived}
    >
      <Flow step={step} savedTime={store.data.settings.wrapUpTime} today={clock.today} />
    </Arrive>
  );
}

/** Keeps the URL in step with what's shown (replace, so Back isn't cluttered), and marks arrival as done. */
function Arrive({
  step,
  urlStep,
  onArrived,
  children,
}: {
  step: Step;
  urlStep: Step | null;
  onArrived: (arrived: true) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  useLayoutEffect(() => {
    onArrived(true);
    if (urlStep !== step) router.replace(stepHref(step), { scroll: false });
  }, [step, urlStep, onArrived, router]);
  return children;
}

function stepHref(step: Step) {
  return `/welcome?step=${step}`;
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
    router.push(stepHref(next), { scroll: false });
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
          onDone={() => go("weather")}
          onBack={() => go("overview")}
        />
      )}
      {step === "weather" && (
        <WeatherSetup variant="onboarding" headingRef={heading} onDone={() => go("task")} onBack={() => go("time")} />
      )}
      {step === "task" && <FirstTaskStep headingRef={heading} today={today} onBack={() => go("weather")} />}
    </div>
  );
}
