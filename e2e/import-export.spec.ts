import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { unzipSync } from "fflate";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
});

function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Preview"]').first();
}

function activeProjectTitle(page: Page) {
  return page.getByRole("banner").getByRole("paragraph").last();
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

async function openExportDialog(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  return page.getByRole("dialog", { name: "Export project" });
}

async function openImportDialog(page: Page) {
  await page.getByRole("button", { name: "Import", exact: true }).click();
  return page.getByRole("dialog", { name: "Import project" });
}

test("exports a project as JSON and re-imports it as a new project, preserving its content", async ({
  page,
}) => {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Title").fill("Round Trip Source");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(activeProjectTitle(page)).toHaveText("Round Trip Source");

  await setEditorContent(page, "HTML source", '<p id="out">Round trip</p>');
  await expect(previewFrame(page).getByText("Round trip")).toBeVisible();

  const exportDialog = await openExportDialog(page);
  const downloadPromise = page.waitForEvent("download");
  await exportDialog.getByRole("button", { name: "Download JSON" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("expected a download path");
  const json = readFileSync(path, "utf-8");
  await exportDialog.getByRole("button", { name: "Close" }).click();

  const importDialog = await openImportDialog(page);
  await importDialog.getByLabel("Or paste project JSON").fill(json);
  await importDialog.getByRole("button", { name: "Continue" }).click();
  // "Add as a new project" is the default mode; no need to select it.
  await importDialog
    .getByRole("button", { name: "Import", exact: true })
    .click();

  await expect(activeProjectTitle(page)).toHaveText("Round Trip Source");
  await expect(previewFrame(page).getByText("Round trip")).toBeVisible();
});

test("an invalid JSON import leaves the active project untouched", async ({
  page,
}) => {
  await expect(activeProjectTitle(page)).toHaveText("Basic HTML Example");

  const importDialog = await openImportDialog(page);
  await importDialog.getByLabel("Or paste project JSON").fill("{not json");
  await importDialog.getByRole("button", { name: "Continue" }).click();

  await expect(importDialog.getByRole("alert")).toHaveText(
    "The file is not valid JSON.",
  );
  // No Import button ever appears for invalid input; the dialog stays on
  // its input step with no store action ever dispatched.
  await expect(
    importDialog.getByRole("button", { name: "Import", exact: true }),
  ).toHaveCount(0);

  await importDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(activeProjectTitle(page)).toHaveText("Basic HTML Example");
});

test("a downloaded standalone HTML export runs correctly when opened directly, with no parent-app bridge code", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Title").fill("Standalone Export");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(activeProjectTitle(page)).toHaveText("Standalone Export");

  await setEditorContent(page, "HTML source", '<p id="out">loading</p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = "standalone ran";',
  );
  await expect(previewFrame(page).getByText("standalone ran")).toBeVisible();

  const exportDialog = await openExportDialog(page);
  const downloadPromise = page.waitForEvent("download");
  await exportDialog.getByRole("button", { name: "Download HTML" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("expected a download path");
  const html = readFileSync(path, "utf-8");

  expect(html).not.toContain("postMessage");
  expect(html).not.toContain("data-glacier-user-script");

  const standalonePage = await context.newPage();
  await standalonePage.goto(`file://${path}`);
  await expect(standalonePage.getByText("standalone ran")).toBeVisible();
  await standalonePage.close();
});

test("a downloaded ZIP export contains the expected root files and its index.html runs directly", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Title").fill("Zip Export");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(activeProjectTitle(page)).toHaveText("Zip Export");

  await setEditorContent(page, "HTML source", '<p id="out">loading</p>');
  await setEditorContent(
    page,
    "Script source",
    'document.getElementById("out").textContent = "zip ran";',
  );
  await expect(previewFrame(page).getByText("zip ran")).toBeVisible();

  const exportDialog = await openExportDialog(page);
  const downloadPromise = page.waitForEvent("download");
  await exportDialog.getByRole("button", { name: "Download ZIP" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("expected a download path");
  const zipBytes = readFileSync(path);

  const entries = unzipSync(new Uint8Array(zipBytes));
  expect(Object.keys(entries).sort()).toEqual(
    ["index.html", "script.js", "style.css"].sort(),
  );

  const indexHtml = new TextDecoder().decode(entries["index.html"]);
  expect(indexHtml).not.toContain("postMessage");

  const dir = path.replace(/\/[^/]+$/, "");
  const { writeFileSync } = await import("node:fs");
  const indexPath = `${dir}/index.html`;
  writeFileSync(indexPath, indexHtml);
  writeFileSync(`${dir}/script.js`, entries["script.js"]);
  writeFileSync(`${dir}/style.css`, entries["style.css"]);

  const zipPage = await context.newPage();
  await zipPage.goto(`file://${indexPath}`);
  await expect(zipPage.getByText("zip ran")).toBeVisible();
  await zipPage.close();
});

test("copies the standalone HTML export to the clipboard", async ({ page }) => {
  await setEditorContent(page, "HTML source", '<p id="out">clipboard</p>');
  await expect(previewFrame(page).getByText("clipboard")).toBeVisible();

  const exportDialog = await openExportDialog(page);
  await exportDialog.getByRole("button", { name: "Copy HTML" }).click();
  await expect(exportDialog.getByText("Copied")).toBeVisible();

  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardText).toContain("clipboard");
  expect(clipboardText).not.toContain("postMessage");
});

test("importing a project with an enabled script resource blocks auto-run until Trust and run is clicked", async ({
  page,
}) => {
  await page.route("https://cdn.example.com/trust-test.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: 'document.getElementById("out").textContent = "trusted script ran";',
    }),
  );

  const untrustedProjectJson = JSON.stringify({
    schemaVersion: 1,
    title: "Untrusted Import",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    source: {
      html: '<p id="out">not yet run</p>',
      stylesheet: "",
      stylesheetLanguage: "css",
      script: "",
      scriptLanguage: "javascript",
      executionMode: "classic",
      headContent: "",
    },
    resources: [
      {
        id: "res-1",
        name: "Trust test script",
        url: "https://cdn.example.com/trust-test.js",
        type: "script",
        enabled: true,
        order: 0,
      },
    ],
    settings: { autoRun: true, previewDebounceMs: 400, preserveConsole: false },
  });

  const importDialog = await openImportDialog(page);
  await importDialog
    .getByLabel("Or paste project JSON")
    .fill(untrustedProjectJson);
  await importDialog.getByRole("button", { name: "Continue" }).click();
  // "Add as a new project" is the default mode; no need to select it.
  await importDialog
    .getByRole("button", { name: "Import", exact: true })
    .click();

  const previewPanel = page.getByRole("region", { name: "Preview" });

  await expect(activeProjectTitle(page)).toHaveText("Untrusted Import");
  await expect(previewPanel.getByRole("status")).toHaveText(
    /hasn't been trusted yet/,
  );
  await expect(previewFrame(page).getByText("trusted script ran")).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Trust and run" }).click();

  await expect(
    previewFrame(page).getByText("trusted script ran"),
  ).toBeVisible();
  await expect(previewPanel.getByRole("status")).toHaveCount(0);
});
