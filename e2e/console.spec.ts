import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
});

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

test("captures console.log/info/warn/error/debug calls with correct severity", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Console Levels");

  await setEditorContent(
    page,
    "Script source",
    [
      'console.log("a log message");',
      'console.info("an info message");',
      'console.warn("a warn message");',
      'console.error("an error message");',
      'console.debug("a debug message");',
    ].join("\n"),
  );

  await expect(consolePanel(page).getByText('"a log message"')).toBeVisible();
  await expect(consolePanel(page).getByText('"an info message"')).toBeVisible();
  await expect(consolePanel(page).getByText('"a warn message"')).toBeVisible();
  await expect(
    consolePanel(page).getByText('"an error message"'),
  ).toBeVisible();
  await expect(consolePanel(page).getByText('"a debug message"')).toBeVisible();

  // Severity coloring is applied to the entry row itself (children like
  // logged string values render in a fixed color regardless of severity).
  await expect(
    consolePanel(page).locator("li").filter({ hasText: "a warn message" }),
  ).toHaveCSS("color", "rgb(242, 200, 111)");
  await expect(
    consolePanel(page).locator("li").filter({ hasText: "an error message" }),
  ).toHaveCSS("color", "rgb(242, 112, 138)");
  await expect(
    consolePanel(page).locator("li").filter({ hasText: "a debug message" }),
  ).toHaveCSS("color", "rgb(100, 119, 140)");
});

test("console.clear() clears prior entries", async ({ page }) => {
  await createProject(page, "Empty Project", "Console Clear");

  await setEditorContent(page, "Script source", 'console.log("before clear");');
  await expect(consolePanel(page).getByText('"before clear"')).toBeVisible();

  await setEditorContent(page, "Script source", "console.clear();");
  await expect(consolePanel(page).getByText('"before clear"')).toHaveCount(0);
});

test("Preserve Logs suppresses console.clear() and clearing on a new run", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Preserve Logs");

  await page.getByRole("checkbox", { name: "Preserve logs" }).check();

  await setEditorContent(page, "Script source", 'console.log("first run");');
  await expect(consolePanel(page).getByText('"first run"')).toBeVisible();

  // A new run (re-running via the Run button) would otherwise clear entries;
  // it also logs "first run" again, so preserved logs now hold two entries.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    consolePanel(page).getByText('"first run"').first(),
  ).toBeVisible();
  await expect(consolePanel(page).getByText('"first run"')).toHaveCount(2);

  // An in-band console.clear() call is also suppressed while preserved.
  await setEditorContent(page, "Script source", "console.clear();");
  await expect(
    consolePanel(page).getByText('"first run"').first(),
  ).toBeVisible();
  await expect(consolePanel(page).getByText('"first run"')).toHaveCount(2);
});

test("a thrown runtime error appears as an entry and focuses the JS editor on click", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Runtime Error Focus");

  await setEditorContent(
    page,
    "Script source",
    ["function ok() {}", "", "throw new Error('boom');"].join("\n"),
  );

  const errorEntry = consolePanel(page).getByRole("button", { name: /boom/ });
  await expect(errorEntry).toBeVisible();

  await errorEntry.click();
  await expect(
    page.getByRole("textbox", { name: "Script source" }),
  ).toBeFocused();
});

test("an unhandled promise rejection appears as an entry", async ({ page }) => {
  await createProject(page, "Empty Project", "Unhandled Rejection");

  await setEditorContent(
    page,
    "Script source",
    "Promise.reject(new Error('rejected boom'));",
  );

  // The "Error: rejected boom" text sits alongside a collapsed stack-trace
  // <details>, so scope to the row rather than a leaf text node.
  await expect(
    consolePanel(page).locator("li").filter({ hasText: "rejected boom" }),
  ).toBeVisible();
});

test("starting a new run clears prior entries by default", async ({ page }) => {
  await createProject(page, "Empty Project", "Clear On Run");

  await setEditorContent(page, "Script source", 'console.log("first run");');
  await expect(consolePanel(page).getByText('"first run"')).toBeVisible();

  await setEditorContent(page, "Script source", 'console.log("second run");');
  await expect(consolePanel(page).getByText('"second run"')).toBeVisible();
  await expect(consolePanel(page).getByText('"first run"')).toHaveCount(0);
});

test("a superseded run's console messages never appear", async ({ page }) => {
  await createProject(page, "Empty Project", "Superseded Console");

  await setEditorContent(
    page,
    "Script source",
    [
      "let n = 0;",
      "setInterval(() => {",
      "  n += 1;",
      '  console.log("tick " + n);',
      "}, 50);",
    ].join("\n"),
  );

  await expect(
    consolePanel(page)
      .getByText(/tick \d+/)
      .first(),
  ).toBeVisible({
    timeout: 2000,
  });

  // Force a new run; the previous iframe (and its interval/log calls) must
  // be torn down, and none of its stale messages should ever render.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(consolePanel(page).getByText(/tick \d+/)).toHaveCount(0);

  await page.waitForTimeout(300);
  const tickCount = await consolePanel(page)
    .getByText(/tick \d+/)
    .count();
  expect(tickCount).toBeGreaterThan(0);
});

test("a circular reference doesn't freeze the app and renders a [Circular] marker", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Circular Reference Test");

  await setEditorContent(
    page,
    "Script source",
    [
      "const circular = { name: 'loop' };",
      "circular.self = circular;",
      "console.log(circular);",
    ].join("\n"),
  );

  const expander = consolePanel(page).getByText("Object(2)");
  await expect(expander).toBeVisible();
  await expander.click();
  await expect(consolePanel(page).getByText("[Circular]")).toBeVisible();
});

test("an over-sized array doesn't freeze the app and renders a truncation indicator", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Truncation Test");

  await setEditorContent(
    page,
    "Script source",
    "console.log(Array.from({ length: 150 }, (_, i) => i));",
  );

  const expander = consolePanel(page).getByText("Array(100+)");
  await expect(expander).toBeVisible();
  await expander.click();
  await expect(consolePanel(page).getByText("… truncated")).toBeVisible();
});
