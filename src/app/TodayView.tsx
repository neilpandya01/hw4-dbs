"use client";

import { Button, ButtonLink } from "@/components/Button";
import { DayTasks } from "@/components/DayTasks";
import { FirstHint } from "@/components/FirstHint";
import { FromEarlier } from "@/components/FromEarlier";
import { EmptyState, ListSkeleton, PageHeader, Section } from "@/components/Page";
import { QuickAdd } from "@/components/QuickAdd";
import { ReorderableGroups } from "@/components/ReorderableGroups";
import { WrapUpCard } from "@/components/WrapUpCard";
import { useClock } from "@/lib/clock";
import { addDays, formatDay, minutesOf } from "@/lib/dates";
import { doneOn, fromEarlier, isCarried, isNewUser, reopenWrapUp, tasksOn, useStore, wrapUpTime } from "@/lib/store";

/** The home page: today's list, quick-add, what's carried over, and the evening wrap-up. */
export function TodayView() {
  const store = useStore();
  const clock = useClock();
  // Someone new is sent to /welcome by OnboardingGate; show the skeleton, not an empty list, meanwhile.
  const isNew = !!store && isNewUser(store.data);

  if (!store || !clock || isNew) return <ListSkeleton />;

  const { data, lastAddedId } = store;
  const { today } = clock;
  const earlier = fromEarlier(data, today);
  // Rolled-over tasks are dated today too, but they live in the Rolled over group above.
  const todays = tasksOn(data, today).filter((t) => !isCarried(t, today));
  const openToday = todays.filter((t) => !t.done);
  const finishedToday = todays.filter((t) => t.done);
  const wrapTime = wrapUpTime(data);
  const pastWrapUp = clock.minutes >= minutesOf(wrapTime);
  const leftovers = [...earlier, ...openToday];
  const doneToday = doneOn(data, today);

  // Shows from the wrap-up minute itself (the clock ticks on the minute) until dismissed for the night.
  const showWrapUp = pastWrapUp && leftovers.length > 0 && data.wrapUpDismissedOn !== today;
  const wrapUpHidden = pastWrapUp && leftovers.length > 0 && data.wrapUpDismissedOn === today;
  const wrapped = pastWrapUp && leftovers.length === 0 && doneToday > 0;

  return (
    <>
      <PageHeader
        title={`Today · ${formatDay(today)}`}
        subtitle={wrapped ? `Day wrapped. ${doneToday} done today.` : doneToday ? `${doneToday} done today` : undefined}
      >
        {wrapUpHidden && (
          <Button variant="ghost" size="sm" className="self-start" onClick={reopenWrapUp}>
            Wrap up now
          </Button>
        )}
      </PageHeader>

      <FirstHint data={data} />

      {showWrapUp && <WrapUpCard leftovers={leftovers} today={today} />}

      <QuickAdd today={today} tasks={data.tasks} />

      {earlier.length > 0 && <FromEarlier tasks={earlier} today={today} />}

      <Section title="Today">
        {todays.length > 0 && openToday.length === 0 && (
          <EmptyState title="All clear for today.">
            <ButtonLink href={`/add?date=${addDays(today, 1)}`}>Plan tomorrow</ButtonLink>
            <ButtonLink variant="secondary" href="/glance">
              See all tasks
            </ButtonLink>
          </EmptyState>
        )}
        {/* Unfinished tasks can be ranked by dragging; At a Glance shows the same order. */}
        {openToday.length > 0 && (
          <ReorderableGroups
            groups={[{ key: today, title: "Today's tasks", droppable: true, tasks: openToday }]}
            today={today}
            highlightId={lastAddedId}
            showHeadings={false}
          />
        )}
        {finishedToday.length > 0 && (
          <DayTasks tasks={finishedToday} day={today} today={today} label="Done today" />
        )}
        {todays.length === 0 && earlier.length === 0 && (
          <EmptyState title="Nothing on today's list yet.">
            <p className="w-full">Add a task above, or plan ahead.</p>
            <ButtonLink variant="secondary" href="/add">
              Plan another day
            </ButtonLink>
          </EmptyState>
        )}
        {todays.length === 0 && earlier.length > 0 && (
          <p className="text-sm text-muted">Nothing new for today yet. Move a rolled-over task into today, or add one above.</p>
        )}
      </Section>
    </>
  );
}
