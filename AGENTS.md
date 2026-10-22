<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Dayplan

A personal to-do list where every task belongs to a day. At a daily wrap-up time you keep or move what's left; unfinished tasks roll over to the next day. Flows are in `flows.md`.

## Stack and rules
- Next.js 16 + Tailwind CSS 4, Clerk for sign-in, Supabase for the database, Open-Meteo for weather. Deployed on Vercel.
- Being moved off localStorage (hw3) onto Supabase per the data model below. Ask before adding npm packages beyond Clerk, Supabase, and Playwright.
- Check with `npm run build` and `npm run lint` before committing. Pull first: the README is sometimes edited on GitHub.

## Data model (Supabase)
Read this before building anything that saves data. Two tables; each row belongs to one person through `user_id`.

`user_id` is the **Clerk user ID** (text like `user_2abc...`), taken from the Clerk session token's `sub` claim (`auth.jwt()->>'sub'`). It is not a Supabase auth user or a uuid. Every table has row-level security: a person can only select, insert, update, or delete rows where `user_id = auth.jwt()->>'sub'`.

### `tasks`: one row per task
| column | type | notes |
|---|---|---|
| `id` | uuid, primary key | default `gen_random_uuid()` |
| `user_id` | text, not null | owner; default `auth.jwt()->>'sub'` |
| `title` | text, not null | 1–120 characters |
| `date` | date, not null | the local day it's planned for (`YYYY-MM-DD`, same as `src/lib/dates.ts`) |
| `done` | boolean, not null | default false |
| `done_at` | timestamptz, null | set when checked off, cleared when unchecked |
| `position` | bigint, not null | order within its day, lower first; was `order` in hw3 (`order` is reserved in SQL) |
| `carried_from` | date, null | the day it was first planned for, if it rolled over; cleared when acted on |
| `created_at` | timestamptz, not null | default `now()` |

Index on `(user_id, date)`: every view loads tasks by person and day.

### `user_settings`: one row per person
| column | type | notes |
|---|---|---|
| `user_id` | text, primary key | owner; one row per person; default `auth.jwt()->>'sub'` |
| `wrap_up_time` | time, null | when their day ends; null means never chosen, use 18:00 |
| `onboarded` | boolean, not null | default false; true once onboarding is finished or skipped |
| `weather_mode` | text, null | `location`, `place`, or `off`; null means not asked yet |
| `weather_lat` | numeric(4,2), null | rounded to 2 decimals (about 1 km); never store an exact position |
| `weather_lon` | numeric(5,2), null | rounded to 2 decimals |
| `weather_place_name` | text, null | label for a searched city (e.g. "Chicago, Illinois"); null for `location`, shown as "Your location" |

`weather_mode` meanings: `location` reads the device's position on each device (saved coordinates are the fallback when a device hasn't granted access); `place` always uses the saved city; `off` shows no weather.

### Not in the database
- **The forecast.** Fetched from Open-Meteo each time; it changes hourly and is the same for everyone. Store the location, never the weather.
- **Wrap-up "Not now" (`wrapUpDismissedOn`) and the one-time hint (`showFirstHint`).** Small UI memory that stays in localStorage on each device; a new device may show them again.
- **hw3 localStorage tasks** are not imported; accounts start fresh.

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
