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
  const settingsButton = page.getByRole("button", {
    name: "Settings",
    exact: true,
  });
  await expect(settingsButton).toBeVisible();
  await expect(settingsButton).toHaveAttribute("aria-disabled", "true");
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

test("honors prefers-reduced-motion by zeroing transition durations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const transitionTokens = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    return {
      fast: rootStyle.getPropertyValue("--glacier-transition-fast").trim(),
      base: rootStyle.getPropertyValue("--glacier-transition-base").trim(),
    };
  });

  expect(transitionTokens.fast).toBe("0s");
  expect(transitionTokens.base).toBe("0s");
});

test("uses non-zero transition durations without prefers-reduced-motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const transitionTokens = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    return {
      fast: rootStyle.getPropertyValue("--glacier-transition-fast").trim(),
      base: rootStyle.getPropertyValue("--glacier-transition-base").trim(),
    };
  });

  expect(transitionTokens.fast).not.toBe("0ms");
  expect(transitionTokens.base).not.toBe("0ms");
});
