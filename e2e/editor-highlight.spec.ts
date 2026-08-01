import { expect, test, type Page } from "@playwright/test";
import { joinStudioRoom, vimInsertAtEnd } from "./helpers";

/**
 * Editor LaTeX syntax highlighting — ported from upstream and adapted to the
 * Studio shell. Studio defaults to "split" view (inline math widgets off), so
 * raw TeX command text stays visible and carries the highlight classes.
 */
async function openSheet(page: Page, room?: string) {
  return joinStudioRoom(page, { room });
}

test.describe("Editor LaTeX highlighting", () => {
  test("\\frac command gets highlight class", async ({ page }) => {
    await openSheet(page);
    await vimInsertAtEnd(page);
    await page.keyboard.type("\\frac{1}{2}");

    await expect(page.locator(".cm-latexCommand").first()).toBeVisible();
    await expect(page.locator(".cm-latexBracket").first()).toBeVisible();
  });

  test("% comment gets highlight class", async ({ page }) => {
    await openSheet(page);
    await vimInsertAtEnd(page);
    await page.keyboard.type("% note");

    await expect(page.locator(".cm-latexComment").first()).toBeVisible();
  });

  test("\\begin environment gets structure highlighting", async ({ page }) => {
    await openSheet(page);
    await vimInsertAtEnd(page);
    await page.keyboard.type("\\begin{equation}");

    await expect(
      page.locator(".cm-latexEnvironment").first(),
    ).toBeVisible();
    await expect(page.locator(".cm-latexEnvName").first()).toBeVisible();
  });

  test("relative line numbers show distance from cursor", async ({
    page,
  }) => {
    await openSheet(page);
    // The starter note has multiple lines; ensure we're in normal mode at top.
    const content = page.locator(".cm-content");
    await content.click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("g");
    await page.keyboard.press("g");

    // The active line gutter should show the absolute number (1).
    await expect(
      page.locator(".cm-lineNumbers .cm-activeLineGutter").first(),
    ).toContainText("1");
  });
});
