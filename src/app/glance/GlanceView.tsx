"use client";

import { FirstHint } from "@/components/FirstHint";
import { InlineAdd } from "@/components/InlineAdd";
import { ListSkeleton, PageHeader } from "@/components/Page";
import { ReorderableGroups, type TaskGroup } from "@/components/ReorderableGroups";
import { useClock } from "@/lib/clock";
import { addDays, ageLabel, dayName, formatDay } from "@/lib/dates";
import { fromEarlier, isCarried, plannedDay, sortForList, useStore, type Task } from "@/lib/store";

/**
 * Every unfinished task in one place, grouped by day: Today (rolled-over tasks first), Tomorrow, then later days.
 * Ranking here is the same saved order Today uses, so the two pages always agree.
 */
export function GlanceView() {
  const store = useStore();
  const clock = useClock();
  if (!store || !clock) return <ListSkeleton />;

  const { today } = clock;
  const tomorrow = addDays(today, 1);
  const open = store.data.tasks.filter((t) => !t.done);
  const later = [...new Set(open.filter((t) => t.date > tomorrow).map((t) => t.date))].sort();
  const dayGroup = (day: string): TaskGroup => {
    const name = dayName(day, today);
    return {
      key: day,
      title: name === formatDay(day) ? name : `${name} · ${formatDay(day)}`,
      droppable: true,
      tasks: sortForList(open.filter((t) => t.date === day && !isCarried(t, today))),
      href: day === today ? "/" : `/calendar?day=${day}`,
      footer: <InlineAdd date={day} today={today} tasks={store.data.tasks} />,
    };
  };
  // Rolled-over tasks just sit at the top of Today here, each with a "from Sat" note.
  const todayGroup: TaskGroup = {
    ...dayGroup(today),
    pinned: fromEarlier(store.data, today),
    pinnedMeta: (t: Task) => ageLabel(plannedDay(t), today),
  };
  const groups: TaskGroup[] = [todayGroup, dayGroup(tomorrow), ...later.map(dayGroup)];

  return (
    <>
      <PageHeader title="At a Glance" />
      <FirstHint data={store.data} />
      <ReorderableGroups groups={groups} today={today} highlightId={store.lastAddedId} />
    </>
  );
}
