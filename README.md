# Dayplan

A personal to-do list where every task belongs to a day. Add tasks to today or any day ahead and check them off. At a wrap-up time you choose, Dayplan asks what to do with anything left: keep it for tomorrow, move it, or let it go. Whatever you skip rolls over to the next day, so nothing unfinished gets lost.

## Features

- **Accounts:** sign up and sign in with Clerk. Your list is saved to your account, so it's there on any device, and nobody else can see it.
- **Views:** Today, At a Glance (the days ahead), Calendar, and Done. Drag or use the arrow keys to reorder; all views stay in sync.
- **Wrap-up and rollover:** a "Wrap up your day" card at your chosen time; unfinished tasks roll over under "Rolled over" on Today.
- **Weather (optional):** today's forecast and the week ahead from Open-Meteo, for your location or a city you pick. Change it or turn it off any time from the header.
- **Undo** for moves and deletes, a short onboarding for new accounts, light and dark themes, and full keyboard support.

How each of these works, step by step, is in [flows.md](flows.md).

## How it's built

- **Next.js 16 and Tailwind CSS 4**, deployed on Vercel.
- **Clerk** for sign-in. Every page except `/sign-in` and `/sign-up` needs an account (`src/proxy.ts`).
- **Supabase** for data: `tasks` and `user_settings`, with row-level security so each person can only read and change their own rows. The browser talks to Supabase directly with the publishable key and the Clerk session token.
- **Open-Meteo** for the forecast and city search, called from the browser (no key). With "use my location", BigDataCloud's free endpoint names the nearest town. Only coordinates rounded to about 1 km are ever sent or saved.

The data model and code layout are in [AGENTS.md](AGENTS.md).

## Running it locally

Create `.env.local` with your own keys (never commit it):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database tables and policies are in `supabase/migrations/`.

## Tests

```bash
npm run test:e2e
```

Playwright signs in two test users and checks that neither can see the other's tasks (row-level security), and that two tasks with the same name stay separate. See [e2e/README.md](e2e/README.md). Security review results are in [SECURITY_REVIEW.md](SECURITY_REVIEW.md).
