import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

/**
 * The one spec that runs on Chromium, Firefox and WebKit (see
 * `playwright.config.ts`). Every step here must stay free of Chromium-only
 * test APIs, so this file deliberately does NOT:
 *
 * - call `context.grantPermissions(["clipboard-read", "clipboard-write"])`,
 *   which throws on Firefox and WebKit — the rest of the suite relies on it;
 * - drive the editors by clipboard paste, using `keyboard.insertText` instead;
 * - assert on the preview's `allow="… clipboard-read 'none'"` attribute, which
 *   Firefox ignores entirely (the preview is still clipboard-read-blocked
 *   there, but via its opaque origin rather than the permission policy);
 * - re-open a downloaded file over `file://`, which is the least portable
 *   step available for the least added coverage.
 */

function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Preview"]').first();
}

/**
 * Replaces an editor's contents without the clipboard. `insertText` is safe
 * from the editors' `closeBrackets` extension for the same reason paste is:
 * its input handler ignores inserts longer than two characters.
 */
async function setEditorContent(page: Page, name: string, text: string) {
  const editor = page.getByRole("textbox", { name });
  await editor.click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+a" : "Control+a",
  );
  await page.keyboard.insertText(text);
}

test("the critical journey works end to end", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New project" }).click();
  const newProject = page.getByRole("dialog", { name: "New project" });
  await newProject.getByLabel("Title").fill("Critical journey");
  await newProject.getByRole("button", { name: "Create" }).click();

  await setEditorContent(page, "HTML source", '<h1 id="greeting">Hello</h1>');
  await setEditorContent(
    page,
    "Stylesheet source",
    "#greeting { color: red; }",
  );
  await setEditorContent(page, "Script source", 'console.log("journey ok");');

  // Editors, the worker-backed build pipeline, and the sandboxed iframe.
  const greeting = previewFrame(page).locator("#greeting");
  await expect(greeting).toHaveText("Hello");
  await expect(greeting).toHaveCSS("color", "rgb(255, 0, 0)");

  // The preview-to-parent message bridge.
  await expect(
    page.getByLabel("Console").getByText('"journey ok"'),
  ).toBeVisible();

  // IndexedDB persistence. Asserted behaviorally rather than via the "Saved"
  // status text, because WebKit's first IndexedDB open after a navigation is
  // slow enough to make the transient status a race.
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "HTML source" }),
  ).toContainText("Hello");
  await expect(previewFrame(page).locator("#greeting")).toHaveText("Hello");

  // Export, including a real browser download.
  await page.getByRole("button", { name: "Export" }).click();
  await expect(
    page.getByRole("dialog", { name: "Export project" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (path === null) throw new Error("expected a download path");
  const exported: unknown = JSON.parse(await readFile(path, "utf8"));
  expect(JSON.stringify(exported)).toContain("Critical journey");
});

test("preview code cannot reach the parent document or its storage", async ({
  page,
}) => {
  await page.goto("/");

  await setEditorContent(
    page,
    "Script source",
    `const probe = (fn) => { try { fn(); return "reachable"; } catch { return "blocked"; } };
     console.log(JSON.stringify({
       parent: probe(() => window.parent.document.title),
       storage: probe(() => window.localStorage.length),
     }));`,
  );

  await expect(
    page.getByLabel("Console").getByText(/"parent":"blocked"/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Console").getByText(/"storage":"blocked"/),
  ).toBeVisible();
});
