"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { ReorderableGroups } from "@/components/ReorderableGroups";
import { TaskList, TaskRow } from "@/components/TaskRow";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/Page";
import { useClock } from "@/lib/clock";
import {
  addMonths,
  ageLabel,
  dayName,
  formatDay,
  formatMonth,
  isValidKey,
  isValidMonth,
  monthGrid,
  monthOf,
  toKey,
} from "@/lib/dates";
import { fromEarlier, isCarried, plannedDay, tasksOn, useStore, type Data, type Task } from "@/lib/store";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Any month, past or future, and the tasks of the day you pick: what was planned for it,
 * and what you finished on it.
 *   /calendar                  → this month, today selected
 *   /calendar?month=2026-12    → December, nothing selected yet
 *   /calendar?day=2026-11-04   → November, the 4th selected
 */
export function CalendarView() {
  const params = useSearchParams();
  const store = useStore();
  const clock = useClock();
  if (!store || !clock) return <ListSkeleton />;

  const { today } = clock;
  const thisMonth = monthOf(today);
  const dayParam = params.get("day");
  const monthParam = params.get("month");

  let selected: string | null = dayParam && isValidKey(dayParam) ? dayParam : null;
  const month = selected ? monthOf(selected) : monthParam && isValidMonth(monthParam) ? monthParam : thisMonth;
  if (!selected && month === thisMonth) selected = today;

  return (
    <>
      <PageHeader title="Calendar" />
      <MonthGrid data={store.data} month={month} today={today} selected={selected} />
      {selected ? (
        <SelectedDay data={store.data} day={selected} today={today} highlightId={store.lastAddedId} />
      ) : (
        <p className="text-sm text-muted">Pick a day above to see its tasks.</p>
      )}
    </>
  );
}

