import { expect, test, type Page } from "@playwright/test";
import {
  joinStudioRoom,
  openForge,
  waitConnected,
} from "./helpers";

test.describe("Reconnect / offline banner (#21)", () => {
  const banner = (page: Page) =>
    page.locator(".vt-reconnect-banner").first();

  async function expectOnline(page: Page) {
    await expect(banner(page)).toHaveCount(0);
    await waitConnected(page);
  }

  async function goOffline(page: Page) {
    await page.context().setOffline(true);
    await expect(banner(page)).toBeVisible({ timeout: 20_000 });
    await expect(banner(page)).toContainText(/offline/i);
  }

  async function goOnline(page: Page) {
    await page.context().setOffline(false);
    await expect(banner(page)).toHaveCount(0, { timeout: 30_000 });
  }

  test("forge shows an offline banner and clears on reconnect", async ({
    page,
  }) => {
    await openForge(page);
    await expectOnline(page);

    await goOffline(page);

    await goOnline(page);
    await expectOnline(page);
  });

  test("studio shows an offline banner and clears on reconnect", async ({
    page,
  }) => {
    await joinStudioRoom(page, { name: "Rekon" });
    await expectOnline(page);

    await goOffline(page);

    await goOnline(page);
    await expectOnline(page);
  });
});
