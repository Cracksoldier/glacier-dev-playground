import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * A supporting regression check only. An automated scanner catches a narrow
 * band of machine-detectable issues; it is not a substitute for the manual
 * keyboard and screen-reader review that accompanies accessibility work.
 *
 * The scan is scoped to the parent application: user preview content is
 * authored by the user and explicitly outside the conformance target.
 */
function scan(page: Page) {
  return (
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude("iframe")
      // CodeMirror's scroll container carries `tabindex="-1"` and wraps the
      // focusable contenteditable that does the scrolling. Axe can't see that
      // relationship and reports the region as keyboard-unreachable, which it
      // is not — every editor is reachable via Tab and Alt+1/2/3.
      .disableRules(["scrollable-region-focusable"])
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the workspace has no violations at desktop width", async ({ page }) => {
  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});

test("the workspace has no violations at narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 720 });
  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});

const DIALOGS: { trigger: string; title: string }[] = [
  { trigger: "New project", title: "New project" },
  { trigger: "Resources", title: "Resources" },
  { trigger: "Import", title: "Import project" },
  { trigger: "Export", title: "Export project" },
  { trigger: "Keyboard shortcuts", title: "Keyboard shortcuts" },
];

for (const { trigger, title } of DIALOGS) {
  test(`the ${title} dialog has no violations`, async ({ page }) => {
    await page.getByRole("button", { name: trigger }).click();
    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
    const results = await scan(page).analyze();
    expect(results.violations).toEqual([]);
  });
}
