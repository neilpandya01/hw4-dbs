# Security review: `add-clerk` vs `main`

Run with `/security-review` on the `add-clerk` branch, Oct 23, 2026.

**No high-confidence vulnerabilities found. No changes are needed before merging.**

The review left out the vendored Clerk skill docs in `.agents/skills/**` because they are documentation, not code.

## What was checked

- **Row-level security (migration and live database).**
  - RLS is on for `tasks` and `user_settings`, and the live policies match the migration.
  - Every policy is `TO authenticated` and checks `(select auth.jwt()->>'sub') = user_id`.
  - Updates check the row both before and after the change, and inserts check the new row.
  - The database has no `SECURITY DEFINER` functions or views that could get around RLS.
- **Signed-out visitors.** There are no policies for the `anon` role, so they get no rows. `src/proxy.ts` protects every route except `/sign-in` and `/sign-up`.
- **Upsert takeover or spoofing.** A user can't take over another person's task by upserting with its `id`, because the update check fails. They also can't write rows with someone else's `user_id`, because the insert check blocks it.
- **Supabase client.** It uses only the publishable key and sends the Clerk session token. On sign-out it clears the token and the loaded data. There are no server routes using a secret key.
- **XSS and redirects.** There is no `dangerouslySetInnerHTML`, `innerHTML` or `eval`. The sign-in and sign-up URLs are fixed paths.
- **Open-Meteo calls.** The URLs are fixed and the parameters are built with `URLSearchParams`, so there's nothing to inject.
- **Committed files.**
  - `.mcp.json` holds only the Supabase project URL.
  - `.claude/settings.json` holds only the `.env` deny rule.
  - The Clerk secret key is read from the environment, never written in code.

## Optional cleanup (low risk, not required)

- **Test password in the repo.** `e2e/users.ts` contains the password for the two `+clerk_test` users. It only exists to create them, since the test signs in with one-time tokens. Test files are excluded from this review and the impact is very low. To keep it out of the repo, you could load it from `.env.local` or generate a random one in `global-setup.ts`.
- **Depends on Clerk being linked to Supabase.** RLS only works while Clerk stays set up as a third-party sign-in provider in Supabase. If that link were removed, Supabase would reject every request rather than expose data.
