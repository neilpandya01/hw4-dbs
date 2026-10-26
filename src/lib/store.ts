"use client";

import { useSyncExternalStore } from "react";
import { toKey } from "./dates";
import { supabase } from "./supabase";

// The only data layer. Tasks and settings belong to the signed-in person and live in Supabase
// (tables `tasks` and `user_settings`; row-level security limits each person to their own rows).
//
// Every change shows on screen at once, then is saved in the background, one write at a time,
// in order. Actions don't talk to the database themselves: after each change, the tasks that
// differ from before are upserted and the missing ones deleted. So every action, and its Undo,
// saves the same way.
//
// Two small pieces of UI memory stay on each device (localStorage), per AGENTS.md:
// the wrap-up "Not now" and the one-time hint.

export type Task = {
  id: string;
  title: string;
  /** The local day it's planned for. Unfinished tasks from past days roll over onto today. */
  date: string;
  done: boolean;
  doneAt?: string;
  createdAt: string;
  /**
   * Position within its day (`position` in the database): lower comes first. New and moved tasks
   * get the current time, which is always larger than any earlier value, so they land at the end
   * of the day. Dragging renumbers a day 0, 1, 2…
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
  settings: { wrapUpTime: string | null };
  /** This device only. */
  wrapUpDismissedOn: string | null;
  tasks: Task[];
  /** Set when the welcome flow is finished or skipped. Undefined when the list couldn't load, so it's unknown. */
  onboarded?: boolean;
  /** This device only. Show the one-time "here's how it works" hint until the first check-off or "Got it". */
  showFirstHint?: boolean;
};

/** save-failed: a change didn't reach the database. load-failed: the list couldn't be loaded. */
export type StorageStatus = "ok" | "save-failed" | "load-failed";

/** lastAddedId is memory-only: it marks a new task as "just added" for a few seconds. */
export type Snapshot = { data: Data; storage: StorageStatus; lastAddedId?: string };

export const DEFAULT_WRAP_UP = "18:00";

// ---- This device's UI memory ----

type DeviceUi = { wrapUpDismissedOn: string | null; showFirstHint: boolean };
const uiKey = (id: string) => `dayplan:ui:${id}`;

function loadUi(id: string): DeviceUi {
  try {
    const v = JSON.parse(localStorage.getItem(uiKey(id)) ?? "{}") as Partial<DeviceUi>;
    return {
      wrapUpDismissedOn: typeof v.wrapUpDismissedOn === "string" ? v.wrapUpDismissedOn : null,
      showFirstHint: v.showFirstHint === true,
    };
  } catch {
    return { wrapUpDismissedOn: null, showFirstHint: false };
  }
}

function saveUi(id: string, data: Data) {
  try {
    const ui: DeviceUi = { wrapUpDismissedOn: data.wrapUpDismissedOn, showFirstHint: !!data.showFirstHint };
    localStorage.setItem(uiKey(id), JSON.stringify(ui));
  } catch {
    // Private mode or blocked storage: the hint or "Not now" may just show again. Nothing is lost.
  }
}

// ---- Database rows ----

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  done: boolean;
  done_at: string | null;
  position: number;
  carried_from: string | null;
  created_at: string;
};

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    done: r.done,
    doneAt: r.done_at ?? undefined,
    createdAt: r.created_at,
    order: Number(r.position),
    carriedFrom: r.carried_from ?? undefined,
  };
}

function toRow(t: Task, userId: string): TaskRow {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    date: t.date,
    done: t.done,
    done_at: t.done ? (t.doneAt ?? new Date().toISOString()) : null,
    position: Math.round(t.order ?? Date.parse(t.createdAt)),
    carried_from: t.carriedFrom ?? null,
    created_at: t.createdAt,
  };
}

// ---- The store ----

let userId: string | null = null;
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot | null {
  return snapshot;
}

/** null while signed out or still loading: show a skeleton, never a fake empty list. */
export function useStore(): Snapshot | null {
  return useSyncExternalStore<Snapshot | null>(subscribe, getSnapshot, () => null);
}

// Whether any change is still on its way to the database, for the footer's "Saving…".
// Kept apart from the snapshot so each save doesn't re-render every view.
let saving = false;
const savingListeners = new Set<() => void>();

function setSaving(next: boolean) {
  if (saving === next) return;
  saving = next;
  savingListeners.forEach((l) => l());
}

export function useSaving(): boolean {
  return useSyncExternalStore(
    (listener) => {
      savingListeners.add(listener);
      return () => savingListeners.delete(listener);
    },
    () => saving,
    () => false,
  );
}

/** Bumped by every local change, so a reload that started earlier never overwrites it. */
let changeCount = 0;
let pendingWrites = 0;
let queue: Promise<void> = Promise.resolve();
let lastFetch = 0;

function setStatus(storage: StorageStatus) {
  if (snapshot && snapshot.storage !== storage) {
    snapshot = { ...snapshot, storage };
    emit();
  }
}

