import { expect, test, type Page } from "@playwright/test";
import { openForge, vimInsertAtEnd } from "./helpers";

test.describe("Forge math tools", () => {
  async function typeInEditor(page: Page, text: string) {
    await vimInsertAtEnd(page);
    await page.keyboard.type(text);
    await page.keyboard.press("Escape");
  }

  test("snippet picker inserts a fraction template", async ({ page }) => {
    await openForge(page);

    await page.getByRole("button", { name: /insert math snippet/i }).click();
    const pop = page.getByRole("listbox", { name: /math snippets/i });
    await expect(pop).toBeVisible();

    await pop.getByRole("option", { name: /fraction/i }).click();
    await expect(page.locator(".cm-content")).toContainText("\\frac{}{}");
    await expect(pop).toHaveCount(0);
  });

  test("snippet picker filters by keyword", async ({ page }) => {
    await openForge(page);

    await page.getByRole("button", { name: /insert math snippet/i }).click();
    const pop = page.getByRole("listbox", { name: /math snippets/i });
    await pop.getByPlaceholder(/search snippets/i).fill("integral");
    await expect(
      pop.getByRole("option", { name: /integral/i }),
    ).toBeVisible();
    await expect(pop.getByRole("option")).toHaveCount(1);
  });

  test("problem panel reports LaTeX parse errors with line/column", async ({
    page,
  }) => {
    await openForge(page);

    await typeInEditor(page, "\\frac{");

    await page.getByRole("button", { name: /^problem$/i }).click();
    const panel = page.getByRole("complementary", { name: /problem reference/i });
    const alert = panel.getByRole("alert");
    await expect(alert).toContainText(/math error/i);
    await expect(alert).toContainText(/L2:1/);
    await expect(alert).toContainText(/frac/i);
  });

  test("preview reveals a copy button on equation hover", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hover-copy is a desktop-only affordance");
    await openForge(page);

    await typeInEditor(page, "x^2");

    await page.getByRole("button", { name: /^preview$/i }).click();
    const panel = page.getByRole("complementary", { name: /rendered preview/i });
    const equation = panel.locator(".vt-tex-src").first();
    await expect(equation.locator(".katex")).toBeVisible({ timeout: 10_000 });

    await equation.locator(".katex").first().hover({ force: true });
    const copyBtn = page.locator(".vt-copy-equation");
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toHaveText("TeX");
    await expect(
      page.getByRole("button", { name: /copy equation as svg/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /copy equation as png/i }),
    ).toBeVisible();
  });

  test("preview TeX button copies equation source", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Copy affordance is a desktop-only feature");
    await openForge(page);

    await typeInEditor(page, "x^2");

    await page.getByRole("button", { name: /^preview$/i }).click();
    const panel = page.getByRole("complementary", { name: /rendered preview/i });
    const equation = panel.locator(".vt-tex-src").first();
    await expect(equation.locator(".katex")).toBeVisible({ timeout: 10_000 });

    await equation.locator(".katex").first().hover({ force: true });
    const texBtn = page.getByRole("button", { name: /copy equation as tex/i });
    await expect(texBtn).toBeVisible();
    await texBtn.click({ force: true });
    await expect(texBtn).toHaveText("Copied");

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe("x^2");
  });
});
