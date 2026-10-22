// Days are local "YYYY-MM-DD" keys. Never use toISOString() here: it converts
// to UTC and can shift the day for anyone west or east of Greenwich.

const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

/** Returns a local Date at midnight, or null if the key isn't a real day. */
export function fromKey(key: string): Date | null {
  if (!KEY_PATTERN.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return toKey(date) === key ? date : null;
}

export function isValidKey(key: string): boolean {
  return fromKey(key) !== null;
}

export function addDays(key: string, days: number): string {
  const date = fromKey(key)!;
  date.setDate(date.getDate() + days);
  return toKey(date);
}

export function daysBetween(from: string, to: string): number {
  const ms = fromKey(to)!.getTime() - fromKey(from)!.getTime();
  return Math.round(ms / 86_400_000);
}

/** "Thu, Oct 23", or "Thu, Oct 22, 2027" when the day is more than a year from today. */
export function formatDay(key: string): string {
  if (Math.abs(daysBetween(todayKey(), key)) > 365) return formatLongDay(key);
  return fromKey(key)!.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "Thu, Oct 22, 2027": with the year, for dates far enough away that the year matters. */
export function formatLongDay(key: string): string {
  return fromKey(key)!.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Today", "Tomorrow", "Yesterday", or "Thu, Oct 23" */
export function dayName(key: string, today: string): string {
  const diff = daysBetween(today, key);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(key);
}

/** Where a rolled-over task came from: "from yesterday", "from Mon", or "from Sep 20" once it's a week or more. */
export function ageLabel(key: string, today: string): string {
  const days = daysBetween(key, today);
  if (days === 1) return "from yesterday";
  if (days < 7) {
    const weekday = fromKey(key)!.toLocaleDateString("en-US", { weekday: "short" });
    return `from ${weekday}`;
  }
  const far = Math.abs(daysBetween(todayKey(), key)) > 365;
  const date = fromKey(key)!.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(far ? { year: "numeric" } : {}) });
  return `from ${date}`;
}

/** "18:00" → "6 PM", "18:30" → "6:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? "AM" : "PM";
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Where to land after adding a task: Today for today, At a Glance for any later day. */
export function addedHref(key: string, today: string): string {
  return key === today ? "/" : "/glance";
}

/** Where a day's list lives: today is the home page; any other day opens in the calendar. */
export function dayHref(key: string, today: string): string {
  return key === today ? "/" : `/calendar?day=${key}`;
}

// ---- Months, for the calendar. A month key is "YYYY-MM". ----

export function monthOf(key: string): string {
  return key.slice(0, 7);
}

export function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month) && isValidKey(`${month}-01`);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return toKey(new Date(y, m - 1 + n, 1)).slice(0, 7);
}

/** "October 2026" */
export function formatMonth(month: string): string {
  return fromKey(`${month}-01`)!.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** The day keys of a month laid out Sunday-first, padded with nulls so it fills whole weeks. */
export function monthGrid(month: string): (string | null)[] {
  const first = fromKey(`${month}-01`)!;
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = new Date(first); d.getMonth() === first.getMonth(); d.setDate(d.getDate() + 1)) {
    cells.push(toKey(d));
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}
