# End-to-end tests

`rls.spec.ts` signs in two Clerk test users (Alice and Bob) in separate browsers. Each adds a task, both reload, and the test checks that each sees only their own.

`same-name.spec.ts` adds two tasks with the same name, reorders them, checks one off, deletes it, and reloads: the other stays, untouched.

```bash
npm run test:e2e
```

- Needs `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`. `global-setup.ts` uses them to get a Clerk testing token (which skips Clerk's bot check) and to create the two test users on the first run.
- Uses the dev server on `localhost:3000`, and starts one if none is running.
- On WSL/Linux, Chromium needs system libraries: `sudo npx playwright install-deps chromium`.

## Watching it fail

The app loads tasks with `select("*")` and no user filter, so the "Read own tasks" policy is the only thing keeping lists private. To break it (in the Supabase SQL editor):

```sql
alter policy "Read own tasks" on public.tasks using (true);
```

The test fails with `Alice must not see Bob's task` (Expected 0, Received 1). `evidence/` holds the output and screenshots from that run. To fix it:

```sql
alter policy "Read own tasks" on public.tasks using ((select auth.jwt() ->> 'sub') = user_id);
```
