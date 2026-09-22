import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

function previewFrame(page: Page) {
  return page.frameLocator('iframe[title="Preview"]').first();
}

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

/** Records every script URL the page fetches, so we can prove what is deferred. */
function recordScriptRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") urls.push(request.url());
  });
  return urls;
}

const DEFERRED_CHUNKS = [
  { dialog: "Resources", chunk: /ResourceManagerDialog-.*\.js$/ },
  { dialog: "Import", chunk: /ImportDialog-.*\.js$/ },
  { dialog: "Export", chunk: /ExportDialog-.*\.js$/ },
];

for (const { dialog, chunk } of DEFERRED_CHUNKS) {
  test(`the ${dialog} dialog is code-split out of the initial load`, async ({
    page,
  }) => {
    const scripts = recordScriptRequests(page);
    await page.goto("/");
    await expect(page.locator('iframe[title="Preview"]')).toBeVisible();

    expect(scripts.some((url) => chunk.test(url))).toBe(false);

    await page.getByRole("button", { name: dialog }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    expect(scripts.some((url) => chunk.test(url))).toBe(true);
  });
}

test("an edit made while a compile is in flight is not lost", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByLabel("Title").fill("Compile responsiveness");
  await dialog.getByLabel("SCSS Example").check();
  await dialog.getByRole("button", { name: "Create" }).click();

  // A deliberately expensive stylesheet: the point is to start a long compile
  // and immediately edit a different panel without waiting for it to settle.
  await setEditorContent(
    page,
    "Stylesheet source",
    "@for $i from 1 through 400 { .fill-#{$i} { color: rgb($i, 0, 0); } } #late { color: rgb(0, 128, 0); }",
  );
  await setEditorContent(page, "HTML source", '<p id="late">Still typing</p>');

  const late = previewFrame(page).locator("#late");
  await expect(late).toHaveText("Still typing");
  await expect(late).toHaveCSS("color", "rgb(0, 128, 0)");
});
