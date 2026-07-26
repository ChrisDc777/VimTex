import { expect, test, type Page } from "@playwright/test";

async function clearAppState(page: Page) {
  await page.addInitScript(() => {
    if (document.cookie.includes("vimtex_test_cleared=1")) return;
    document.cookie = "vimtex_test_cleared=1; path=/; SameSite=Lax";
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

/** Open a sheet — no name gate; editor is ready immediately. */
async function openSheet(page: Page, room?: string) {
  const id = room ?? `sheet-${Date.now().toString(16)}`;
  await clearAppState(page);
  await page.goto(`/?room=${id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("dialog", { name: /display name/i }),
  ).toHaveCount(0);
  return id;
}

async function insertMode(page: Page) {
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
}

async function editorText(page: Page) {
  return page.locator(".cm-content").innerText();
}

async function panelNav(page: Page) {
  return page.getByRole("navigation", { name: /right panels/i }).last();
}

test.describe("VimTex UX shell", () => {
  test("opens directly into editor without name modal", async ({ page }) => {
    await openSheet(page);
    await expect(page.getByText("VimTex").first()).toBeVisible();
    await expect(page.locator(".cm-editor.cm-focused")).toBeVisible({ timeout: 5_000 });
    await expect(
      (await panelNav(page)).getByRole("button", {
        name: /^preview$/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^sheet$/i })).toBeVisible();
  });

  test("problem panel toggle shows paste empty state", async ({ page }) => {
    await openSheet(page);

    const problem = (await panelNav(page)).getByRole("button", {
      name: /^problem$/i,
    });
    await problem.click();
    await expect(problem).toHaveAttribute("aria-pressed", "true");

    const panel = page.getByRole("complementary", { name: /problem reference/i });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: /^paste$/i })).toBeVisible();
    await expect(page.locator(".cm-editor")).toBeVisible();

    await problem.click();
    await expect(problem).toHaveAttribute("aria-pressed", "false");
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".cm-editor")).toBeVisible();
  });

  test("preview toggle keeps editor mounted", async ({ page }) => {
    await openSheet(page);
    const preview = (await panelNav(page)).getByRole("button", {
      name: /^preview$/i,
    });
    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".latex-preview")).toBeVisible();
    await expect(page.locator(".cm-editor")).toBeVisible();

    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".latex-preview")).toHaveCount(0);
    await expect(page.locator(".cm-editor")).toBeVisible();
  });

  test("header controls meet touch target height", async ({ page }, testInfo) => {
    await openSheet(page);

    const controls = page.locator("header .vt-header-btn");
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box, `control ${i} has box`).toBeTruthy();
      expect(
        box!.height,
        `control ${i} height on ${testInfo.project.name}`,
      ).toBeGreaterThanOrEqual(40);
    }

    const railButtons = page.locator(
      testInfo.project.name === "mobile"
        ? ".vt-bottom-tabs__btn"
        : ".vt-panel-rail__btn",
    );
    const railCount = await railButtons.count();
    expect(railCount).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < railCount; i++) {
      const box = await railButtons.nth(i).boundingBox();
      expect(box, `rail button ${i} has box`).toBeTruthy();
      expect(
        box!.height,
        `rail button ${i} height on ${testInfo.project.name}`,
      ).toBeGreaterThanOrEqual(40);
    }

    const brand = page.locator(".vt-header__brand");
    await expect(brand).toBeVisible();
    const brandBox = await brand.boundingBox();
    expect(brandBox!.width).toBeGreaterThan(40);
  });

  test("mobile header does not clip primary tools", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only overflow check");

    await openSheet(page);

    const toolbar = page.locator(".vt-header__nav");
    await expect(toolbar).toBeVisible();

    const newBtn = page.getByRole("button", { name: /^sheet$/i });
    await expect(newBtn).toBeVisible();

    const toolbarBox = await toolbar.boundingBox();
    const newBox = await newBtn.boundingBox();
    expect(toolbarBox).toBeTruthy();
    expect(newBox).toBeTruthy();
    expect(newBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y - 2);
    expect(newBox!.y + newBox!.height).toBeLessThanOrEqual(
      toolbarBox!.y + toolbarBox!.height + 4,
    );

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("mobile bottom tabs visible and rail hidden", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only layout check");

    await openSheet(page);

    await expect(page.locator(".vt-bottom-tabs")).toBeVisible();
    await expect(page.locator(".vt-panel-rail")).toBeHidden();
  });

  test("mobile bottom tab toggles preview panel", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only tab toggle");

    await openSheet(page);
    const preview = (await panelNav(page)).getByRole("button", {
      name: /^preview$/i,
    });

    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".latex-preview")).toBeVisible();

    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".latex-preview")).toHaveCount(0);
  });

  test("mobile tab close buttons are visible without hover", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only tab close check");

    await openSheet(page);
    await page.getByRole("button", { name: /^new tab$/i }).click();

    const closeBtn = page
      .getByRole("tablist", { name: /open documents/i })
      .getByRole("button", { name: /^close /i })
      .first();
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toHaveCSS("opacity", "1");
  });

  test("mobile tab overflow menu renames tab", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only rename menu");

    await openSheet(page);
    const tab = page
      .getByRole("tablist", { name: /open documents/i })
      .getByRole("tab")
      .first();
    await tab.click();

    await page
      .getByRole("button", { name: /^tab actions for /i })
      .click();
    await page.getByRole("menuitem", { name: /^rename$/i }).click();

    const rename = page.getByRole("textbox", { name: /rename tab/i });
    await expect(rename).toBeVisible();
    await rename.fill("Mobile Sheet");
    await rename.press("Enter");

    await expect(page.getByRole("tab", { name: "Mobile Sheet" })).toBeVisible();
  });

  test("mobile bottom tab touch targets meet minimum size", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only touch targets");

    await openSheet(page);

    const buttons = page.locator(".vt-bottom-tabs__btn");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box, `bottom tab ${i} has box`).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("problem panel supports image file upload on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only upload check");

    await openSheet(page);
    await (await panelNav(page))
      .getByRole("button", { name: /^problem$/i })
      .click();

    const panel = page.getByRole("complementary", { name: /problem reference/i });
    await expect(panel).toBeVisible();

    const fileInput = panel.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "problem.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });

    await expect(panel.locator('img[alt="Problem reference"]')).toBeVisible({
      timeout: 5_000,
    });
  });

  test("mobile sheet menu opens and new sheet works", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only sheet menu check");

    await openSheet(page);

    await page.getByRole("button", { name: /^sheet$/i }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: /new sheet/i }),
    ).toBeVisible();

    const tablist = page.getByRole("tablist", { name: /open documents/i });
    await expect(tablist.getByRole("tab")).toHaveCount(1);

    await menu.getByRole("menuitem", { name: /new sheet/i }).click();
    await expect(menu).toHaveCount(0);
    await expect(tablist.getByRole("tab")).toHaveCount(2);
  });

  test("mobile sheet menu stays within viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only menu bounds check");

    await openSheet(page);
    await page.getByRole("button", { name: /^sheet$/i }).click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const menuBox = await menu.boundingBox();
    expect(menuBox).toBeTruthy();
    expect(menuBox!.x).toBeGreaterThanOrEqual(-1);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  });

  test("mobile header brand is centered", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only brand centering");

    await openSheet(page);

    const brand = page.locator(".vt-header__brand");
    const header = page.locator(".vt-header");
    await expect(brand).toBeVisible();

    const brandBox = await brand.boundingBox();
    const headerBox = await header.boundingBox();
    expect(brandBox).toBeTruthy();
    expect(headerBox).toBeTruthy();

    const brandCenter = brandBox!.x + brandBox!.width / 2;
    const headerCenter = headerBox!.x + headerBox!.width / 2;
    expect(Math.abs(brandCenter - headerCenter)).toBeLessThan(8);
  });

  test("mobile premium dialog plans stack vertically and stay centered", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only pricing layout");

    await openSheet(page);
    await page.getByRole("button", { name: /^sheet$/i }).click();
    await page.getByRole("menuitem", { name: /live share/i }).click();

    const dialog = page.getByRole("dialog", { name: /choose a plan/i });
    await expect(dialog).toBeVisible();

    const cards = dialog.locator(".vt-pricing-card");
    await expect(cards).toHaveCount(3);

    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    const dialogBox = await dialog.boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();
    expect(dialogBox).toBeTruthy();

    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 4);

    const dialogCenter = dialogBox!.x + dialogBox!.width / 2;
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    expect(Math.abs(dialogCenter - viewport!.width / 2)).toBeLessThan(24);
  });

  test("mobile premium dialog close controls stay visible", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only premium dialog check");

    await openSheet(page);
    await page.getByRole("button", { name: /^sheet$/i }).click();
    await page.getByRole("menuitem", { name: /live share/i }).click();

    const dialog = page.getByRole("dialog", { name: /choose a plan/i });
    await expect(dialog).toBeVisible();

    const closeBtn = dialog.getByRole("button", { name: /^close$/i });
    const maybeLater = dialog.getByRole("button", { name: /maybe later/i });

    await expect(closeBtn).toBeVisible();
    await expect(maybeLater).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    const closeBox = await closeBtn.boundingBox();
    const footerBox = await maybeLater.boundingBox();
    expect(dialogBox).toBeTruthy();
    expect(closeBox).toBeTruthy();
    expect(footerBox).toBeTruthy();
    expect(closeBox!.y).toBeGreaterThanOrEqual(dialogBox!.y - 2);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(
      dialogBox!.y + dialogBox!.height + 4,
    );

    await closeBtn.click();
    await expect(dialog).toBeHidden();
  });

  test("mobile premium dialog dismisses from backdrop tap", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only backdrop dismiss");

    await openSheet(page);
    await page.getByRole("button", { name: /^sheet$/i }).click();
    await page.getByRole("menuitem", { name: /live share/i }).click();

    const dialog = page.getByRole("dialog", { name: /choose a plan/i });
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).toBeTruthy();
    await page.touchscreen.tap(8, Math.round(dialogBox!.y / 2));

    await expect(dialog).toBeHidden();
  });

  test("desktop workspace does not scroll horizontally with right pane open", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only overflow check");

    await page.setViewportSize({ width: 900, height: 720 });
    await openSheet(page);

    await (await panelNav(page))
      .getByRole("button", { name: /^problem$/i })
      .click();

    await expect(
      page.getByRole("complementary", { name: /problem reference/i }),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const editorBox = await page.locator("main").boundingBox();
    expect(editorBox).toBeTruthy();
    expect(editorBox!.width).toBeGreaterThanOrEqual(280);
  });

  test("live share is premium-gated in sheet menu", async ({ page }) => {
    await openSheet(page);

    await expect(page.getByRole("button", { name: /^share$/i })).toHaveCount(0);

    await page.getByRole("button", { name: /^sheet$/i }).click();
    await page.getByRole("menuitem", { name: /live share/i }).click();

    const dialog = page.getByRole("dialog", { name: /choose a plan/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Pro" })).toBeVisible();
    await dialog.getByRole("button", { name: /maybe later/i }).click();
    await expect(dialog).toBeHidden();
  });

  test("chat rail opens premium plans dialog", async ({ page }) => {
    await openSheet(page);

    await (await panelNav(page))
      .getByRole("button", { name: /^chat$/i })
      .click();

    const dialog = page.getByRole("dialog", { name: /choose a plan/i });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("complementary", { name: /room chat/i })).toHaveCount(0);
  });

  test("preview panel still opens on the right", async ({ page }) => {
    await openSheet(page);

    const preview = (await panelNav(page)).getByRole("button", {
      name: /^preview$/i,
    });

    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".latex-preview")).toBeVisible();
    await expect(page.getByRole("complementary")).toHaveCount(1);
  });

  test("desktop panes can be resized with drag handles", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only resize check");

    await openSheet(page);

    await (await panelNav(page))
      .getByRole("button", { name: /^problem$/i })
      .click();
    const panel = page.getByRole("complementary", { name: /problem reference/i });
    await expect(panel).toBeVisible();

    const handle = page.getByRole("separator", { name: /resize right panel/i });
    await expect(handle).toBeVisible();

    const boxBefore = await panel.boundingBox();
    expect(boxBefore).toBeTruthy();

    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 - 80,
      handleBox!.y + handleBox!.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();

    const boxAfter = await panel.boundingBox();
    expect(boxAfter).toBeTruthy();
    expect(boxAfter!.width).toBeGreaterThan(boxBefore!.width + 40);
  });

  test("status bar shows local mode", async ({ page }) => {
    await openSheet(page);

    await expect(page.locator(".vt-footer__status-label")).toHaveText("Local");
  });

  test("status bar exposes editable name", async ({ page }) => {
    await openSheet(page);

    const nameBtn = page.getByRole("button", { name: /change display name/i });
    await nameBtn.click();
    const dialog = page.getByRole("dialog", { name: /display name/i });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/axion/i).fill("Renamed");
    await dialog.getByRole("button", { name: /^save$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: /change display name/i }),
    ).toHaveText("Renamed");
  });

  test("status bar shows vim mode on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only footer check");

    await openSheet(page);

    const modeShort = page.locator(".vt-footer__mode-short");
    await expect(modeShort).toBeVisible();
    await expect(modeShort).toHaveText(/^[NIVR]$/);
  });
});

test.describe("Inline scratchpad contract", () => {
  test("prose and inline math on the same line stay separate", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("hi \\frac{1}{2} there");
    await page.keyboard.press("Escape");
    await page.keyboard.press("o");

    await expect.poll(async () => editorText(page)).toContain("hi");
    await expect.poll(async () => editorText(page)).toContain("there");
    await expect(page.locator(".cm-math-widget")).toHaveCount(1);
    await expect(page.locator(".cm-math-widget")).not.toHaveClass(/cm-math-display/);
  });

  test("bare TeX renders inline without display styling", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("\\frac{1}{2}");
    await page.keyboard.press("Escape");
    await page.keyboard.press("o");

    const widget = page.locator(".cm-math-widget").first();
    await expect(widget).toBeAttached({ timeout: 5_000 });
    await expect(widget).not.toHaveClass(/cm-math-display/);
  });

  test("bare numeric math like 2^5 renders without delimiters", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.insertText("2^5");
    await page.keyboard.press("Escape");
    await page.keyboard.press("o");

    const widget = page.locator(".cm-math-widget").first();
    await expect(widget).toBeAttached({ timeout: 5_000 });
    await expect(widget).not.toHaveClass(/cm-math-display/);
    await expect(widget.locator("math")).toBeVisible();
  });

  test("plain integers in prose stay literal text", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("chapter 42");
    await page.keyboard.press("Escape");
    await page.locator(".cm-content").click({ position: { x: 4, y: 4 } });

    await expect(page.locator(".cm-math-widget")).toHaveCount(0);
    await expect.poll(async () => editorText(page)).toContain("chapter 42");
  });

  test("caret inside math reveals raw source", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("\\frac{1}{2}");
    await page.keyboard.press("Escape");
    await page.keyboard.press("0");

    await expect.poll(async () => editorText(page)).toContain("\\frac");

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".cm-math-widget")).toHaveCount(0);
    await expect.poll(async () => editorText(page)).toContain("\\frac");
  });

  test("explicit display math uses display styling", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("\\[E = mc^{2}\\]");
    await page.keyboard.press("Escape");
    await page.keyboard.press("o");

    const display = page.locator(".cm-math-widget.cm-math-display");
    await expect(display.first()).toBeAttached({ timeout: 5_000 });
  });

  test("invalid TeX shows non-destructive error styling", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("\\badcmd{x}");
    await page.keyboard.press("Escape");
    await page.keyboard.press("o");

    await expect(page.locator(".cm-math-widget.cm-math-error").first()).toBeAttached({
      timeout: 5_000,
    });
    await expect.poll(async () => editorText(page)).toContain("\\badcmd");
  });

  test("local autosave restores after reload", async ({ page }) => {
    const room = `restore-${Date.now().toString(16)}`;
    await openSheet(page, room);
    await insertMode(page);
    await page.keyboard.type("x = 42");
    await page.keyboard.press("Escape");

    await expect.poll(async () => editorText(page)).toContain("x = 42");

    await expect
      .poll(async () =>
        page.evaluate(
          (id) => localStorage.getItem(`vimtex:note:${id}`),
          room,
        ),
      )
      .toContain("x = 42");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => editorText(page)).toContain("x = 42");
  });

  test("rooms keep isolated local caches", async ({ page }) => {
    const roomA = `iso-a-${Date.now().toString(16)}`;
    const roomB = `iso-b-${Date.now().toString(16)}`;

    await openSheet(page, roomA);
    await insertMode(page);
    await page.keyboard.type("room-a-content");
    await page.keyboard.press("Escape");
    await expect.poll(async () => editorText(page)).toContain("room-a-content");

    await page.goto(`/?room=${roomB}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => editorText(page)).not.toContain("room-a-content");
  });

  test("new sheet starts empty in a fresh room", async ({ page }) => {
    const room = `new-${Date.now().toString(16)}`;
    await openSheet(page, room);
    await insertMode(page);
    await page.keyboard.type("to be cleared");
    await page.keyboard.press("Escape");
    await expect.poll(async () => editorText(page)).toContain("to be cleared");

    const urlBefore = page.url();
    await page.getByRole("button", { name: /^sheet$/i }).click();
    await page.getByRole("menuitem", { name: /new sheet/i }).click();
    await expect.poll(() => page.url()).not.toBe(urlBefore);
    await expect.poll(async () => editorText(page)).not.toMatch(/to be cleared/);

    await page.goto(urlBefore, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => editorText(page)).toContain("to be cleared");
  });
});

