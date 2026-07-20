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

test.describe("VimTex UX shell", () => {
  test("name picker → editor → view toggle → chat", async ({ page }) => {
    const room = `ux-${Date.now().toString(16)}`;
    await joinAs(page, "Axion", room);

    await expect(page.getByText("VimTex").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();

    const realtime = page.getByRole("button", { name: /realtime|live/i });
    const split = page.getByRole("button", { name: /^split$/i });
    await realtime.click();
    await expect(realtime).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".latex-preview")).toHaveCount(0);

    await split.click();
    await expect(split).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".latex-preview")).toBeVisible();

    await page.getByRole("button", { name: /^chat$/i }).click();
    const chat = page.getByRole("complementary", { name: /room chat/i });
    await expect(chat).toBeVisible();
    await expect(chat.getByPlaceholder(/message/i)).toBeVisible();
    await chat.getByRole("button", { name: /close chat/i }).click();
    await expect(chat).toHaveCount(0);
  });

  test("toolbar pills meet touch target height", async ({ page }, testInfo) => {
    const room = `touch-${Date.now().toString(16)}`;
    await joinAs(page, "Touch", room);

    const pills = page.locator("header .vt-pill");
    const count = await pills.count();
    expect(count).toBeGreaterThan(3);

    for (let i = 0; i < count; i++) {
      const box = await pills.nth(i).boundingBox();
      expect(box, `pill ${i} has box`).toBeTruthy();
      expect(box!.height, `pill ${i} height on ${testInfo.project.name}`).toBeGreaterThanOrEqual(
        40,
      );
    }

    // Brand remains readable / present in first viewport
    const brand = page.locator(".vt-brand");
    await expect(brand).toBeVisible();
    const brandBox = await brand.boundingBox();
    expect(brandBox!.width).toBeGreaterThan(40);
  });

  test("mobile header does not clip primary tools", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only overflow check");

    const room = `mobi-${Date.now().toString(16)}`;
    await joinAs(page, "Mobile", room);

    const toolbar = page.locator(".vt-toolbar");
    await expect(toolbar).toBeVisible();

    const share = page.getByRole("button", { name: /share/i });
    const chat = page.getByRole("button", { name: /^chat$/i });
    await expect(share).toBeVisible();
    await expect(chat).toBeVisible();

    const toolbarBox = await toolbar.boundingBox();
    const shareBox = await share.boundingBox();
    expect(toolbarBox).toBeTruthy();
    expect(shareBox).toBeTruthy();
    // Share sits inside the scrollable toolbar region
    expect(shareBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y - 2);
    expect(shareBox!.y + shareBox!.height).toBeLessThanOrEqual(
      toolbarBox!.y + toolbarBox!.height + 4,
    );

    // Horizontal overflow is allowed via scroll, not vertical page blowout
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("chat stream has no message cards", async ({ page }) => {
    const room = `chat-ui-${Date.now().toString(16)}`;
    await joinAs(page, "Chris", room);

    await page.getByRole("button", { name: /^chat$/i }).click();
    const chat = page.getByRole("complementary", { name: /room chat/i });
    await expect(chat).toBeVisible();

    // Model is a compact header control, not a labeled row
    await expect(chat.getByLabel(/model for @ai/i)).toBeVisible();
    await expect(chat.locator(".vt-chat-composer__field")).toBeVisible();

    const input = chat.getByPlaceholder(/^message/i);
    await input.fill("hello stream");
    await chat.getByRole("button", { name: /send message/i }).click();

    await expect(chat.getByText("hello stream")).toBeVisible();
    await expect(chat.locator(".vt-chat-msg")).toHaveCount(1);
    // No bordered card shells on messages
    await expect(chat.locator(".vt-chat-msg .rounded-lg.border")).toHaveCount(0);
  });

  test("status bar exposes editable name", async ({ page }) => {
    const room = `name-${Date.now().toString(16)}`;
    await joinAs(page, "Editable", room);

    await page.getByRole("button", { name: /^editable$/i }).click();
    const dialog = page.getByRole("dialog", { name: /display name/i });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/axion/i).fill("Renamed");
    await dialog.getByRole("button", { name: /^save$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /^renamed$/i })).toBeVisible();
  });
});
