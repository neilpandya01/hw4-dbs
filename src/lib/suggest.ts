import type { Task } from "./store";

/**
 * The best earlier task name that starts with what's been typed, for Tab-to-complete.
 * Looks at every task ever saved (past, done, or planned). The most-used name wins,
 * then the most recent. Needs at least 2 letters, and never suggests what's already typed.
 */
export function suggestTitle(typed: string, tasks: Pick<Task, "title" | "createdAt">[]): string | null {
  if (typed.trimStart() !== typed) return null;
  const prefix = typed.toLowerCase();
  if (prefix.trim().length < 2) return null;

  const seen = new Map<string, { title: string; count: number; last: string }>();
  for (const t of tasks) {
    const key = t.title.toLowerCase();
    if (!key.startsWith(prefix) || key === prefix) continue;
    const entry = seen.get(key);
    if (entry) {
      entry.count++;
      if (t.createdAt > entry.last) entry.last = t.createdAt;
    } else {
      seen.set(key, { title: t.title, count: 1, last: t.createdAt });
    }
  }

  let best: { title: string; count: number; last: string } | null = null;
  for (const e of seen.values()) {
    if (!best || e.count > best.count || (e.count === best.count && e.last > best.last)) best = e;
  }
  return best?.title ?? null;
}
