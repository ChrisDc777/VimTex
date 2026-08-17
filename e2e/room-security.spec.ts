import { expect, test } from "@playwright/test";
import { prepareApp } from "./helpers";

test.describe("room public-host security", () => {
  test("GET view-token is retired", async ({ request }) => {
    const res = await request.get("/api/rooms/abcd1234efgh5678/view-token");
    expect(res.status()).toBe(410);
  });

  test("PATCH meta requires edit once ACL is on", async ({ request }) => {
    const room = `meta${Date.now().toString(16)}`;
    const minted = await request.post(`/api/rooms/${room}/capabilities`, {
      data: {},
    });
    expect(minted.ok()).toBeTruthy();
    const body = (await minted.json()) as { edit?: string };
    expect(body.edit).toBeTruthy();

    const denied = await request.patch(`/api/rooms/${room}/meta`, {
      data: { ttl: "7d" },
    });
    expect(denied.status()).toBe(403);

    const allowed = await request.patch(`/api/rooms/${room}/meta`, {
      headers: { "x-vimtex-edit": body.edit! },
      data: { ttl: "7d" },
    });
    expect(allowed.ok()).toBeTruthy();
  });

  test("legacy query edit tokens are stripped from the URL", async ({
    page,
  }) => {
    await prepareApp(page, { variant: "studio", displayName: "Frag" });
    await page.goto("/?room=fragroom01aaaa&edit=not-a-real-secret", {
      waitUntil: "domcontentloaded",
    });
    await expect
      .poll(() => new URL(page.url()).searchParams.get("edit"))
      .toBeNull();
  });
});
