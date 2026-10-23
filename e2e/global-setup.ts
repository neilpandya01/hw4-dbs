import { createClerkClient } from "@clerk/nextjs/server";
import { clerkSetup } from "@clerk/testing/playwright";
import { TEST_PASSWORD, USERS } from "./users";

/**
 * Runs once before the tests:
 * 1. Gets a Clerk testing token, so Clerk's bot check doesn't block the automated browser.
 * 2. Makes sure both test users exist in Clerk (creates them on the first run).
 */
export default async function globalSetup() {
  await clerkSetup();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is missing from .env.local");
  const clerk = createClerkClient({ secretKey });

  for (const user of Object.values(USERS)) {
    const found = await clerk.users.getUserList({ emailAddress: [user.email] });
    if (found.data.length > 0) continue;
    await clerk.users.createUser({
      emailAddress: [user.email],
      firstName: user.firstName,
      password: TEST_PASSWORD,
      skipPasswordChecks: true,
    });
  }
}
