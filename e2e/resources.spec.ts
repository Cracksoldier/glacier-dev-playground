import { expect, type Locator, type Page, test } from "@playwright/test";

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

interface ResourceFormInput {
  name: string;
  url: string;
  type: "Stylesheet" | "Font stylesheet" | "Script (classic)" | "Module";
}

async function openResourcesDialog(page: Page) {
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  return page.getByRole("dialog", { name: "Resources" });
}

/** Adds one resource via the form in an already-open Resources dialog. */
async function addResource(dialog: Locator, input: ResourceFormInput) {
  await dialog.getByRole("button", { name: "Add resource" }).click();
  await dialog.getByLabel("Name").fill(input.name);
  await dialog.getByLabel("URL").fill(input.url);
  await dialog.getByLabel("Type", { exact: true }).selectOption(input.type);
  await dialog.getByRole("button", { name: "Add resource" }).click();
}

async function closeResourcesDialog(page: Page) {
  // Escape only closes the dialog if focus sits inside it (its keydown
  // handler lives on the dialog panel, so the event must bubble from a
  // descendant) — explicitly focus a stable dialog element first.
  const dialog = page.getByRole("dialog", { name: "Resources" });
  await dialog.getByRole("button", { name: "Add resource" }).first().focus();
  await page.keyboard.press("Escape");
}

test("loads an enabled external stylesheet before the user's own stylesheet, so user CSS can override it", async ({
  page,
}) => {
  await page.route("https://cdn.example.com/lib.css", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "#out { color: rgb(255, 0, 0); }",
    }),
  );

  await createProject(page, "Empty Project", "Stylesheet Override");
  await setEditorContent(page, "HTML source", '<p id="out">Hello</p>');
  await setEditorContent(
    page,
    "Stylesheet source",
    "#out { color: rgb(0, 0, 255); }",
  );

  const dialog = await openResourcesDialog(page);
  await addResource(dialog, {
    name: "Lib CSS",
    url: "https://cdn.example.com/lib.css",
    type: "Stylesheet",
  });
  await closeResourcesDialog(page);

  await expect(previewFrame(page).getByText("Hello")).toHaveCSS(
    "color",
    "rgb(0, 0, 255)",
  );
});

test("loads classic script resources sequentially, in their configured order, before user code runs", async ({
  page,
}) => {
  await page.route("https://cdn.example.com/a.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "window.__order = (window.__order || []).concat('a');",
    }),
  );
  await page.route("https://cdn.example.com/b.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "window.__order = (window.__order || []).concat('b');",
    }),
  );

  await createProject(page, "Empty Project", "Classic Script Order");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = (window.__order || []).join(",");',
  );

  const dialog = await openResourcesDialog(page);
  await addResource(dialog, {
    name: "Script A",
    url: "https://cdn.example.com/a.js",
    type: "Script (classic)",
  });
  await addResource(dialog, {
    name: "Script B",
    url: "https://cdn.example.com/b.js",
    type: "Script (classic)",
  });
  await closeResourcesDialog(page);

  await expect(previewFrame(page).getByText("a,b")).toBeVisible();
});

test("loads module resources after all classic script resources have finished, then runs user code", async ({
  page,
}) => {
  await page.route("https://cdn.example.com/classic.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "window.__order = (window.__order || []).concat('classic');",
    }),
  );
  await page.route("https://cdn.example.com/mod.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "window.__order = (window.__order || []).concat('module'); export {};",
    }),
  );

  await createProject(page, "Empty Project", "Module After Classic");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = (window.__order || []).join(",");',
  );

  const dialog = await openResourcesDialog(page);
  await addResource(dialog, {
    name: "Classic",
    url: "https://cdn.example.com/classic.js",
    type: "Script (classic)",
  });
  await addResource(dialog, {
    name: "Module",
    url: "https://cdn.example.com/mod.js",
    type: "Module",
  });
  await closeResourcesDialog(page);

  await expect(previewFrame(page).getByText("classic,module")).toBeVisible();
});

test("user code waits for a slow script resource to finish before it runs", async ({
  page,
}) => {
  await page.route("https://cdn.example.com/slow.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "window.__slowLoaded = true;",
    });
  });

  await createProject(page, "Empty Project", "Waits For Slow Resource");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = window.__slowLoaded ? "ready" : "not ready";',
  );

  const dialog = await openResourcesDialog(page);
  await addResource(dialog, {
    name: "Slow script",
    url: "https://cdn.example.com/slow.js",
    type: "Script (classic)",
  });
  await closeResourcesDialog(page);

  await expect(previewFrame(page).getByText("ready")).toBeVisible();
});

test("a failing script resource blocks user-code execution, reports a console error, and leaves the previous successful preview visible", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Failing Script Resource");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = "first run";',
  );
  await expect(previewFrame(page).getByText("first run")).toBeVisible();

  await page.route("https://cdn.example.com/broken.js", (route) =>
    route.fulfill({ status: 404, body: "not found" }),
  );

  const dialog = await openResourcesDialog(page);
  await addResource(dialog, {
    name: "Broken script",
    url: "https://cdn.example.com/broken.js",
    type: "Script (classic)",
  });
  await closeResourcesDialog(page);

  await expect(
    consolePanel(page).getByText("Failed to load resource."),
  ).toBeVisible();

  // The candidate that depended on the broken resource is rejected; the
  // last successful preview stays visible, unchanged.
  await expect(previewFrame(page).getByText("first run")).toBeVisible();
});
