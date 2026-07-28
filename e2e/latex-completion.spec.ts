import { expect, test, type Page } from "@playwright/test";
import { editorText, openQuietCraft, vimInsertAtEnd } from "./helpers";

async function openSheet(page: Page, room?: string) {
  return openQuietCraft(page, { room });
}

test.describe("LaTeX tab completion", () => {
  test("\\frac + Tab inserts {}{}", async ({ page }) => {
    await openSheet(page);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\frac");
    await page.keyboard.press("Tab");

    await expect.poll(async () => editorText(page)).toContain("\\frac{}{}");
  });

  test("\\sqrt + Tab inserts {}", async ({ page }) => {
    await openSheet(page);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\sqrt");
    await page.keyboard.press("Tab");

    await expect.poll(async () => editorText(page)).toContain("\\sqrt{}");
  });

  test("\\fr suggests frac and Tab expands braces", async ({ page }) => {
    await openSheet(page);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\fr");
    await expect(page.locator(".cm-tooltip-autocomplete")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator(".cm-tooltip-autocomplete")).toContainText("\\frac");

    await page.keyboard.press("Tab");
    await expect.poll(async () => editorText(page)).toContain("\\frac{}{}");
  });

  test("Enter jumps through \\frac{}{} brace fields", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Mobile emulation routes Enter inconsistently in headless tests",
    );

    await openSheet(page);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\frac");
    await page.keyboard.press("Tab");
    await page.keyboard.type("1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("2");

    await expect.poll(async () => editorText(page)).toContain("\\frac{1}{2}");
  });
});
