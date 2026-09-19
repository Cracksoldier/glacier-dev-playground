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

test("runs valid TypeScript in classic mode", async ({ page }) => {
  await createProject(page, "TypeScript Example", "Valid TypeScript");

  await expect(previewFrame(page).getByText("Hello, Glacier!")).toBeVisible();
});

test("a TypeScript type error blocks execution, reports a console diagnostic and a CodeMirror marker, and keeps the last good preview visible as stale", async ({
  page,
}) => {
  await createProject(page, "TypeScript Example", "Type Error");

  await expect(previewFrame(page).getByText("Hello, Glacier!")).toBeVisible();

  await setEditorContent(
    page,
    "Script source",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: authored TS source text, not a real template literal in this file.
    'interface Greeting {\n  name: string;\n}\n\nfunction formatGreeting({ name }: Greeting): string {\n  return `Hello, ${name}!`;\n}\n\nconst greeting = document.getElementById("greeting");\nif (greeting) {\n  greeting.textContent = formatGreeting({ name: 42 });\n}',
  );

  await expect(
    consolePanel(page).getByText(/is not assignable to type/),
  ).toBeVisible();
  await expect(
    page.locator(".cm-lintPoint-error, .cm-lintRange-error"),
  ).toBeVisible();

  // The preview keeps showing the last successful build, unchanged.
  await expect(previewFrame(page).getByText("Hello, Glacier!")).toBeVisible();

  await expect(
    page.getByText(/TypeScript compile failed/).first(),
  ).toBeVisible();
});

test("runs plain JavaScript in classic mode", async ({ page }) => {
  await createProject(page, "Empty Project", "Classic JS");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = "classic ran";',
  );

  await expect(previewFrame(page).getByText("classic ran")).toBeVisible();
});

test("runs JavaScript in module execution mode", async ({ page }) => {
  await createProject(page, "Empty Project", "Module JS");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await page
    .getByRole("combobox", { name: "Execution mode" })
    .selectOption("module");
  await setEditorContent(
    page,
    "Script source",
    'export const message = "module ran";\ndocument.getElementById("out").textContent = message;',
  );

  await expect(previewFrame(page).getByText("module ran")).toBeVisible();
});

test("runs TypeScript in module execution mode", async ({ page }) => {
  await createProject(page, "Empty Project", "Module TS");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await page
    .getByRole("combobox", { name: "Script language" })
    .selectOption("typescript");
  await page
    .getByRole("combobox", { name: "Execution mode" })
    .selectOption("module");
  await setEditorContent(
    page,
    "Script source",
    'export const message: string = "typed module ran";\nconst out = document.getElementById("out");\nif (out) out.textContent = message;',
  );

  await expect(previewFrame(page).getByText("typed module ran")).toBeVisible();
});

test("classic-mode import syntax is rejected with a blocking diagnostic and does not execute", async ({
  page,
}) => {
  await createProject(page, "Empty Project", "Classic Import Rejected");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await setEditorContent(
    page,
    "Script source",
    'import { unused } from "https://example.com/module.js";\ndocument.getElementById("out").textContent = "ran";',
  );

  await expect(
    consolePanel(page).getByText(
      /statements are not allowed in classic script mode/,
    ),
  ).toBeVisible();
  await expect(
    page.locator(".cm-lintPoint-error, .cm-lintRange-error"),
  ).toBeVisible();
  await expect(previewFrame(page).getByText("ran")).not.toBeVisible();
});

test("an absolute HTTPS import resolves and executes, reporting a non-blocking console warning", async ({
  page,
}) => {
  await page.route("https://cdn.example.com/greet.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      // biome-ignore lint/suspicious/noTemplateCurlyInString: mocked response body's JS source text, not a real template literal in this file.
      body: "export function greet(name) {\n  return `Hi, ${name}!`;\n}",
    }),
  );

  await createProject(page, "Empty Project", "Remote Import");
  await setEditorContent(page, "HTML source", '<p id="out"></p>');
  await page
    .getByRole("combobox", { name: "Execution mode" })
    .selectOption("module");
  await setEditorContent(
    page,
    "Script source",
    'import { greet } from "https://cdn.example.com/greet.js";\ndocument.getElementById("out").textContent = greet("Glacier");',
  );

  await expect(previewFrame(page).getByText("Hi, Glacier!")).toBeVisible();
  await expect(
    consolePanel(page).getByText(/are unavailable — treated as `any`/),
  ).toBeVisible();
});
