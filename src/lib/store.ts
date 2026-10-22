"use client";

import { useSyncExternalStore } from "react";
import { isValidKey, toKey } from "./dates";

// Everything the app remembers lives under one localStorage key.
// No database, no accounts: it stays on this device.

export type Task = {
  id: string;
  title: string;
  /** The local day it's planned for. Unfinished tasks from past days roll over onto today. */
  date: string;
  done: boolean;
  doneAt?: string;
  createdAt: string;
  /**
   * Position within its day: lower comes first. New and moved tasks get the current time,
   * which is always larger than any earlier value, so they land at the end of the day.
   * Dragging renumbers a day 0, 1, 2… Missing on older data: falls back to createdAt.
   */
  order?: number;
  /**
   * Set when an unfinished task rolls over to the next day on its own: the day it was first planned for.
   * Such a task shows as rolled over until you act on it (move, drag, re-date, finish, or delete),
   * which clears this. Each new day it rolls forward again.
   */
  carriedFrom?: string;
};

export type Data = {
  version: 1;
  settings: { wrapUpTime: string | null };
  wrapUpDismissedOn: string | null;
  tasks: Task[];
  /** Set when the welcome flow is finished or skipped. Missing on data saved before onboarding existed. */
  onboarded?: boolean;
  /** Show the one-time "here's how it works" hint until the first check-off or "Got it". */
  showFirstHint?: boolean;
};

export type StorageStatus = "ok" | "unavailable" | "full" | "corrupt";

/** lastAddedId is memory-only: it marks a new task as "just added" for a few seconds. */
export type Snapshot = { data: Data; storage: StorageStatus; lastAddedId?: string };

const KEY = "todo:v1";
const BACKUP_KEY = "todo:backup";
export const DEFAULT_WRAP_UP = "18:00";

const emptyData = (): Data => ({
  version: 1,
  settings: { wrapUpTime: null },
  wrapUpDismissedOn: null,
  tasks: [],
});

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Turn whatever was saved into valid Data, or null if it can't be trusted.
 * Small gaps (missing settings, an old field) are filled with defaults so nobody loses their list;
 * anything that would break a page (a task without a real day, say) means the data is unreadable.
 */
function normalize(value: unknown): Data | null {
  const v = value as Partial<Data> | null;
  if (!v || typeof v !== "object" || v.version !== 1 || !Array.isArray(v.tasks)) return null;
  const tasks: Task[] = [];
  for (const raw of v.tasks as Partial<Task>[]) {
    if (!raw || typeof raw.id !== "string" || typeof raw.title !== "string" || !isValidKey(String(raw.date))) return null;
    tasks.push({
      id: raw.id,
      title: raw.title,
      date: raw.date!,
      done: raw.done === true,
      doneAt: raw.done === true && typeof raw.doneAt === "string" && !isNaN(Date.parse(raw.doneAt)) ? raw.doneAt : undefined,
      createdAt: typeof raw.createdAt === "string" && !isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : new Date(0).toISOString(),
      order: typeof raw.order === "number" && isFinite(raw.order) ? raw.order : undefined,
      carriedFrom: typeof raw.carriedFrom === "string" && isValidKey(raw.carriedFrom) ? raw.carriedFrom : undefined,
    });
  }
  const wrapUpTime = v.settings?.wrapUpTime;
  return {
    version: 1,
    settings: { wrapUpTime: typeof wrapUpTime === "string" && TIME.test(wrapUpTime) ? wrapUpTime : null },
    wrapUpDismissedOn: typeof v.wrapUpDismissedOn === "string" && isValidKey(v.wrapUpDismissedOn) ? v.wrapUpDismissedOn : null,
    tasks,
    onboarded: v.onboarded === true,
    showFirstHint: v.showFirstHint === true,
  };
}

function load(): Snapshot {
  let raw: string | null;
  try {
    // Some browsers (private modes, blocked site data) throw on write, not read.
    localStorage.setItem("todo:probe", "1");
    localStorage.removeItem("todo:probe");
    raw = localStorage.getItem(KEY);
  } catch {
    return { data: emptyData(), storage: "unavailable" };
  }
  if (raw === null) return { data: emptyData(), storage: "ok" };
  try {
    const data = normalize(JSON.parse(raw));
    if (data) return { data, storage: "ok" };
  } catch {}
  // Unreadable: keep a copy so nothing is silently lost, then start fresh.
  try {
    localStorage.setItem(BACKUP_KEY, raw);
    localStorage.removeItem(KEY);
  } catch {}
  return { data: emptyData(), storage: "corrupt" };
}

