import { expect, test } from "@playwright/test";

test("loads the Glacier application shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "GLACIER" }),
  ).toBeVisible();
  await expect(page.getByText("DEV PLAYGROUND")).toBeVisible();
});

test("shows disabled toolbar actions", async ({ page }) => {
  await page.goto("/");
  const runButton = page.getByRole("button", { name: "Run", exact: true });
  await expect(runButton).toBeVisible();
  await expect(runButton).toHaveAttribute("aria-disabled", "true");
});

test("resizes panels by dragging a separator", async ({ page }) => {
  await page.goto("/");
  const separators = page.getByRole("separator");
  const firstSeparator = separators.first();
  const panels = page.locator("[data-panel]");
  const firstPanel = panels.first();

  const beforeBox = await firstPanel.boundingBox();
  const handleBox = await firstSeparator.boundingBox();
  if (!beforeBox || !handleBox) {
    throw new Error("Expected panel and separator to have a bounding box");
  }

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 80,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.up();

  const afterBox = await firstPanel.boundingBox();
  expect(afterBox?.width).not.toBeCloseTo(beforeBox.width, 0);
});

test("resizes panels with the keyboard", async ({ page }) => {
  await page.goto("/");
  const firstSeparator = page.getByRole("separator").first();
  await firstSeparator.focus();
  const initialValue = await firstSeparator.getAttribute("aria-valuenow");

  await page.keyboard.press("ArrowRight");

  await expect(firstSeparator).not.toHaveAttribute(
    "aria-valuenow",
    initialValue ?? "",
  );
});

test("does not offer a light-theme toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /theme/i })).toHaveCount(0);
});
