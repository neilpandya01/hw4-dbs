import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { USERS } from "./users";

/**
 * Row-level security, end to end: two people sign in, each saves a task,
 * and neither can see the other's.
 *
 * The app loads tasks with `select("*")` and no user filter, so the database's
 * row-level security is the only thing keeping each person's tasks private.
 * Break the "Read own tasks" policy and this test fails.
 */
test("two users each save a task, and neither can see the other's", async ({ browser }) => {
  // Numbers in the titles keep them unique per run (and stop the "too similar" warning).
  const run = Date.now();
  const aliceTask = `Alice private task ${run}`;
  const bobTask = `Bob private task ${run}`;

  // Separate browser contexts: two people on two devices, no shared cookies.
  const alice = await signedInPage(browser, USERS.alice.email);
  const bob = await signedInPage(browser, USERS.bob.email);

  try {
    // Each saves something.
    await addTaskForToday(alice, aliceTask);
    await addTaskForToday(bob, bobTask);

    // Reload, so each list comes fresh from Supabase rather than from memory.
    await openToday(alice);
    await openToday(bob);

    // Each still sees their own task...
    await expect(taskRow(alice, aliceTask), "Alice should see her own task").toBeVisible();
    await expect(taskRow(bob, bobTask), "Bob should see his own task").toBeVisible();

    // ...and not the other person's.
    await expect(taskRow(alice, bobTask), "Alice must not see Bob's task").toHaveCount(0);
    await expect(taskRow(bob, aliceTask), "Bob must not see Alice's task").toHaveCount(0);
  } finally {
    // Leave the test accounts tidy for the next run.
    await deleteTask(alice, aliceTask).catch(() => {});
    await deleteTask(bob, bobTask).catch(() => {});
    await alice.context().close();
    await bob.context().close();
  }
});

/** A fresh browser context signed in as `email`, finished with onboarding, on Today. */
async function signedInPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
  await openToday(page);
  await finishOnboardingIfAsked(page);
  return page;
}

/** Load Today and wait until this person's tasks have loaded (or onboarding opened). */
async function openToday(page: Page) {
  await page.goto("/");
  await expect(page.getByLabel("Add a task for today").or(page.getByRole("heading", { name: "Welcome to Dayplan" }))).toBeVisible();
}

/** A new account is sent to /welcome first: answer the required steps, skipping the optional ones. */
async function finishOnboardingIfAsked(page: Page) {
  if (!(await page.getByRole("heading", { name: "Welcome to Dayplan" }).isVisible())) return;
  await page.getByRole("button", { name: "Get started" }).click();
  // The radio is visually hidden behind its chip, so click the chip (its <label>).
  await page.locator("label", { has: page.getByRole("radio", { name: "6 PM" }) }).click();
  await expect(page.getByRole("radio", { name: "6 PM" })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Pick a city instead" }).click();
  await page.getByRole("button", { name: "Skip weather" }).click();
  await page.getByRole("button", { name: "I’ll add tasks later" }).click();
  await expect(page.getByLabel("Add a task for today")).toBeVisible();
}

/** Add a task on Today and wait until Supabase has saved it. */
async function addTaskForToday(page: Page, title: string) {
  const saved = page.waitForResponse(
    (r) => r.url().includes("/rest/v1/tasks") && r.request().method() === "POST",
  );
  await page.getByLabel("Add a task for today").fill(title);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const response = await saved;
  expect(response.ok(), `saving "${title}" failed with ${response.status()}`).toBe(true);
  await expect(taskRow(page, title)).toBeVisible();
}

/** The checkbox for a task on the visible page (hidden, cached pages don't count). */
function taskRow(page: Page, title: string) {
  return page.getByRole("checkbox", { name: title, exact: true }).locator("visible=true");
}

async function deleteTask(page: Page, title: string) {
  await openToday(page);
  await page.getByRole("button", { name: `Edit "${title}"` }).locator("visible=true").click();
  await page.getByRole("button", { name: "Delete task" }).locator("visible=true").click();
  await expect(taskRow(page, title)).toHaveCount(0);
}