function save(data: Data): StorageStatus {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return "ok";
  } catch (e) {
    return e instanceof DOMException && e.name === "QuotaExceededError" ? "full" : "unavailable";
  }
}

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  // Another tab changed the list: pick it up so tabs don't overwrite each other.
  if (e.key === KEY) {
    snapshot = load();
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Snapshot {
  if (!snapshot) snapshot = load();
  return snapshot;
}

/** null while rendering on the server or hydrating: show a skeleton, never a fake empty list. */
export function useStore(): Snapshot | null {
  return useSyncExternalStore<Snapshot | null>(subscribe, getSnapshot, () => null);
}

function update(change: (data: Data) => Data) {
  const current = getSnapshot();
  const data = change(current.data);
  const status = save(data);
  // A save failure shows its notice right away; the "corrupt" notice stays until dismissed.
  snapshot = { ...current, data, storage: status === "ok" && current.storage === "corrupt" ? "corrupt" : status };
  emit();
}

function updateTasks(change: (tasks: Task[]) => Task[]) {
  update((d) => ({ ...d, tasks: change(d.tasks) }));
}

/** Every action returns an undo function for the toast. */
type Undo = () => void;

/**
 * Undo for one action: remembers only the tasks it touches (`ids`) and, when undone, puts exactly
 * those back. Anything added or changed since, here or in another tab, is left alone.
 */
function snapshotTasks(ids: string[]): Undo {
  const before = getSnapshot().data.tasks.filter((t) => ids.includes(t.id));
  return () => updateTasks((tasks) => [...tasks.filter((t) => !ids.includes(t.id)), ...before]);
}

/** A moved, edited, or deleted task is no longer "just added": stop highlighting and announcing it. */
function forgetJustAdded(ids: string[]) {
  if (snapshot?.lastAddedId && ids.includes(snapshot.lastAddedId)) {
    snapshot = { ...snapshot, lastAddedId: undefined };
    emit();
  }
}

export function addTask(title: string, date: string): { id: string; undo: Undo } {
  const id = crypto.randomUUID();
  const undo = snapshotTasks([id]);
  const now = new Date();
  const task: Task = { id, title: title.trim(), date, done: false, createdAt: now.toISOString(), order: now.getTime() };
  updateTasks((tasks) => [...tasks, task]);
  snapshot = { ...getSnapshot(), lastAddedId: id };
  emit();
  setTimeout(() => {
    if (snapshot?.lastAddedId === id) {
      snapshot = { ...snapshot, lastAddedId: undefined };
      emit();
    }
  }, 6000);
  return { id, undo };
}

export function toggleTask(id: string): Undo {
  const undo = snapshotTasks([id]);
  update((d) => ({
    ...d,
    showFirstHint: false,
    tasks: d.tasks.map((t) =>
      t.id === id
        ? // carriedFrom is kept, so a finished rolled-over task still remembers the day it was first planned.
          { ...t, done: !t.done, doneAt: t.done ? undefined : new Date().toISOString() }
        : t,
    ),
  }));
  return undo;
}

export function moveTasks(ids: string[], date: string): Undo {
  const undo = snapshotTasks(ids);
  forgetJustAdded(ids);
  const now = Date.now();
  // Moved tasks go to the end of their new day, keeping their order among themselves.
  updateTasks((tasks) =>
    tasks.map((t) =>
      ids.includes(t.id) ? { ...t, date, order: now + ids.indexOf(t.id), carriedFrom: undefined } : t,
    ),
  );
  return undo;
}

export function updateTask(id: string, patch: { title: string; date: string }): Undo {
  const undo = snapshotTasks([id]);
  forgetJustAdded([id]);
  updateTasks((tasks) =>
    tasks.map((t) =>
      t.id !== id
        ? t
        : patch.date === t.date
          ? { ...t, title: patch.title.trim() }
          : { ...t, title: patch.title.trim(), date: patch.date, order: Date.now(), carriedFrom: undefined },
    ),
  );
  return undo;
}

/**
 * Drag-and-drop (or arrow keys): put a task at `index` among the unfinished tasks of `date`,
 * then renumber that day 0, 1, 2… so the order is saved exactly as shown.
 */
export function placeTask(id: string, date: string, index: number) {
  forgetJustAdded([id]);
  update((d) => {
    const task = d.tasks.find((t) => t.id === id);
    if (!task) return d;
    // Ranked among the day's own tasks; carried-over ones keep their place under From earlier.
    const day = sortForList(d.tasks.filter((t) => t.date === date && !t.done && !t.carriedFrom && t.id !== id));
    day.splice(Math.max(0, Math.min(index, day.length)), 0, { ...task, date });
    const position = new Map(day.map((t, i) => [t.id, i]));
    return {
      ...d,
      tasks: d.tasks.map((t) =>
        position.has(t.id)
          ? { ...t, date, order: position.get(t.id)!, ...(t.id === id ? { carriedFrom: undefined } : {}) }
          : t,
      ),
    };
  });
}

export function deleteTasks(ids: string[]): Undo {
  const undo = snapshotTasks(ids);
  forgetJustAdded(ids);
  updateTasks((tasks) => tasks.filter((t) => !ids.includes(t.id)));
  return undo;
}

/**
 * Start of a new day: every unfinished task from an earlier day moves onto `today`, remembering
 * the day it was first planned for. Untouched, it rolls forward again tomorrow.
 */
export function rollOver(today: string) {
  const current = getSnapshot().data;
  if (!current.tasks.some((t) => !t.done && t.date < today)) return;
  update((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      !t.done && t.date < today ? { ...t, carriedFrom: t.carriedFrom ?? t.date, date: today } : t,
    ),
  }));
}

