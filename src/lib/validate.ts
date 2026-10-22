import { daysBetween, formatDay, formatLongDay, isValidKey } from "./dates";
import type { Task } from "./store";

export const MAX_TITLE = 120;

export type TaskErrors = { title?: string; date?: string };

/**
 * Errors say what to do next, and sit next to the field they're about.
 * `originalDate` lets an edited task keep the past day it already has.
 */
export function validateTask(
  title: string,
  date: string,
  today: string,
  { originalDate }: { originalDate?: string } = {},
): TaskErrors {
  const errors: TaskErrors = {};
  const trimmed = title.trim();
  if (!trimmed) errors.title = "Enter a task name.";
  else if (trimmed.length > MAX_TITLE)
    errors.title = `Shorten this to ${MAX_TITLE} characters or fewer (now ${trimmed.length}).`;

  if (!date) errors.date = "Pick a day for this task.";
  else if (!isValidKey(date)) errors.date = "That's not a real date. Check the year.";
  else if (date < today && date !== originalDate) errors.date = "Pick today or a later day.";
  return errors;
}

/** A date more than a year out is usually a typo in the year (2062 for 2026). Warn once; don't block. */
export function farFutureWarning(date: string, today: string, button = "Add"): string | null {
  if (!isValidKey(date) || daysBetween(today, date) <= 365) return null;
  return `${formatLongDay(date)} is more than a year away. Check the year, or press ${button} again to keep it.`;
}

// ---- "Too similar" check: a soft warning, never a block ----

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "");
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

const numbers = (s: string) => (s.match(/\d+/g) ?? []).join(" ");

/**
 * Close enough to be the same task by mistake. Tolerant on purpose:
 * - different numbers are different tasks ("Task 1" / "Task 2", "Read ch 3" / "Read ch 4")
 * - one name inside the other counts ("Laundry" / "Do laundry tonight")
 * - a typo counts only inside one word, at least 4 letters long, starting with the same letter
 *   ("Calll mom" / "Call Mom"), so real words that happen to be close don't ("Buy milk" / "Buy silk")
 */
function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (numbers(a) !== numbers(b)) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 4 && long.includes(short)) return true;

  const wa = a.split(" ");
  const wb = b.split(" ");
  if (wa.length !== wb.length) return false;
  const differing = wa.map((w, i) => [w, wb[i]] as const).filter(([x, y]) => x !== y);
  if (differing.length !== 1) return false;
  const [x, y] = differing[0];
  return Math.min(x.length, y.length) >= 4 && x[0] === y[0] && editDistance(x, y) <= (Math.max(x.length, y.length) >= 7 ? 2 : 1);
}

/** A warning to show under the task field, or null. Only compares unfinished tasks on the same day. */
export function similarWarning(
  title: string,
  date: string,
  tasks: Task[],
  { excludeId, button = "Add" }: { excludeId?: string; button?: string } = {},
): { message: string; match: Task } | null {
  const wanted = normalize(title);
  if (!wanted) return null;
  const sameDay = tasks.filter((t) => t.date === date && !t.done && t.id !== excludeId);
  const exact = sameDay.find((t) => normalize(t.title) === wanted);
  if (exact) {
    return {
      match: exact,
      message: `"${exact.title}" is already on ${formatDay(date)}. To keep both, press ${button} again.`,
    };
  }
  const close = sameDay.find((t) => isSimilar(normalize(t.title), wanted));
  if (close) {
    return {
      match: close,
      message: `This looks like "${close.title}", already on ${formatDay(date)}. Change the name, or press ${button} again to keep both.`,
    };
  }
  return null;
}
