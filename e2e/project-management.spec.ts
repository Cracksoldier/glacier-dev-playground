import { expect, type Page, test } from "@playwright/test";

async function pressSaveShortcut(page: Page) {
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+s" : "Control+s",
  );
}

function activeProjectTitle(page: Page) {
  // The toolbar's <header> has two <p> elements: the "DEV PLAYGROUND"
  // subtitle, then the active project's title.
  return page.getByRole("banner").getByRole("paragraph").last();
}

test("persists a newly created project across reloads", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Title").fill("Playwright Project");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(activeProjectTitle(page)).toHaveText("Playwright Project");

  await pressSaveShortcut(page);
  await expect(page.getByRole("status")).toHaveText(/Saved/);

  await page.reload();
  await expect(activeProjectTitle(page)).toHaveText("Playwright Project");
});

test("restores the last active project, not just the most recently created one, after reload", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Title").fill("Second Project");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(activeProjectTitle(page)).toHaveText("Second Project");

  await page.getByRole("button", { name: "Switch project" }).click();
  await page
    .getByRole("group", { name: "Projects" })
    .getByRole("button", { name: "Basic HTML Example", exact: true })
    .click();
  await expect(activeProjectTitle(page)).toHaveText("Basic HTML Example");

  await pressSaveShortcut(page);
  await expect(page.getByRole("status")).toHaveText(/Saved/);

  await page.reload();
  await expect(activeProjectTitle(page)).toHaveText("Basic HTML Example");
});

test("renames, duplicates, and deletes projects through the switcher", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch project" }).click();
  const menu = page.getByRole("group", { name: "Projects" });

  await menu
    .getByRole("button", { name: "Duplicate Basic HTML Example" })
    .click();
  await expect(
    menu.getByRole("button", { name: "Basic HTML Example Copy", exact: true }),
  ).toBeVisible();

  await menu
    .getByRole("button", { name: "Rename Basic HTML Example Copy" })
    .click();
  await page
    .getByLabel("New title for Basic HTML Example Copy")
    .fill("Renamed Copy");
  await page.keyboard.press("Enter");
  await expect(
    menu.getByRole("button", { name: "Renamed Copy", exact: true }),
  ).toBeVisible();

  await menu.getByRole("button", { name: "Delete Renamed Copy" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Renamed Copy", exact: true }),
  ).toHaveCount(0);
});

test("Ctrl/Cmd+S saves immediately, without waiting for the autosave debounce", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Title").fill("Immediate Save Project");
  await page.getByRole("button", { name: "Create" }).click();

  await pressSaveShortcut(page);
  await expect(page.getByRole("status")).toHaveText(/Saved/, {
    timeout: 400,
  });
});
