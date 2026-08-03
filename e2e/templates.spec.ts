import { expect, test } from "@playwright/test";
import { editorDocText, openForge, replaceDocWithMarker } from "./helpers";

test.describe("Session templates", () => {
  test("new sheet from a variable template prompts and fills values", async ({
    page,
  }) => {
    await openForge(page);

    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible({ timeout: 5_000 });

    await palette.getByLabel("Command palette").fill("letter");
    await palette.getByRole("option", { name: /new letter/i }).click();

    const dialog = page.getByRole("dialog", { name: /new letter/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByLabel(/name/i).fill("Ada Lovelace");
    await dialog.getByRole("button", { name: /create sheet/i }).click();
    await expect(dialog).toHaveCount(0);

    await expect(await editorDocText(page)).toContain("Ada Lovelace");
    await expect(await editorDocText(page)).toContain("Sincerely");
  });

  test("current note can be saved as a reusable template", async ({ page }) => {
    await openForge(page);
    await replaceDocWithMarker(page, "custom template body");

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible({ timeout: 5_000 });

    await palette.getByLabel("Command palette").fill("save");
    await palette
      .getByRole("option", { name: /save current note as template/i })
      .click();

    const saveDialog = page.getByRole("dialog", { name: /save as template/i });
    await expect(saveDialog).toBeVisible({ timeout: 5_000 });
    await saveDialog.getByLabel(/template name/i).fill("My template");
    await saveDialog.getByRole("button", { name: /save template/i }).click();
    await expect(saveDialog).toHaveCount(0);

    await page.keyboard.press("Control+K");
    await expect(palette).toBeVisible({ timeout: 5_000 });
    await palette.getByLabel("Command palette").fill("my template");
    const option = palette.getByRole("option", {
      name: /new my template/i,
    });
    await expect(option).toBeVisible();
    await option.click();

    await expect(await editorDocText(page)).toContain("custom template body");
  });

  test("saved templates can be deleted", async ({ page }) => {
    await openForge(page);
    await replaceDocWithMarker(page, "body to delete");

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible({ timeout: 5_000 });

    await palette.getByLabel("Command palette").fill("save");
    await palette
      .getByRole("option", { name: /save current note as template/i })
      .click();

    const saveDialog = page.getByRole("dialog", { name: /save as template/i });
    await expect(saveDialog).toBeVisible({ timeout: 5_000 });
    await saveDialog.getByLabel(/template name/i).fill("Temp to delete");
    await saveDialog.getByRole("button", { name: /save template/i }).click();
    await expect(saveDialog).toHaveCount(0);

    await page.keyboard.press("Control+K");
    await expect(palette).toBeVisible({ timeout: 5_000 });
    await palette.getByLabel("Command palette").fill("save");
    await palette
      .getByRole("option", { name: /save current note as template/i })
      .click();
    await expect(saveDialog).toBeVisible({ timeout: 5_000 });

    const deleteButton = saveDialog.getByRole("button", {
      name: /delete temp to delete/i,
    });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(
      saveDialog.getByRole("button", { name: /delete temp to delete/i }),
    ).toHaveCount(0);

    await saveDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(saveDialog).toHaveCount(0);

    await page.keyboard.press("Control+K");
    await expect(palette).toBeVisible({ timeout: 5_000 });
    await palette.getByLabel("Command palette").fill("temp to delete");
    await expect(
      palette.getByRole("option", { name: /new temp to delete/i }),
    ).toHaveCount(0);
  });
});
