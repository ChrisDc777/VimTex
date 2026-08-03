import { expect, test } from "@playwright/test";
import { editorDocText, openForge, prepareApp } from "./helpers";

test.describe("M1 core editing and activation", () => {
  test("standard keys edit plain text without Vim insert mode", async ({
    page,
  }) => {
    await prepareApp(page, { variant: "forge", editorMode: "standard" });
    await page.goto(`/?room=std-${Date.now().toString(16)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".vt-footer__mode")).toContainText("Standard");

    const content = page.locator(".cm-content");
    await content.click();
    await page.keyboard.type("plain typing works");
    await expect(await editorDocText(page)).toContain("plain typing works");

    await page.keyboard.press("Escape");
    await expect(await editorDocText(page)).toContain("plain typing works");
  });

  test("onboarding appears once then stays dismissed after reload", async ({
    page,
  }) => {
    await prepareApp(page, { variant: "forge", onboardingSeen: false });
    await page.goto(`/?room=ob-${Date.now().toString(16)}`, {
      waitUntil: "domcontentloaded",
    });

    const dialog = page.getByRole("dialog", { name: /welcome to vimtex/i });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await dialog.getByRole("button", { name: /start editing/i }).click();
    await expect(dialog).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("dialog", { name: /welcome to vimtex/i }),
    ).toHaveCount(0);
  });

  test("onboarding can be re-opened from the command palette", async ({
    page,
  }) => {
    await openForge(page);

    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible({ timeout: 5_000 });

    await palette.getByLabel("Command palette").fill("welcome");
    await palette
      .getByRole("option", { name: /show welcome intro/i })
      .click();
    await expect(palette).toHaveCount(0);

    const dialog = page.getByRole("dialog", { name: /welcome to vimtex/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /start editing/i }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("onboarding can be re-opened from the shortcuts & tips dialog", async ({
    page,
  }) => {
    await openForge(page);

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("?");
    const cheatsheet = page.getByRole("dialog", { name: /shortcuts & tips/i });
    await expect(cheatsheet).toBeVisible({ timeout: 5_000 });

    await cheatsheet.getByRole("button", { name: /replay welcome/i }).click();
    await expect(cheatsheet).toHaveCount(0);

    const dialog = page.getByRole("dialog", { name: /welcome to vimtex/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /start editing/i }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Forge opens the command palette with Ctrl/Cmd+K and filters commands", async ({
    page,
  }) => {
    await openForge(page);

    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+K");

    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible({ timeout: 5_000 });
    await expect(
      palette.getByRole("option", { name: /copy room link/i }),
    ).toBeVisible();
    await expect(
      palette.getByRole("option", { name: /new homework/i }),
    ).toBeVisible();
    await expect(
      palette.getByRole("option", { name: /export as latex/i }),
    ).toBeVisible();

    await palette.getByLabel("Command palette").fill("preview");
    await expect(
      palette.getByRole("option", { name: /toggle preview/i }),
    ).toBeVisible();
    await expect(
      palette.getByRole("option", { name: /export as latex/i }),
    ).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
  });
});