export function setWrapUpTime(time: string) {
  update((d) => ({ ...d, settings: { ...d.settings, wrapUpTime: time } }));
}

/** End of the welcome flow. A first task means the hint is worth showing. */
export function finishOnboarding({ addedTask }: { addedTask: boolean }) {
  update((d) => ({
    ...d,
    onboarded: true,
    settings: { ...d.settings, wrapUpTime: d.settings.wrapUpTime ?? DEFAULT_WRAP_UP },
    showFirstHint: addedTask,
  }));
}

export function dismissFirstHint() {
  update((d) => ({ ...d, showFirstHint: false }));
}

export function dismissWrapUp(today: string) {
  update((d) => ({ ...d, wrapUpDismissedOn: today }));
}

/** Bring back a wrap-up card that was dismissed with "Not now". */
export function reopenWrapUp() {
  update((d) => ({ ...d, wrapUpDismissedOn: null }));
}

export function dismissStorageNotice() {
  const current = getSnapshot();
  snapshot = { ...current, storage: "ok" };
  emit();
}

// ---- Derived views (pure, so pages stay simple) ----

/** Nothing saved and the welcome flow not done: send them to /welcome. */
export function isNewUser(data: Data): boolean {
  return !data.onboarded && data.tasks.length === 0;
}

export function wrapUpTime(data: Data): string {
  return data.settings.wrapUpTime ?? DEFAULT_WRAP_UP;
}

/** A task's place in its day: its saved order, or when it was added for older data. */
function rank(t: Task): number {
  return t.order ?? Date.parse(t.createdAt);
}

/** Unfinished first, in their saved order (new ones last; never alphabetical), then finished. */
export function sortForList(tasks: Task[]): Task[] {
  const open = tasks.filter((t) => !t.done).sort((a, b) => rank(a) - rank(b));
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return [...open, ...done];
}

export function tasksOn(data: Data, day: string): Task[] {
  return sortForList(data.tasks.filter((t) => t.date === day));
}

/** Unfinished tasks from any past day: they keep piling up until acted on. */
/** Rolled over and not yet acted on. (Also catches anything still dated in the past before the rollover runs.) */
export function isCarried(t: Task, today: string): boolean {
  return !t.done && (t.date < today || !!t.carriedFrom);
}

/** The day a carried task was first planned for, for its "from Mon" label. */
export function plannedDay(t: Task): string {
  return t.carriedFrom ?? t.date;
}

/** Unfinished tasks carried over from earlier days, oldest first. They pile up until acted on. */
export function fromEarlier(data: Data, today: string): Task[] {
  return data.tasks
    .filter((t) => isCarried(t, today))
    .sort((a, b) => plannedDay(a).localeCompare(plannedDay(b)) || rank(a) - rank(b));
}

export function doneOn(data: Data, day: string): number {
  return data.tasks.filter((t) => t.done && t.doneAt && toKey(new Date(t.doneAt)) === day).length;
}
