// Two Clerk dev-instance test users. "+clerk_test" emails never get real mail.
// The password is only used to create them; tests sign in with a one-time sign-in token.
export const USERS = {
  alice: { email: "dayplan-rls-alice+clerk_test@example.com", firstName: "Alice" },
  bob: { email: "dayplan-rls-bob+clerk_test@example.com", firstName: "Bob" },
} as const;

export const TEST_PASSWORD = "Dayplan-RLS-test-7f3k!";
