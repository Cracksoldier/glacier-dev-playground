import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
});

function previewFrame(page: Page) {
  // The candidate/promotion model can briefly have two "Preview"-titled
  // iframes in the DOM (the still-visible one, then a hidden in-flight
  // candidate appended after it). `.first()` always resolves to the
  // currently-visible one, matching the "never lose the last good preview"
  // guarantee.
  return page.frameLocator('iframe[title="Preview"]').first();
}

function consolePanel(page: Page) {
  return page.getByLabel("Console");
}

async function createProject(page: Page, templateLabel: string, title: string) {
  await page.getByRole("button", { name: "New project" }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel(templateLabel).check();
  await dialog.getByRole("button", { name: "Create" }).click();
}

/**
 * Sets editor content via clipboard paste rather than `keyboard.type`: the
 * editors' `closeBrackets` extension auto-inserts matching closers as you
 * type, which corrupts any code typed character-by-character. Paste inserts
 * as a single transaction and bypasses that extension.
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

test("compiles nested SCSS with variables and updates the preview", async ({
  page,
}) => {
  await createProject(page, "SCSS Example", "Valid SCSS");

  const heading = previewFrame(page).getByRole("heading", {
    name: "SCSS Example",
  });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("color", "rgb(155, 140, 242)");
});

test("an invalid SCSS edit reports a console error and a CodeMirror diagnostic, and keeps the last good preview visible as stale", async ({
  page,
}) => {
  await createProject(page, "SCSS Example", "Invalid SCSS");

  const heading = previewFrame(page).getByRole("heading", {
    name: "SCSS Example",
  });
  await expect(heading).toHaveCSS("color", "rgb(155, 140, 242)");

  await setEditorContent(page, "Stylesheet source", ".card { color: ; }");

  await expect(consolePanel(page).getByRole("listitem")).toHaveCount(1);
  // A zero-width Sass error span renders as a point marker
  // (`cm-lintPoint-error`); a non-empty one renders as an underlined range
  // (`cm-lintRange-error`) — either is a valid "diagnostic is showing" signal.
  await expect(
    page.locator(".cm-lintPoint-error, .cm-lintRange-error"),
  ).toBeVisible();

  // The preview keeps showing the last successful build, unchanged.
  await expect(heading).toHaveCSS("color", "rgb(155, 140, 242)");

  await expect(page.getByText(/SCSS compile failed/).first()).toBeVisible();
});

test("the Compiled toggle shows the real, read-only compiled CSS output", async ({
  page,
}) => {
  await createProject(page, "SCSS Example", "Compiled Toggle");

  await page.getByRole("button", { name: "Compiled" }).click();

  const compiledView = page.getByRole("textbox", {
    name: "Compiled CSS output",
  });
  await expect(compiledView).toBeVisible();
  await expect(compiledView).toContainText("color: #9b8cf2");
  await expect(
    page.getByRole("textbox", { name: "Stylesheet source" }),
  ).toHaveCount(0);
});

test("rapid sequential SCSS edits promote only the final edit's compiled output", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Rapid Edits");
  await setEditorContent(page, "HTML source", '<h1 id="title">Rapid</h1>');
  await page
    .getByRole("combobox", { name: "Stylesheet language" })
    .selectOption("scss");

  await setEditorContent(
    page,
    "Stylesheet source",
    "$c: red; #title { color: $c; }",
  );
  await setEditorContent(
    page,
    "Stylesheet source",
    "$c: green; #title { color: $c; }",
  );
  await setEditorContent(
    page,
    "Stylesheet source",
    "$c: blue; #title { color: $c; }",
  );

  const heading = previewFrame(page).getByRole("heading", { name: "Rapid" });
  await expect(heading).toHaveCSS("color", "rgb(0, 0, 255)");
});
