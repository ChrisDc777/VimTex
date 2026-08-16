import { expect, test } from "@playwright/test";
import {
  editorDocText,
  joinStudioRoom,
  openStudioChat,
  replaceDocWithMarker,
  studioChatButton,
  waitConnected,
} from "./helpers";

test.describe("Studio collaboration (#10)", () => {
  test("name picker is required before the editor mounts", async ({ page }) => {
    await joinStudioRoom(page, { name: "Gate" });
    await expect(page.getByText("VimTex").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /share room/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: studioChatButton }),
    ).toBeVisible();
  });

  test("two clients sync note edits both ways", async ({ browser }) => {
    test.setTimeout(90_000);
    const room = `sync-${Date.now().toString(16)}`;

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await joinStudioRoom(pageA, { room, name: "Alice" });
      await joinStudioRoom(pageB, { room, name: "Bob" });

      await waitConnected(pageA);
      await waitConnected(pageB);

      await expect
        .poll(async () => pageA.getByText(/2 online/i).count(), {
          timeout: 20_000,
        })
        .toBeGreaterThan(0);

      await replaceDocWithMarker(pageA, "alpha-sync-marker");
      await expect
        .poll(async () => editorDocText(pageB), { timeout: 20_000 })
        .toContain("alpha-sync-marker");

      await replaceDocWithMarker(pageB, "beta-sync-marker");
      await expect
        .poll(async () => editorDocText(pageA), { timeout: 20_000 })
        .toContain("beta-sync-marker");
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("chat message is visible to the peer", async ({ browser }) => {
    test.setTimeout(90_000);
    const room = `chat-${Date.now().toString(16)}`;

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await joinStudioRoom(pageA, { room, name: "ChatA" });
      await joinStudioRoom(pageB, { room, name: "ChatB" });
      await waitConnected(pageA);
      await waitConnected(pageB);

      await openStudioChat(pageA);
      await openStudioChat(pageB);

      const chatA = pageA.getByRole("complementary", { name: /room chat/i });
      const chatB = pageB.getByRole("complementary", { name: /room chat/i });
      await expect(chatA).toBeVisible();
      await expect(chatB).toBeVisible();

      const marker = `ping-${Date.now().toString(16)}`;
      await chatA.getByPlaceholder(/message/i).fill(marker);
      await chatA.getByRole("button", { name: /send message/i }).click();

      await expect(chatA.getByText(marker)).toBeVisible({ timeout: 10_000 });
      await expect(chatB.getByText(marker)).toBeVisible({ timeout: 20_000 });
      await expect(chatB.getByText("ChatA").first()).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