/** Fetch this person's tasks and settings, unless a local change happened meanwhile. */
async function fetchAll(id: string) {
  const db = supabase();
  if (!db) return failLoad(id);
  const startedAt = changeCount;
  lastFetch = Date.now();
  const [tasks, settings] = await Promise.all([
    db.from("tasks").select("*"),
    db.from("user_settings").select("wrap_up_time, onboarded").maybeSingle(),
  ]);
  if (userId !== id) return; // signed out or switched people meanwhile
  if (tasks.error || settings.error) return failLoad(id);
  if (changeCount !== startedAt || pendingWrites > 0) return; // our own newer edits win; next reload catches up
  const ui = loadUi(id);
  snapshot = {
    data: {
      settings: { wrapUpTime: settings.data?.wrap_up_time ? String(settings.data.wrap_up_time).slice(0, 5) : null },
      onboarded: settings.data?.onboarded === true,
      tasks: (tasks.data as TaskRow[]).map(toTask),
      wrapUpDismissedOn: ui.wrapUpDismissedOn,
      showFirstHint: ui.showFirstHint,
    },
    storage: "ok",
    lastAddedId: snapshot?.lastAddedId,
  };
  emit();
}

function failLoad(id: string) {
  if (snapshot) return setStatus("load-failed");
  const ui = loadUi(id);
  snapshot = {
    data: { settings: { wrapUpTime: null }, tasks: [], wrapUpDismissedOn: ui.wrapUpDismissedOn, showFirstHint: ui.showFirstHint },
    storage: "load-failed",
  };
  emit();
}

/** Called when the signed-in person changes (null on sign-out). */
export async function loadStore(id: string | null) {
  if (id === userId) return;
  userId = id;
  snapshot = null;
  emit();
  if (id) await fetchAll(id);
}

/**
 * Pick up changes made on another device or tab: on returning to the tab, at most every 15 seconds,
 * and only when nothing of ours is still saving.
 */
export async function refreshStore() {
  if (!userId || pendingWrites > 0 || Date.now() - lastFetch < 15_000) return;
  await fetchAll(userId);
}

/** "Try again" after a failed load or save: reload what the database actually has. */
export function reloadStore() {
  if (!userId) return;
  lastFetch = 0;
  pendingWrites = 0;
  setSaving(false);
  void fetchAll(userId);
}

/** Queue one database write. Writes run one at a time, in the order the changes were made. */
function persist(write: (db: NonNullable<ReturnType<typeof supabase>>, id: string) => PromiseLike<{ error: unknown }>) {
  const db = supabase();
  const id = userId;
  if (!db || !id) return setStatus("save-failed");
  pendingWrites++;
  setSaving(true);
  queue = queue.then(async () => {
    try {
      const { error } = await write(db, id);
      if (error && userId === id) setStatus("save-failed");
    } catch {
      if (userId === id) setStatus("save-failed");
    } finally {
      pendingWrites = Math.max(0, pendingWrites - 1);
      if (pendingWrites === 0) setSaving(false);
    }
  });
}

/** Save what changed between two versions of the data. */
function persistChanges(before: Data, after: Data) {
  const old = new Map(before.tasks.map((t) => [t.id, t]));
  // Actions keep unchanged tasks as the same object, so anything new or different is a changed task.
  const changed = after.tasks.filter((t) => old.get(t.id) !== t);
  const kept = new Set(after.tasks.map((t) => t.id));
  const removed = before.tasks.filter((t) => !kept.has(t.id)).map((t) => t.id);
  if (changed.length) persist((db, id) => db.from("tasks").upsert(changed.map((t) => toRow(t, id))));
  if (removed.length) persist((db) => db.from("tasks").delete().in("id", removed));

  if (before.settings.wrapUpTime !== after.settings.wrapUpTime || !!before.onboarded !== !!after.onboarded) {
    // If the list couldn't load, we don't know whether onboarding was finished: leave it as saved.
    const onboarded = after.onboarded === undefined ? {} : { onboarded: after.onboarded };
    persist((db, id) =>
      db
        .from("user_settings")
        .upsert({ user_id: id, wrap_up_time: after.settings.wrapUpTime, ...onboarded }, { onConflict: "user_id" }),
    );
  }
  if (userId && (before.wrapUpDismissedOn !== after.wrapUpDismissedOn || before.showFirstHint !== after.showFirstHint)) {
    saveUi(userId, after);
  }
}

function update(change: (data: Data) => Data) {
  if (!snapshot) return;
  const before = snapshot.data;
  const data = change(before);
  if (data === before) return;
  changeCount++;
  snapshot = { ...snapshot, data };
  emit();
  persistChanges(before, data);
}

function updateTasks(change: (tasks: Task[]) => Task[]) {
  update((d) => ({ ...d, tasks: change(d.tasks) }));
}

/** The current data. Actions only run once the list has loaded. */
function current(): Data {
  return snapshot?.data ?? { settings: { wrapUpTime: null }, wrapUpDismissedOn: null, tasks: [] };
}

/** Every action returns an undo function for the toast. */
type Undo = () => void;

/**
 * Undo for one action: remembers only the tasks it touches (`ids`) and, when undone, puts exactly
 * those back. Anything added or changed since, here or in another tab, is left alone.
 */
function snapshotTasks(ids: string[]): Undo {
  const before = current().tasks.filter((t) => ids.includes(t.id));
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
  if (snapshot) {
    snapshot = { ...snapshot, lastAddedId: id };
    emit();
  }
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
  if (!current().tasks.some((t) => !t.done && t.date < today)) return;
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


// ---- Derived views (pure, so pages stay simple) ----

/** Nothing saved and the welcome flow not done: send them to /welcome. Never when the list failed to load. */
export function isNewUser(store: Snapshot): boolean {
  return store.storage !== "load-failed" && !store.data.onboarded && store.data.tasks.length === 0;
}

export function wrapUpTime(data: Data): string {
  return data.settings.wrapUpTime ?? DEFAULT_WRAP_UP;
}

/** A task's place in its day: its saved order, or when it was added. */
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
