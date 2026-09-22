import { expect, type Page, test } from "@playwright/test";

const MOD = process.platform === "darwin" ? "Meta" : "Control";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
});

function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Preview"]').first();
}

/** The accessible name of whatever currently has focus. */
async function focusedLabel(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!active) return null;
    return (
      active.getAttribute("aria-label") ??
      active.getAttribute("title") ??
      active.tagName
    );
  });
}

test("the primary workflow runs from the keyboard alone", async ({ page }) => {
  await page.keyboard.press("Alt+1");
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toBeFocused();

  await page.keyboard.press(`${MOD}+a`);
  await page.evaluate(() =>
    navigator.clipboard.writeText('<h1 id="keyboard">Typed by keyboard</h1>'),
  );
  await page.keyboard.press(`${MOD}+v`);

  // Turn auto-run off so the preview can only update via the Run shortcut.
  const autoRunButton = page.getByRole("button", { name: "Auto-run" });
  await autoRunButton.click();
  await expect(autoRunButton).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Alt+1");
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(previewFrame(page).locator("#keyboard")).toHaveText(
    "Typed by keyboard",
  );

  await page.keyboard.press(`${MOD}+s`);
  await expect(page.getByRole("status")).toHaveText(/Saved/);
});

test("Alt+1 to Alt+4 move focus between the workspace panels", async ({
  page,
}) => {
  // Alt+4 focuses the visible preview iframe, which only exists once the
  // first build has been promoted.
  await expect(page.locator('iframe[title="Preview"]')).toBeVisible();

  await page.keyboard.press("Alt+1");
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toBeFocused();

  await page.keyboard.press("Alt+2");
  await expect(
    page.getByRole("textbox", { name: "Stylesheet source" }),
  ).toBeFocused();

  await page.keyboard.press("Alt+3");
  await expect(
    page.getByRole("textbox", { name: "Script source" }),
  ).toBeFocused();

  await page.keyboard.press("Alt+4");
  expect(await focusedLabel(page)).toBe("Preview");
});

test("the toolbar is reachable by tabbing and opens the shortcut dialog", async ({
  page,
}) => {
  const helpButton = page.getByRole("button", { name: "Keyboard shortcuts" });
  const isHelpButtonFocused = () =>
    helpButton.evaluate((element) => element === document.activeElement);

  // Focus starts on the document body, so this walks the real tab order.
  for (let step = 0; step < 30 && !(await isHelpButtonFocused()); step += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(helpButton).toBeFocused();

  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Run the preview")).toBeVisible();

  // Focus moves into the dialog rather than being left behind on the toolbar.
  await expect(dialog).toContainText("Keyboard shortcuts");
  const focusIsInDialog = await dialog.evaluate((element) =>
    element.contains(document.activeElement),
  );
  expect(focusIsInDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(helpButton).toBeFocused();
});

test("panel separators resize with the arrow keys", async ({ page }) => {
  const separator = page.getByRole("separator").first();
  await separator.focus();
  const htmlPanel = page.locator('[data-tab-panel="html"]');
  const before = await htmlPanel.boundingBox();
  if (before === null) throw new Error("expected the panel to have a box");

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");

  const after = await htmlPanel.boundingBox();
  if (after === null) throw new Error("expected the panel to have a box");
  expect(after.width).toBeGreaterThan(before.width);
});

test.describe("at 200% zoom", () => {
  // Real browser zoom shrinks the effective CSS-pixel viewport rather than
  // scaling a fixed canvas, so 200% of a 1280x800 window is 640x400.
  test.use({ viewport: { width: 640, height: 400 } });

  test("the primary workflow still works and nothing is clipped", async ({
    page,
  }) => {
    const editor = page.getByRole("textbox", { name: "HTML source" });
    await editor.click({ position: { x: 4, y: 4 } });
    await page.keyboard.press(`${MOD}+a`);
    await page.evaluate(() =>
      navigator.clipboard.writeText('<h1 id="zoomed">Zoomed</h1>'),
    );
    await page.keyboard.press(`${MOD}+v`);

    // 640px is below the tab breakpoint, so the preview lives behind a tab.
    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(previewFrame(page).locator("#zoomed")).toHaveText("Zoomed");

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await expect(
      page.getByRole("button", { name: "Keyboard shortcuts" }),
    ).toBeVisible();
  });
});
