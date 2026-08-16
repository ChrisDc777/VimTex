import { expect, test } from "@playwright/test";
import { joinStudioRoom, openForge } from "./helpers";

test.describe("Studio Enhanced / Basic experience", () => {
  test("Enhanced composer uses + Ask/Plan chips (no Ask/Edit toolbar)", async ({
    page,
  }) => {
    await joinStudioRoom(page, { studioExperience: "enhanced" });

    await page.getByRole("button", { name: /^chat$/i }).click();
    const chat = page.getByRole("complementary", { name: /room chat/i });
    await expect(chat).toBeVisible();

    await expect(chat.getByRole("group", { name: /chat mode/i })).toHaveCount(0);
    await expect(
      chat.getByRole("button", { name: /add chat mode/i }),
    ).toBeVisible();

    await chat.getByRole("button", { name: /add chat mode/i }).click();
    await page.getByRole("button", { name: /^plan$/i }).click();
    await expect(chat.locator(".beui-prompt-chip")).toContainText(/plan/i);

    await chat.getByRole("button", { name: /remove plan mode/i }).click();
    await expect(chat.locator(".beui-prompt-chip")).toHaveCount(0);
  });

  test("Basic restores Ask/Edit chips", async ({ page }) => {
    await joinStudioRoom(page, { studioExperience: "basic" });

    await page.getByRole("button", { name: /^chat$/i }).click();
    const chat = page.getByRole("complementary", { name: /room chat/i });
    await expect(chat).toBeVisible();

    const modes = chat.getByRole("group", { name: /chat mode/i });
    await expect(modes).toBeVisible();
    await expect(modes.getByRole("button", { name: /^ask$/i })).toBeVisible();
    await expect(modes.getByRole("button", { name: /^edit$/i })).toBeVisible();
    await expect(
      chat.getByRole("button", { name: /add chat mode/i }),
    ).toHaveCount(0);
  });

  test("Forge has no Studio experience control and no BEUI + menu", async ({
    page,
  }) => {
    await openForge(page);

    await page.getByRole("button", { name: /^chat$/i }).last().click();
    await expect(
      page.getByRole("button", { name: /add chat mode/i }),
    ).toHaveCount(0);
    await expect(page.locator(".beui-prompt-chip")).toHaveCount(0);

    await page.getByRole("button", { name: /^sheet$/i }).click();
    await page.getByRole("menuitem", { name: /preferences/i }).click();
    const prefs = page.getByRole("dialog", { name: /preferences/i });
    await expect(prefs).toBeVisible();
    await prefs.getByRole("tab", { name: /^workspace$/i }).click();
    await expect(prefs.getByText(/studio experience/i)).toHaveCount(0);
  });
});
