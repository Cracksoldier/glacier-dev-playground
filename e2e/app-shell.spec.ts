import { expect, test } from "@playwright/test";

/** Milliseconds of the leading `<number>(s|ms)` in a CSS transition value. */
function durationMs(value: string): number {
  const match = /^(\d*\.?\d+)(ms|s)\b/.exec(value);
  if (!match) throw new Error(`Unparseable transition value: "${value}"`);
  const amount = Number(match[1]);
  return match[2] === "s" ? amount * 1000 : amount;
}

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
  const firstPanel = page.locator("#html-editor");

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

test("stops shrinking a panel at its 10% minimum size", async ({ page }) => {
  await page.goto("/");
  const firstSeparator = page.getByRole("separator").first();
  // The editor columns only — the enclosing editors/preview panels are split
  // along the other axis.
  const panels = page.locator("#html-editor, #css-editor, #js-editor");

  const handleBox = await firstSeparator.boundingBox();
  if (!handleBox) {
    throw new Error("Expected the separator to have a bounding box");
  }

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(0, handleBox.y + handleBox.height / 2, { steps: 20 });
  await page.mouse.up();

  const widths = await panels.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().width),
  );
  const total = widths.reduce((sum, width) => sum + width, 0);
  // Allow a small tolerance for separator width and sub-pixel rounding.
  expect(widths[0] / total).toBeGreaterThan(0.09);
  await expect(firstSeparator).toHaveAttribute("aria-valuenow", /^10(\.0+)?$/);
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

  // Parsed rather than compared as strings: the build minifies "120ms" to
  // ".12s", and the reduced-motion value serializes as "0s", not "0ms" — a
  // string inequality check against "0ms" would let leaked zero durations pass.
  expect(durationMs(transitionTokens.fast)).toBeGreaterThan(0);
  expect(durationMs(transitionTokens.base)).toBeGreaterThan(0);
});
