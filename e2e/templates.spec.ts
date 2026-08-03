import { expect, test } from "@playwright/test";
import { editorDocText, openForge, replaceDocWithMarker } from "./helpers";

async function openSheetPicker(page: import("@playwright/test").Page) {
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog", { name: /command palette/i });
  await expect(palette).toBeVisible({ timeout: 5_000 });
  await palette.getByLabel("Command palette").fill("new sheet");
  await palette.getByRole("option", { name: /new sheet/i }).click();
  const picker = page.getByRole("dialog", { name: /new sheet/i });
  await expect(picker).toBeVisible({ timeout: 5_000 });
  return { palette, picker };
}

test.describe("Session templates", () => {
  test("new sheet from a variable template prompts and fills values", async ({
    page,
  }) => {
    await openForge(page);

    const { picker } = await openSheetPicker(page);
    await picker.getByRole("button", { name: /letter/i }).click();

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

    const { picker: reusePicker } = await openSheetPicker(page);
    await reusePicker.getByRole("button", { name: /^my template/i }).click();

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

    const { picker } = await openSheetPicker(page);
    const deleteButton = picker.getByRole("button", {
      name: /delete temp to delete/i,
    });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(
      picker.getByRole("button", { name: /delete temp to delete/i }),
    ).toHaveCount(0);

    await picker.getByRole("button", { name: /cancel/i }).click();
    await expect(picker).toHaveCount(0);

    const { picker: recheck } = await openSheetPicker(page);
    await expect(
      recheck.getByRole("button", { name: /^temp to delete/i }),
    ).toHaveCount(0);
  });
});
