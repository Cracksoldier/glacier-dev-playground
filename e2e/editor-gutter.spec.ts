import { expect, test } from "@playwright/test";

const ACCENT_CYAN = "rgb(79, 216, 242)";

test("the line-number gutter is set apart from the code", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("region", { name: "Stylesheet" });
  await expect(editor.locator(".cm-gutters")).toBeVisible();

  const layout = await editor.evaluate((root) => {
    const gutters = root.querySelector(".cm-gutters");
    const line = root.querySelector(".cm-line");
    if (!gutters || !line) throw new Error("Expected a gutter and a line");
    // Where the first character of code actually starts, past the padding.
    const range = document.createRange();
    range.selectNodeContents(line);
    return {
      gutterRight: gutters.getBoundingClientRect().right,
      textLeft: range.getBoundingClientRect().left,
      dividerWidth: getComputedStyle(gutters).borderRightWidth,
    };
  });
  expect(layout.textLeft - layout.gutterRight).toBeGreaterThanOrEqual(10);
  expect(layout.dividerWidth).toBe("1px");
});

test("a focused editor shows focus on the gutter divider, not a clipped ring", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("region", { name: "Stylesheet" });
  await editor.locator(".cm-content").click();
  // Keyboard input makes the content match :focus-visible.
  await page.keyboard.press("ArrowDown");

  await expect(editor.locator(".cm-content")).toHaveCSS("box-shadow", "none");
  await expect(editor.locator(".cm-gutters")).toHaveCSS(
    "border-right-color",
    ACCENT_CYAN,
  );
});

test("with line numbers off, a focused editor still shows a focus cue", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Editor preferences" }).click();
  await page.getByRole("checkbox", { name: "Line numbers" }).uncheck();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  const editor = page.getByRole("region", { name: "Stylesheet" });
  await expect(editor.locator(".cm-gutters")).toHaveCount(0);
  await editor.locator(".cm-content").click();

  await expect(editor.locator(".cm-editor")).toHaveCSS(
    "box-shadow",
    `${ACCENT_CYAN} 2px 0px 0px 0px inset`,
  );
});
