<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Dayplan

A personal to-do list where every task belongs to a day. At a daily wrap-up time you keep or move what's left; unfinished tasks roll over to the next day. Flows are in `flows.md`.

## Stack and rules
- Next.js 16 + Tailwind CSS 4. All data is in localStorage. No backend, database, accounts, external APIs, or extra npm packages.
- Check with `npm run build` and `npm run lint` before committing. Pull first: the README is sometimes edited on GitHub.

## Where things are
- `src/lib/store.ts`: the only data layer. Key `todo:v1`; `useStore()`; every action (add, toggle, move, place, delete) returns an Undo that restores only the tasks it touched.
- `src/lib/dates.ts`: local `YYYY-MM-DD` day keys. Never use `toISOString()` for a day.
- `src/lib/validate.ts`: task errors and soft warnings (similar names, far-future dates). `src/lib/clock.ts`: current day and minute, ticking on the minute.
- Routes: `/` Today, `/add`, `/glance` At a Glance, `/calendar`, `/done`, `/welcome` onboarding (`?step=time|task`).
- `src/components`: shared UI. Reuse it instead of one-off markup.

## How it behaves
- **Onboarding is required.** `OnboardingGate` sends new users to `/welcome`; `/welcome` sends finished users on.
- **Rollover.** `DayRollover` calls `rollOver(today)`: unfinished past tasks move to today with `carriedFrom` set to their original day. Today shows them in a "Rolled over" group (`FromEarlier`); At a Glance and Calendar pin them at the top of today (`pinned` in `ReorderableGroups`).
- **Order.** Each task has a saved `order`. New and moved tasks go last in their day, never alphabetical. Rankable lists use `ReorderableGroups` so all three views stay in sync.
- **Feedback.** Errors sit under their field, say what to do next, and keep what was typed. Toasts with Undo only for moves and deletes. Bulk deletes confirm first (`ConfirmButton`).

## Next.js gotchas here
- Cache Components is on: pages you leave are hidden (React `<Activity>`), not unmounted. Don't leave buttons disabled after an action. Reset transient UI in a `useLayoutEffect` cleanup.
- Any client component reading the URL (`usePathname`, `useParams`, `useSearchParams`) must be inside `<Suspense>`, or the build fails.

## Style
- Colors come from tokens in `src/app/globals.css` (light and dark, contrast-checked). Every input has a real `<label>`; everything works by keyboard.
