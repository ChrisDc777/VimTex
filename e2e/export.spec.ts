import { expect, test } from "@playwright/test";
import { joinStudioRoom, openImportExportMenu } from "./helpers";

test.describe("M4 PDF export (#32)", () => {
  test("Studio Import & Export PDF opens the print dialog", async ({ page }) => {
    await joinStudioRoom(page);

    await page.evaluate(() => {
      window.print = () => {
        (window as Window & { __vimtexPrinted?: boolean }).__vimtexPrinted =
          true;
      };
    });

    const menu = await openImportExportMenu(page);
    await menu.getByRole("menuitem", { name: /^pdf\b/i }).click();

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
