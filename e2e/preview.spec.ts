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

test("renders HTML and CSS in the preview", async ({ page }) => {
  const heading = previewFrame(page).getByRole("heading", {
    name: "Hello, Glacier",
  });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("color", "rgb(79, 216, 242)");
});

test("executes JavaScript in the preview", async ({ page }) => {
  await createProject(page, "Empty Project", "JS Interaction");

  await setEditorContent(
    page,
    "HTML source",
    '<button id="counter" type="button">Clicked 0 times</button>',
  );
  await setEditorContent(
    page,
    "Script source",
    [
      "let count = 0;",
      'const button = document.getElementById("counter");',
      'button.addEventListener("click", () => {',
      "  count += 1;",
      '  button.textContent = "Clicked " + count + " times";',
      "});",
    ].join("\n"),
  );

  const counterButton = previewFrame(page).getByRole("button", {
    name: /Clicked \d+ times/,
  });
  await expect(counterButton).toHaveText("Clicked 0 times");
  await counterButton.click();
  await expect(counterButton).toHaveText("Clicked 1 times");
});

test("manual run only updates the preview once Run is clicked", async ({
  page,
}) => {
  const autoRunButton = page.getByRole("button", { name: "Auto-run" });
  await expect(autoRunButton).toHaveAttribute("aria-pressed", "true");
  await autoRunButton.click();
  await expect(autoRunButton).toHaveAttribute("aria-pressed", "false");

  await setEditorContent(page, "HTML source", '<h1 id="updated">Updated</h1>');

  const preview = previewFrame(page);
  await expect(
    preview.getByRole("heading", { name: "Hello, Glacier" }),
  ).toBeVisible();
  await expect(preview.locator("#updated")).toHaveCount(0);

  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(preview.locator("#updated")).toBeVisible();
});

test("a superseded run's timers stop firing", async ({ page }) => {
  await createProject(page, "Empty Project", "Timer Test");

  await setEditorContent(page, "HTML source", '<div id="counter">0</div>');
  await setEditorContent(
    page,
    "Script source",
    [
      "let n = 0;",
      "setInterval(() => {",
      "  n += 1;",
      '  document.getElementById("counter").textContent = String(n);',
      "}, 50);",
    ].join("\n"),
  );

  const preview = previewFrame(page);
  const counter = preview.locator("#counter");
  await expect(counter).not.toHaveText("0", { timeout: 2000 });

  // Force a new run; the previous iframe (and its interval) must be torn down.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(counter).toHaveText("0");

  await page.waitForTimeout(300);
  const value = Number(await counter.textContent());
  // ~6 ticks expected in 300ms at 50ms/tick. A still-running superseded
  // interval would roughly double this value.
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThan(10);
});

test("preview code cannot reach the parent document or browser storage", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Sandbox Probe");

  await setEditorContent(
    page,
    "Script source",
    [
      "function probe(fn) {",
      "  try {",
      "    fn();",
      '    return "accessible";',
      "  } catch {",
      '    return "blocked";',
      "  }",
      "}",
      "const results = {",
      "  parentDocument: probe(() => { void window.parent.document; }),",
      "  localStorage: probe(() => { void window.localStorage; }),",
      '  indexedDb: probe(() => { void indexedDB.open("probe"); }),',
      "};",
      'document.body.innerHTML = "<pre id=\\"results\\">" + JSON.stringify(results) + "</pre>";',
    ].join("\n"),
  );

  const results = previewFrame(page).locator("#results");
  await expect(results).toContainText('"parentDocument":"blocked"');
  await expect(results).toContainText('"localStorage":"blocked"');
  await expect(results).toContainText('"indexedDb":"blocked"');
});

test("forms and modal dialogs are permitted inside the preview", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Modal Test");

  await setEditorContent(
    page,
    "HTML source",
    '<dialog id="d"><p>Modal</p></dialog><button id="open" type="button">Open</button>',
  );
  await setEditorContent(
    page,
    "Script source",
    [
      'document.getElementById("open").addEventListener("click", () => {',
      '  document.getElementById("d").showModal();',
      "});",
    ].join("\n"),
  );

  const preview = previewFrame(page);
  await preview.getByRole("button", { name: "Open" }).click();
  await expect(preview.locator("#d")).toBeVisible();
});

test("clipboard read access is unavailable inside the preview", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Clipboard Test");

  await setEditorContent(
    page,
    "HTML source",
    '<pre id="clipboard-result">pending</pre>',
  );
  await setEditorContent(
    page,
    "Script source",
    [
      "function setResult(text) {",
      '  document.getElementById("clipboard-result").textContent = text;',
      "}",
      "try {",
      "  navigator.clipboard.readText().then(",
      '    () => setResult("allowed"),',
      '    () => setResult("blocked"),',
      "  );",
      "} catch {",
      '  setResult("blocked");',
      "}",
    ].join("\n"),
  );

  await expect(previewFrame(page).locator("#clipboard-result")).toHaveText(
    "blocked",
  );
});
