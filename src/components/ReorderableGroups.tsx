"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { dayName } from "@/lib/dates";
import { placeTask, type Task } from "@/lib/store";
import { TaskRow } from "./TaskRow";

export type TaskGroup = {
  key: string; // a day key, or "earlier"
  title: string;
  /** Tasks can be dropped here. */
  droppable: boolean;
  tasks: Task[];
  /**
   * Rolled-over tasks shown at the top of the day, before its own tasks. They can be dragged
   * into place (which makes them normal tasks), but nothing is dropped between them.
   */
  pinned?: Task[];
  pinnedMeta?: (task: Task) => ReactNode;
  href?: string;
  /** Extra text under each task. */
  meta?: (task: Task) => ReactNode;
  /** Shown under the group's list, e.g. "+ Add task to Tomorrow". */
  footer?: ReactNode;
};

/** The carried task, where it will land, and how far the card has moved from where it was picked up. */
type Drag = { id: string; day: string | null; index: number; startY: number; startScroll: number; offset: number };

/**
 * Unfinished tasks in day groups that you can rank by dragging the ⠿ handle, or by focusing it
 * and pressing ↑ ↓. Used by Today and At a Glance; both read the same saved order, so a change
 * on one page is already there on the other.
 */
export function ReorderableGroups({
  groups,
  today,
  highlightId,
  showHeadings = true,
}: {
  groups: TaskGroup[];
  today: string;
  highlightId?: string;
  showHeadings?: boolean;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const droppable = groups.filter((g) => g.droppable);
  const pinnedIds = new Set(groups.flatMap((g) => (g.pinned ?? []).map((t) => t.id)));

  /** The drop spot under the pointer: the nearest day group, and the slot between its rows. */
  function targetAt(y: number, draggedId: string): { day: string; index: number } | null {
    const zones = [...(list.current?.querySelectorAll<HTMLElement>("[data-drop-day]") ?? [])];
    let best: { el: HTMLElement; distance: number } | null = null;
    for (const el of zones) {
      const r = el.getBoundingClientRect();
      const distance = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (!best || distance < best.distance) best = { el, distance };
    }
    if (!best) return null;
    // Slots are counted among the day's own tasks; pinned rolled-over rows always stay on top.
    const rows = [...best.el.querySelectorAll<HTMLElement>("[data-row-id]")].filter(
      (r) => r.dataset.rowId !== draggedId && !pinnedIds.has(r.dataset.rowId!),
    );
    const index = rows.filter((r) => {
      const b = r.getBoundingClientRect();
      return b.top + b.height / 2 < y;
    }).length;
    return { day: best.el.dataset.dropDay!, index };
  }

  function drop(task: Task, day: string, index: number) {
    placeTask(task.id, day, index);
    setAnnouncement(`Moved "${task.title}" to position ${index + 1} on ${dayName(day, today)}.`);
  }

  /** ↑ ↓ on a handle: one slot at a time, crossing into the next or previous day at the edges. */
  function nudge(task: Task, group: TaskGroup, direction: -1 | 1) {
    // A pinned rolled-over task: ↓ places it first among the day's own tasks; ↑ moves it to the previous day.
    if (pinnedIds.has(task.id)) {
      if (direction === 1) return drop(task, group.key, 0);
      const before = droppable[droppable.findIndex((g) => g.key === group.key) - 1];
      if (before) drop(task, before.key, before.tasks.length);
      return;
    }
    const position = group.tasks.findIndex((t) => t.id === task.id);
    if (group.droppable) {
      const next = position + direction;
      if (next >= 0 && next < group.tasks.length) return drop(task, group.key, next);
    }
    const at = droppable.findIndex((g) => g.key === group.key);
    // From earlier has no place among the droppable days: ↓ takes its tasks to the top of the first one.
    const neighbor = group.droppable ? droppable[at + direction] : direction === 1 ? droppable[0] : undefined;
    if (!neighbor) return;
    drop(task, neighbor.key, direction === 1 ? 0 : neighbor.tasks.length);
  }

  function handleFor(task: Task, group: TaskGroup) {
    return (
      <button
        type="button"
        data-handle-id={task.id}
        aria-label={`Reorder "${task.title}". Use up and down arrows, or drag.`}
        className="-ml-1.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted hover:text-ink active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag({ id: task.id, day: null, index: 0, startY: e.clientY, startScroll: window.scrollY, offset: 0 });
        }}
        onPointerMove={(e) => {
          if (drag?.id !== task.id) return;
          // Scroll the page when carrying a task near the top or bottom edge.
          if (e.clientY < 140) window.scrollBy(0, -12);
          else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
          // The card follows the pointer, including any distance the page has scrolled since pickup.
          const offset = e.clientY - drag.startY + (window.scrollY - drag.startScroll);
          const target = targetAt(e.clientY, task.id);
          setDrag({ ...drag, ...(target ?? {}), offset });
        }}
        onPointerUp={() => {
          if (drag?.id === task.id && drag.day) drop(task, drag.day, drag.index);
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          nudge(task, group, e.key === "ArrowUp" ? -1 : 1);
          // The row may have moved to another list; find its handle again and keep focus on it.
          requestAnimationFrame(() =>
            list.current?.querySelector<HTMLElement>(`[data-handle-id="${task.id}"]`)?.focus(),
          );
        }}
      >
        <GripIcon />
      </button>
    );
  }

  return (
    <div ref={list} className={`flex flex-col gap-6 ${drag ? "select-none" : ""}`}>
      {groups.map((group) => {
        const indicatorAt = drag?.day === group.key ? drag.index : -1;
        let slot = 0; // counts rows other than the one being carried
        return (
          <section
            key={group.key}
            aria-label={group.title}
            data-drop-day={group.droppable ? group.key : undefined}
            className="flex flex-col gap-3"
          >
            {showHeadings && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {group.href ? (
                  <Link href={group.href} className="hover:text-ink hover:underline">
                    {group.title}
                  </Link>
                ) : (
                  group.title
                )}
              </h2>
            )}
            <ul className="flex flex-col gap-2">
              {(group.pinned ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  handle={handleFor(task, group)}
                  dragOffset={drag?.id === task.id ? drag.offset : undefined}
                  highlight={task.id === highlightId}
                  meta={group.pinnedMeta?.(task)}
                />
              ))}
              {group.tasks.map((task) => {
                const isCarried = drag?.id === task.id;
                const showIndicator = !isCarried && slot === indicatorAt;
                if (!isCarried) slot++;
                return (
                  <Slot key={task.id} indicator={showIndicator}>
                    <TaskRow
                      task={task}
                      handle={handleFor(task, group)}
                      dragOffset={isCarried ? drag.offset : undefined}
                      highlight={task.id === highlightId}
                      meta={group.meta?.(task)}
                    />
                  </Slot>
                );
              })}
              {indicatorAt === slot && <DropLine />}
              {group.tasks.length === 0 && !group.pinned?.length && group.droppable && (
                <li className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-muted">
                  Nothing yet. Drag a task here.
                </li>
              )}
            </ul>
            {group.footer}
          </section>
        );
      })}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

function Slot({ indicator, children }: { indicator: boolean; children: ReactNode }) {
  return (
    <>
      {indicator && <DropLine />}
      {children}
    </>
  );
}

/** Where the carried task will land. */
function DropLine() {
  return <li aria-hidden="true" className="-my-1 h-1 rounded-full bg-accent" />;
}

function GripIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 16" className="h-4 w-2.5" fill="currentColor">
      {[2, 8, 14].flatMap((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
    </svg>
  );
}
