import { expect, test, type Page } from "@playwright/test";

async function clearAppState(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function joinAs(page: Page, name: string, room: string) {
  await clearAppState(page);
  await page.goto(`/?room=${room}`, { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog", { name: /display name/i });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/axion/i).fill(name);
  await dialog.getByRole("button", { name: /join room/i }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
}

async function vimInsertAtEnd(page: Page) {
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+G");
  await page.keyboard.press("o");
}

async function editorText(page: Page) {
  return page.locator(".cm-content").innerText();
}

test.describe("LaTeX tab completion", () => {
  test("\\frac + Tab inserts {}{}", async ({ page }) => {
    const room = `tex-frac-${Date.now().toString(16)}`;
    await joinAs(page, "Tex", room);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\frac");
    await page.keyboard.press("Tab");

    await expect.poll(async () => editorText(page)).toContain("\\frac{}{}");
  });

  test("\\sqrt + Tab inserts {}", async ({ page }) => {
    const room = `tex-sqrt-${Date.now().toString(16)}`;
    await joinAs(page, "Tex", room);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\sqrt");
    await page.keyboard.press("Tab");

    await expect.poll(async () => editorText(page)).toContain("\\sqrt{}");
  });

  test("\\fr suggests frac and Tab expands braces", async ({ page }) => {
    const room = `tex-sug-${Date.now().toString(16)}`;
    await joinAs(page, "Tex", room);
    await vimInsertAtEnd(page);

    await page.keyboard.type("\\fr");
    await expect(page.locator(".cm-tooltip-autocomplete")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator(".cm-tooltip-autocomplete")).toContainText("\\frac");

    await page.keyboard.press("Tab");
    await expect.poll(async () => editorText(page)).toContain("\\frac{}{}");
  });
});
