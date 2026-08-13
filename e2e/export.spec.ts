import { expect, test } from "@playwright/test";
import { joinStudioRoom } from "./helpers";

test.describe("M4 PDF export (#32)", () => {
  test("Studio menu Export as PDF opens the print dialog", async ({ page }) => {
    await joinStudioRoom(page);

    await page.evaluate(() => {
      window.print = () => {
        (window as Window & { __vimtexPrinted?: boolean }).__vimtexPrinted =
          true;
      };
    });

    await page.getByRole("button", { name: /^room menu$/i }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: /export as pdf/i }).click();

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as Window & { __vimtexPrinted?: boolean }).__vimtexPrinted ===
            true,
        ),
      )
      .toBe(true);

    await expect(page.locator("#vt-print-root")).toBeAttached();
  });
});
