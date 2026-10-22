"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toggleTask, type Task } from "@/lib/store";
import { Button } from "./Button";
import { TaskEditor } from "./TaskEditor";

/**
 * One task: a square checkbox labeled by the task name, an Edit button, plus optional meta and actions.
 * `highlight` marks a task that was just added: light yellow for a few seconds, scrolled to the middle of the screen.
 * `handle` is a drag handle shown before the checkbox. `dragOffset` is set while the card is being carried:
 * the card lifts (shadow, outline) and moves with the pointer by that many pixels.
 */
export function TaskRow({
  task,
  meta,
  actions,
  highlight,
  handle,
  dragOffset,
}: {
  task: Task;
  meta?: ReactNode;
  actions?: ReactNode;
  highlight?: boolean;
  handle?: ReactNode;
  dragOffset?: number;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLLIElement>(null);
  const id = `task-${task.id}`;

  // Close the editor when the page is hidden by navigation, so it isn't still open on return.
  useLayoutEffect(() => () => setEditing(false), []);

  // A just-added task is scrolled to the middle of the screen if any of it is hidden, so it is always seen.
  useEffect(() => {
    const el = row.current;
    if (!highlight || !el) return;
    const box = el.getBoundingClientRect();
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const hidden = box.top < headerBottom || box.bottom > window.innerHeight - 80; // 80px: room for the toast
    if (!hidden) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [highlight]);

  if (editing) {
    return (
      <li className="rounded-xl border border-accent bg-surface px-3 py-3">
        <TaskEditor
          task={task}
          onClose={() => {
            setEditing(false);
            requestAnimationFrame(() => editButton.current?.focus());
          }}
        />
      </li>
    );
  }

  return (
    <li
      ref={row}
      data-row-id={task.id}
      style={dragOffset === undefined ? undefined : { transform: `translateY(${dragOffset}px) scale(1.02)` }}
      className={`flex flex-col gap-2 rounded-xl border bg-surface px-3 py-2.5 ${
        dragOffset === undefined ? "border-line" : "relative z-20 border-accent shadow-xl"
      } ${
        highlight ? "just-added" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {handle}
        <input
          id={id}
          type="checkbox"
          checked={task.done}
          // Checking is undone by unchecking, so no message is needed.
          onChange={() => toggleTask(task.id)}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <label
            htmlFor={id}
            className={`cursor-pointer break-words text-base ${task.done ? "text-muted line-through" : "text-ink"}`}
          >
            {task.title}
          </label>
          {meta && <span className="text-sm text-muted">{meta}</span>}
        </div>
        <Button
          ref={editButton}
          variant="ghost"
          size="sm"
          className="-my-1 shrink-0"
          aria-label={`Edit "${task.title}"`}
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
      </div>
      {actions && <div className="flex flex-wrap gap-1 pl-8">{actions}</div>}
    </li>
  );
}

export function TaskList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {children}
    </ul>
  );
}