test.describe("Editor tabs", () => {
  test("new sheet creates a second tab", async ({ page }) => {
    await openSheet(page);
    const tablist = page.getByRole("tablist", { name: /open documents/i });
    await expect(tablist.getByRole("tab")).toHaveCount(1);

    await page.getByRole("button", { name: /^new tab$/i }).click();
    await expect(tablist.getByRole("tab")).toHaveCount(2);
  });

  test("clicking inactive tab switches editor content", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("tab-one-content");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^new tab$/i }).click();
    await insertMode(page);
    await page.keyboard.type("tab-two-content");
    await page.keyboard.press("Escape");

    const tabs = page.getByRole("tablist", { name: /open documents/i });
    await tabs.getByRole("tab", { name: /untitled/i }).first().click();
    await expect.poll(async () => editorText(page)).toContain("tab-one-content");
    await expect.poll(async () => editorText(page)).not.toContain("tab-two-content");

    await tabs.getByRole("tab").last().click();
    await expect.poll(async () => editorText(page)).toContain("tab-two-content");
  });

  test("closing a tab removes it and activates neighbor", async ({ page }) => {
    await openSheet(page);
    await page.getByRole("button", { name: /^new tab$/i }).click();
    const tablist = page.getByRole("tablist", { name: /open documents/i });
    await expect(tablist.getByRole("tab")).toHaveCount(2);

    await tablist.getByRole("button", { name: /^close /i }).first().click();
    await expect(tablist.getByRole("tab")).toHaveCount(1);
    await expect(page.locator(".cm-editor")).toBeVisible();
  });

  test("new tab button disabled at five tabs", async ({ page }) => {
    await openSheet(page);
    const newTab = page.getByRole("button", { name: /^new tab$/i });

    for (let i = 0; i < 4; i += 1) {
      await newTab.click();
    }

    const tablist = page.getByRole("tablist", { name: /open documents/i });
    await expect(tablist.getByRole("tab")).toHaveCount(5);
    await expect(newTab).toBeDisabled();

    await page.getByRole("button", { name: /^sheet$/i }).click();
    await expect(
      page.getByRole("menuitem", { name: /new sheet/i }),
    ).toBeDisabled();
  });

  test("refresh restores tab list and active tab", async ({ page }) => {
    await openSheet(page);
    await page.getByRole("button", { name: /^new tab$/i }).click();
    const tablist = page.getByRole("tablist", { name: /open documents/i });
    await tablist.getByRole("tab").last().click();

    const url = page.url();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    const tablistAfter = page.getByRole("tablist", { name: /open documents/i });
    await expect(tablistAfter.getByRole("tab")).toHaveCount(2);
    await expect(tablistAfter.getByRole("tab", { selected: true })).toHaveCount(1);
    await expect(page).toHaveURL(url);
  });

  test("double-click rename persists custom title", async ({ page }) => {
    await openSheet(page);
    const tab = page
      .getByRole("tablist", { name: /open documents/i })
      .getByRole("tab")
      .first();
    await tab.dblclick();

    const rename = page.getByRole("textbox", { name: /rename tab/i });
    await expect(rename).toBeVisible();
    await rename.fill("Homework 2");
    await rename.press("Enter");

    await expect(
      page.getByRole("tab", { name: "Homework 2" }),
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("tab", { name: "Homework 2" }),
    ).toBeVisible();
  });

  test("refresh restores open side panel", async ({ page }) => {
    await openSheet(page);

    await (await panelNav(page))
      .getByRole("button", { name: /^preview$/i })
      .click();
    await expect(page.locator(".latex-preview")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".latex-preview")).toBeVisible();
    await expect(
      (await panelNav(page)).getByRole("button", { name: /^preview$/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("switching tabs keeps the open side panel", async ({ page }) => {
    await openSheet(page);

    await (await panelNav(page))
      .getByRole("button", { name: /^preview$/i })
      .click();
    await expect(page.locator(".latex-preview")).toBeVisible();

    await page.getByRole("button", { name: /^new tab$/i }).click();
    await expect(page.locator(".latex-preview")).toBeVisible();

    const tablist = page.getByRole("tablist", { name: /open documents/i });
    await tablist.getByRole("tab").first().click();
    await expect(page.locator(".latex-preview")).toBeVisible();
  });

  test("auto-title updates from \\title{}", async ({ page }) => {
    await openSheet(page);
    await insertMode(page);
    await page.keyboard.type("\\title{My Document}");
    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("tab", { name: "My Document" }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
