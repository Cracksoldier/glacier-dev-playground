import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
});

function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Preview"]').first();
}

/**
 * Sets editor content via clipboard paste rather than `keyboard.type`: the
 * editors' `closeBrackets` extension auto-inserts matching closers as you
 * type, which corrupts any code typed character-by-character.
 */
async function setEditorContent(page: Page, name: string, text: string) {
  const editor = page.getByRole("textbox", { name });
  await editor.click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+a" : "Control+a",
  );
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+v" : "Control+v",
  );
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (result === null) throw new Error("expected the element to have a box");
  return result;
}

function panel(page: Page, tab: "html" | "css" | "js" | "preview") {
  return page.locator(`[data-tab-panel="${tab}"]`);
}

function layoutButton(page: Page, name: string) {
  return page
    .getByRole("group", { name: "Workspace layout" })
    .getByRole("button", { name });
}

test("defaults to the editors in a row above a full-width preview", async ({
  page,
}) => {
  await expect(layoutButton(page, "Default layout")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const html = await box(panel(page, "html"));
  const css = await box(panel(page, "css"));
  const js = await box(panel(page, "js"));
  const preview = await box(panel(page, "preview"));

  expect(css.x).toBeGreaterThan(html.x);
  expect(js.x).toBeGreaterThan(css.x);
  expect(css.y).toBeCloseTo(html.y, 0);
  expect(preview.y).toBeGreaterThanOrEqual(html.y + html.height);
  expect(preview.width).toBeGreaterThan(html.width + css.width + js.width - 2);
});

test("side layout puts the preview left of the stacked editors", async ({
  page,
}) => {
  await layoutButton(page, "Side layout").click();
  await expect(layoutButton(page, "Side layout")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const html = await box(panel(page, "html"));
  const css = await box(panel(page, "css"));
  const js = await box(panel(page, "js"));
  const preview = await box(panel(page, "preview"));

  expect(preview.x).toBeLessThan(html.x);
  expect(preview.x + preview.width).toBeLessThanOrEqual(html.x);
  expect(preview.width).toBeGreaterThan(html.width);
  expect(css.y).toBeGreaterThan(html.y);
  expect(js.y).toBeGreaterThan(css.y);
  expect(css.x).toBeCloseTo(html.x, 0);
});

test("dragging the side layout's separator follows the pointer", async ({
  page,
}) => {
  await layoutButton(page, "Side layout").click();
  const separator = page.getByRole("separator", {
    name: "Resize editor and preview regions",
  });
  const handle = await box(separator);
  const previewBefore = await box(panel(page, "preview"));

  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 - 120,
    handle.y + handle.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();

  const previewAfter = await box(panel(page, "preview"));
  // The preview is on the left, so dragging left shrinks it.
  expect(previewAfter.width).toBeLessThan(previewBefore.width - 60);
});

test("preview only hides the editors and fills the workspace", async ({
  page,
}) => {
  const workspaceWidth = (await box(page.locator("[data-workspace-layout]")))
    .width;

  await layoutButton(page, "Preview only").click();

  await expect(page.getByRole("textbox", { name: "HTML source" })).toBeHidden();
  // Hidden separators drop out of the accessibility tree entirely.
  await expect(page.getByRole("separator")).toHaveCount(0);
  const preview = await box(panel(page, "preview"));
  expect(preview.width).toBeCloseTo(workspaceWidth, 0);

  await layoutButton(page, "Default layout").click();
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toBeVisible();
});

test("switching layouts never rebuilds the preview", async ({ page }) => {
  // A fresh random value per build: if a layout change remounted the
  // iframe, the rebuilt document would report a different nonce.
  await setEditorContent(page, "HTML source", '<p id="nonce"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("nonce").textContent = String(Math.random());',
  );
  const nonce = previewFrame(page).locator("#nonce");
  await expect(nonce).not.toBeEmpty();
  const originalNonce = (await nonce.textContent()) ?? "";

  for (const name of [
    "Side layout",
    "Preview only",
    "Default layout",
    "Preview only",
    "Side layout",
  ]) {
    await layoutButton(page, name).click();
    await expect(previewFrame(page).locator("#nonce")).toHaveText(
      originalNonce,
    );
  }
});

test("switching layouts keeps the editors' undo history", async ({ page }) => {
  const editor = page.getByRole("textbox", { name: "Stylesheet source" });
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("/* marker */");
  await expect(editor).toContainText("/* marker */");

  await layoutButton(page, "Side layout").click();
  await layoutButton(page, "Preview only").click();
  await layoutButton(page, "Default layout").click();

  await editor.click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+z" : "Control+z",
  );
  await expect(editor).not.toContainText("/* marker */");
});

test("remembers the chosen layout across reloads", async ({ page }) => {
  await layoutButton(page, "Side layout").click();
  await page.reload();

  await expect(layoutButton(page, "Side layout")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const html = await box(panel(page, "html"));
  const preview = await box(panel(page, "preview"));
  expect(preview.x).toBeLessThan(html.x);
});

test("remembers panel sizes separately per layout", async ({ page }) => {
  const separator = page.getByRole("separator", {
    name: "Resize editor and preview regions",
  });
  await separator.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const defaultValue = await separator.getAttribute("aria-valuenow");

  await layoutButton(page, "Side layout").click();
  // The side layout keeps its own default split — the separator now reports
  // the preview, which comes first there …
  await expect(separator).toHaveAttribute("aria-controls", "preview");
  await expect(separator).toHaveAttribute("aria-valuenow", /^70(\.0+)?$/);

  await layoutButton(page, "Default layout").click();
  // … and the default layout gets back the size the user chose.
  await expect(separator).toHaveAttribute("aria-valuenow", defaultValue ?? "");
});

test("Alt+1 leaves preview only and focuses the HTML editor", async ({
  page,
}) => {
  await layoutButton(page, "Side layout").click();
  await layoutButton(page, "Preview only").click();
  await expect(page.getByRole("textbox", { name: "HTML source" })).toBeHidden();

  await page.keyboard.press("Alt+1");

  await expect(layoutButton(page, "Side layout")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toBeFocused();
});
