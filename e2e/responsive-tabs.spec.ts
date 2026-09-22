import { expect, type Page, test } from "@playwright/test";

const NARROW_VIEWPORT = { width: 420, height: 720 };
const WIDE_VIEWPORT = { width: 1280, height: 800 };

/**
 * Types bracket-free text only: the editors' `closeBrackets` extension
 * auto-inserts matching closers, which would corrupt anything typed
 * character-by-character that contains brackets or quotes.
 */
async function replaceEditorContent(page: Page, name: string, text: string) {
  const editor = page.getByRole("textbox", { name });
  // CodeMirror's content element is as wide as its longest line, so at narrow
  // viewports its centre — where a bare click() lands — is off-screen.
  await editor.click({ position: { x: 4, y: 4 } });
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+a" : "Control+a",
  );
  await page.keyboard.type(text);
}

test.describe("narrow layout", () => {
  test.use({ viewport: NARROW_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows a tab bar and only the selected panel", async ({ page }) => {
    const tablist = page.getByRole("tablist", { name: "Workspace panels" });
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole("tab")).toHaveCount(5);

    await expect(page.getByRole("tab", { name: "HTML" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel", { name: "HTML" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "CSS/SCSS" })).toBeHidden();
  });

  test("switches the visible panel when another tab is clicked", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Preview" }).click();

    await expect(page.getByRole("tabpanel", { name: "Preview" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "HTML" })).toBeHidden();
  });

  test("moves between tabs with arrow keys", async ({ page }) => {
    await page.getByRole("tab", { name: "HTML" }).focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.getByRole("tab", { name: "CSS/SCSS" })).toBeFocused();
    await expect(
      page.getByRole("tabpanel", { name: "CSS/SCSS" }),
    ).toBeVisible();
  });

  test("keeps editor content when switching away and back", async ({
    page,
  }) => {
    const marker = "tab-switch-survives";
    await replaceEditorContent(page, "HTML source", marker);
    await expect(page.getByRole("textbox", { name: "HTML source" })).toHaveText(
      marker,
    );

    await page.getByRole("tab", { name: "CSS/SCSS" }).click();
    await expect(page.getByRole("tabpanel", { name: "HTML" })).toBeHidden();
    await page.getByRole("tab", { name: "HTML" }).click();

    await expect(page.getByRole("textbox", { name: "HTML source" })).toHaveText(
      marker,
    );
  });

  test("shows the console as a tab instead of a collapsible panel", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Console" }).click();

    const consolePanel = page.getByRole("tabpanel", { name: "Console" });
    await expect(consolePanel).toBeVisible();
    await expect(
      consolePanel.getByRole("heading", { name: "Console" }),
    ).toBeVisible();
    await expect(
      consolePanel.getByRole("button", { name: /Clear/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Console", expanded: false }),
    ).toHaveCount(0);
  });

  test("hides the resize separators", async ({ page }) => {
    await expect(page.getByRole("separator")).toHaveCount(0);
  });

  test("remembers the active tab across a reload", async ({ page }) => {
    await page.getByRole("tab", { name: "JS/TS" }).click();
    await page.reload();

    await expect(page.getByRole("tab", { name: "JS/TS" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("selects the matching tab for Alt+1..4", async ({ page }) => {
    await page.keyboard.press("Alt+3");
    await expect(page.getByRole("tabpanel", { name: "JS/TS" })).toBeVisible();

    await page.keyboard.press("Alt+4");
    await expect(page.getByRole("tabpanel", { name: "Preview" })).toBeVisible();
  });
});

test.describe("wide layout", () => {
  test.use({ viewport: WIDE_VIEWPORT });

  test("shows all panels at once with no tab bar", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "HTML source" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Stylesheet source" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Script source" }),
    ).toBeVisible();
    await expect(page.getByRole("separator")).toHaveCount(3);
  });
});