function MonthGrid({
  data,
  month,
  today,
  selected,
}: {
  data: Data;
  month: string;
  today: string;
  selected: string | null;
}) {
  // ● to do: unfinished tasks planned for today or later (leftovers roll over onto today).
  // ○ done: tasks checked off on that day.
  const open = new Map<string, number>();
  const done = new Map<string, number>();
  for (const t of data.tasks) {
    if (!t.done && t.date >= today) open.set(t.date, (open.get(t.date) ?? 0) + 1);
    if (t.done && t.doneAt) {
      const day = toKey(new Date(t.doneAt));
      done.set(day, (done.get(day) ?? 0) + 1);
    }
  }
  const arrow = "flex size-9 items-center justify-center rounded-full text-lg text-accent hover:bg-accent-soft";
  const thisMonth = monthOf(today);

  return (
    // Compact on purpose: the tasks below are the point, the grid is just for picking a day.
    <section
      aria-labelledby="month-title"
      className="w-full max-w-sm self-center rounded-2xl border border-line bg-surface px-3 py-2"
    >
      <div className="flex items-center gap-1">
        <Link
          href={`/calendar?month=${addMonths(month, -1)}`}
          scroll={false}
          className={arrow}
          aria-label={`Previous month, ${formatMonth(addMonths(month, -1))}`}
        >
          ‹
        </Link>
        <h2 id="month-title" className="flex-1 text-center text-sm font-semibold text-ink" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <Link
          href={`/calendar?month=${addMonths(month, 1)}`}
          scroll={false}
          className={arrow}
          aria-label={`Next month, ${formatMonth(addMonths(month, 1))}`}
        >
          ›
        </Link>
        <Link
          href="/calendar"
          scroll={false}
          aria-label="Go to today"
          className={`ml-1 rounded-full border px-3 py-1 text-xs font-medium ${
            month === thisMonth && selected === today
              ? "border-line text-muted"
              : "border-accent text-accent hover:bg-accent-soft"
          }`}
        >
          Today
        </Link>
      </div>

      <div className="mt-1 grid grid-cols-7 justify-items-center gap-y-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} aria-hidden="true" className="w-9 py-1 text-[11px] font-medium text-muted">
            {d.slice(0, 2)}
          </div>
        ))}
        {monthGrid(month).map((day, i) => {
          if (!day) return <div key={`pad-${i}`} aria-hidden="true" />;
          const count = open.get(day) ?? 0;
          const finished = done.get(day) ?? 0;
          const isToday = day === today;
          const isSelected = day === selected;
          const isPast = day < today;
          const summary =
            count === 0 && finished === 0
              ? "no tasks"
              : [count && `${count} to do`, finished && `${finished} done`].filter(Boolean).join(", ");
          const label = `${formatDay(day)}${isToday ? ", today" : ""}, ${summary}${isSelected ? ", selected" : ""}`;
          return (
            <Link
              key={day}
              href={`/calendar?day=${day}`}
              scroll={false}
              aria-label={label}
              aria-current={isToday ? "date" : undefined}
              className={`relative flex size-9 items-center justify-center rounded-full text-sm transition-colors ${
                isSelected
                  ? "bg-ink font-semibold text-bg"
                  : `${isToday ? "font-semibold text-accent ring-1 ring-accent" : isPast ? "text-muted" : "text-ink"} hover:bg-accent-soft`
              }`}
            >
              {Number(day.slice(8))}
              {(count > 0 || finished > 0) && (
                <span aria-hidden="true" className="absolute bottom-0.5 flex gap-0.5">
                  {count > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-bg" : "bg-accent"}`} />}
                  {finished > 0 && (
                    <span className={`h-1.5 w-1.5 rounded-full border ${isSelected ? "border-bg" : "border-muted"}`} />
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p aria-hidden="true" className="mt-1 flex justify-center gap-4 pb-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> to do
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full border border-muted" /> done
        </span>
      </p>
    </section>
  );
}

/** Tasks checked off on `day`, whatever day they were planned for, in the order they were finished. */
function finishedOn(data: Data, day: string) {
  return data.tasks
    .filter((t) => t.done && t.doneAt && toKey(new Date(t.doneAt)) === day)
    .sort((a, b) => a.doneAt!.localeCompare(b.doneAt!));
}

/**
 * A past day is a record of what got done. Anything planned for it and not finished
 * has already rolled over onto today, so it isn't repeated here.
 */
function PastDay({ data, day, today }: { data: Data; day: string; today: string }) {
  const done = finishedOn(data, day);
  return (
    <section aria-labelledby="selected-day" className="flex flex-col gap-3">
      <h2 id="selected-day" className="text-lg font-semibold text-ink">
        {dayName(day, today) === formatDay(day) ? formatDay(day) : `${dayName(day, today)} · ${formatDay(day)}`}
      </h2>
      {done.length > 0 ? (
        <>
          <p className="text-sm text-muted">
            {done.length === 1 ? "1 task finished" : `${done.length} tasks finished`}
          </p>
          <TaskList label={`Finished on ${formatDay(day)}`}>
            {done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                meta={plannedDay(task) !== day ? `planned for ${dayName(plannedDay(task), today)}` : undefined}
              />
            ))}
          </TaskList>
        </>
      ) : (
        <EmptyState title={`Nothing was finished on ${formatDay(day)}.`} />
      )}
    </section>
  );
}

function SelectedDay({
  data,
  day,
  today,
  highlightId,
}: {
  data: Data;
  day: string;
  today: string;
  highlightId?: string;
}) {
  if (day < today) return <PastDay data={data} day={day} today={today} />;
  const tasks = tasksOn(data, day);
  const name = dayName(day, today);
  const open = tasks.filter((t) => !t.done && !isCarried(t, today));
  // On today, rolled-over tasks sit at the top of the list with a "from Sat" note, as on At a Glance.
  const carried = day === today ? fromEarlier(data, today) : [];
  // Finished tasks are listed on the day they were finished (as the grid's ○ marker is), so a task
  // planned for Friday but done early shows on the day it was done, labeled "planned for Fri".
  const finished = finishedOn(data, day);
  const hasPlanned = open.length > 0 || carried.length > 0;

  return (
    // The selected day's tasks are the main content, so they get a real heading, not a small label.
    <section aria-labelledby="selected-day" className="flex flex-col gap-3">
      <h2 id="selected-day" className="text-lg font-semibold text-ink">
        {name === formatDay(day) ? name : `${name} · ${formatDay(day)}`}
      </h2>
      {/* Same saved order as Today and At a Glance, so dragging here updates them too. */}
      {hasPlanned && (
        <ReorderableGroups
          groups={[
            {
              key: day,
              title: `Tasks for ${formatDay(day)}`,
              droppable: true,
              tasks: open,
              pinned: carried,
              pinnedMeta: (t: Task) => ageLabel(plannedDay(t), today),
            },
          ]}
          today={today}
          highlightId={highlightId}
          showHeadings={false}
        />
      )}

      {!hasPlanned && finished.length === 0 && (
        <EmptyState title={`Nothing planned for ${formatDay(day)}.`}>
          <ButtonLink href={`/add?date=${day}`}>Add a task for this day</ButtonLink>
        </EmptyState>
      )}
      {finished.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Finished this day</h3>
          <TaskList label={`Finished on ${formatDay(day)}`}>
            {finished.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                meta={plannedDay(task) !== day ? `planned for ${dayName(plannedDay(task), today)}` : undefined}
              />
            ))}
          </TaskList>
        </div>
      )}
      {(hasPlanned || finished.length > 0) && (
        <ButtonLink variant="secondary" href={`/add?date=${day}`} className="self-start">
          + Add to {formatDay(day)}
        </ButtonLink>
      )}
    </section>
  );
}
