import { expect, type Page, test } from "@playwright/test";

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

function htmlPanel(page: Page) {
  return page.locator('[data-tab-panel="html"]');
}

function previewPanel(page: Page) {
  return page.locator('[data-tab-panel="preview"]');
}

async function width(locator: ReturnType<typeof htmlPanel>) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("expected the element to have a box");
  return box.width;
}

test("expanding the preview shrinks the editor panels without removing them", async ({
  page,
}) => {
  const expandButton = page.getByRole("button", { name: "Expand preview" });
  await expect(expandButton).toHaveAttribute("aria-pressed", "false");

  const editorWidthBefore = await width(htmlPanel(page));
  const previewWidthBefore = await width(previewPanel(page));

  await expandButton.click();
  await expect(expandButton).toHaveAttribute("aria-pressed", "true");

  const editorWidthExpanded = await width(htmlPanel(page));
  const previewWidthExpanded = await width(previewPanel(page));
  expect(editorWidthExpanded).toBeLessThan(editorWidthBefore);
  expect(previewWidthExpanded).toBeGreaterThan(previewWidthBefore);
  // Squeezed, not hidden: the editors stay usable while expanded.
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toBeVisible();

  await expandButton.click();
  await expect(expandButton).toHaveAttribute("aria-pressed", "false");
  expect(await width(htmlPanel(page))).toBeCloseTo(editorWidthBefore, 0);
});

test("full-window preview covers the viewport and Escape restores the layout", async ({
  page,
}) => {
  const fullWindowButton = page.getByRole("button", {
    name: "Full-window preview",
  });
  const editorWidthBefore = await width(htmlPanel(page));

  await fullWindowButton.click();
  await expect(fullWindowButton).toHaveAttribute("aria-pressed", "true");

  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("expected a fixed viewport size");
  const box = await previewPanel(page).boundingBox();
  if (box === null) throw new Error("expected the preview to have a box");
  expect(box.x).toBe(0);
  expect(box.y).toBe(0);
  expect(box.width).toBe(viewport.width);
  expect(box.height).toBe(viewport.height);

  await page.keyboard.press("Escape");
  await expect(fullWindowButton).toHaveAttribute("aria-pressed", "false");
  expect(await width(htmlPanel(page))).toBeCloseTo(editorWidthBefore, 0);
});

test("presentation changes never rebuild the preview", async ({ page }) => {
  // A fresh random value per build: if a presentation change remounted the
  // iframe, the rebuilt document would report a different nonce.
  await setEditorContent(page, "HTML source", '<p id="nonce"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("nonce").textContent = String(Math.random());',
  );

  const nonce = previewFrame(page).locator("#nonce");
  await expect(nonce).not.toBeEmpty();
  const originalNonce = await nonce.textContent();

  await page.getByRole("button", { name: "Expand preview" }).click();
  await expect(previewFrame(page).locator("#nonce")).toHaveText(
    originalNonce ?? "",
  );

  await page.getByRole("button", { name: "Full-window preview" }).click();
  await expect(previewFrame(page).locator("#nonce")).toHaveText(
    originalNonce ?? "",
  );

  await page.keyboard.press("Escape");
  await expect(previewFrame(page).locator("#nonce")).toHaveText(
    originalNonce ?? "",
  );
});

test("no presentation mode ever opens a browser window", async ({
  page,
  context,
}) => {
  expect(context.pages()).toHaveLength(1);

  await page.getByRole("button", { name: "Expand preview" }).click();
  await page.getByRole("button", { name: "Full-window preview" }).click();
  await page.keyboard.press("Escape");

  expect(context.pages()).toHaveLength(1);
});
