import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { USERS } from "./users";

/**
 * Two tasks with the same name are still two separate tasks: reordering, checking off,
 * and deleting one never touches the other, and that holds after a reload from Supabase.
 */
test("two tasks with the same name are controlled separately", async ({ page }) => {
  const run = Date.now();
  const name = `Same name ${run}`;
  const divider = `Divider task ${run + 1}`;

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USERS.bob.email });
  await openToday(page);
  await finishOnboardingIfAsked(page);

  try {
    await addTask(page, name);
    await addTask(page, divider);
    // The exact-duplicate warning asks once; pressing Add again keeps both.
    await addTask(page, name, { confirmDuplicate: true });
    await expect(sameName(page)).toHaveCount(2);

    // Reorder: move the second "Same name" (last in the list) to the top with the keyboard.
    const handles = page.getByRole("button", { name: `Reorder "${name}". Use up and down arrows, or drag.` }).locator("visible=true");
    await expect(handles).toHaveCount(2);
    await handles.nth(1).focus();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(todaysTitles(page)).toHaveText([name, name, divider]);

    // Check off only the top one: exactly one is done, the other stays open.
    // One plain click: check() would re-find "the first" after the row moves to Done and click again.
    await sameName(page).first().click();
    await expect(sameName(page).and(page.locator(":checked"))).toHaveCount(1);
    await expect(sameName(page).and(page.locator(":not(:checked)"))).toHaveCount(1);

    // Delete the finished one (it's in "Done today"); the open one must survive.
    const doneList = page.getByRole("list", { name: "Done today" }).locator("visible=true");
    await doneList.getByRole("button", { name: `Edit "${name}"` }).click();
    await page.getByRole("button", { name: "Delete task" }).locator("visible=true").click();
    await expect(sameName(page)).toHaveCount(1);
    await expect(sameName(page)).not.toBeChecked();

    // Fresh from Supabase: still exactly one, still open, divider untouched.
    await page.waitForTimeout(1500); // let the queued saves finish
    await openToday(page);
    await expect(sameName(page)).toHaveCount(1);
    await expect(sameName(page)).not.toBeChecked();
    await expect(checkbox(page, divider)).toHaveCount(1);
  } finally {
    await deleteAll(page, name).catch(() => {});
    await deleteAll(page, divider).catch(() => {});
  }
});

function checkbox(page: Page, title: string) {
  return page.getByRole("checkbox", { name: title, exact: true }).locator("visible=true");
}

function sameName(page: Page) {
  return page.getByRole("checkbox", { name: /^Same name \d+$/ }).locator("visible=true");
}

/** Titles of today's open tasks, top to bottom. */
function todaysTitles(page: Page) {
  return page.getByRole("region", { name: "Today's tasks" }).locator("visible=true").locator("li label");
}

async function openToday(page: Page) {
  await page.goto("/");
  await expect(
    page.getByLabel("Add a task for today").or(page.getByRole("heading", { name: "Welcome to Dayplan" })),
  ).toBeVisible();
}

async function finishOnboardingIfAsked(page: Page) {
  if (!(await page.getByRole("heading", { name: "Welcome to Dayplan" }).isVisible())) return;
  await page.getByRole("button", { name: "Get started" }).click();
  await page.locator("label", { has: page.getByRole("radio", { name: "6 PM" }) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Pick a city instead" }).click();
  await page.getByRole("button", { name: "Skip weather" }).click();
  await page.getByRole("button", { name: "I’ll add tasks later" }).click();
  await expect(page.getByLabel("Add a task for today")).toBeVisible();
}

async function addTask(page: Page, title: string, { confirmDuplicate = false } = {}) {
  const before = await checkbox(page, title).count();
  await page.getByLabel("Add a task for today").fill(title);
  const add = page.getByRole("button", { name: "Add", exact: true });
  await add.click();
  if (confirmDuplicate) {
    await expect(page.getByText(/is already on .* press Add again/)).toBeVisible();
    await add.click();
  }
  await expect(checkbox(page, title)).toHaveCount(before + 1);
}

async function deleteAll(page: Page, title: string) {
  await openToday(page);
  while ((await page.getByRole("button", { name: `Edit "${title}"` }).locator("visible=true").count()) > 0) {
    await page.getByRole("button", { name: `Edit "${title}"` }).locator("visible=true").first().click();
    await page.getByRole("button", { name: "Delete task" }).locator("visible=true").click();
    await page.waitForTimeout(300);
  }
}
