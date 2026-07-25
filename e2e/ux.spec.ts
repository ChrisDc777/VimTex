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

test.describe("VimTex UX shell", () => {
  test("opens directly into editor without name modal", async ({ page }) => {
    await openSheet(page);
    await expect(page.getByText("VimTex").first()).toBeVisible();
    await expect(page.locator(".cm-editor.cm-focused")).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("navigation", { name: /right panels/i }).getByRole("button", {
        name: /^preview$/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^sheet$/i })).toBeVisible();
  });

  test("problem panel toggle shows paste empty state", async ({ page }) => {
    await openSheet(page);

    const problem = page.getByRole("button", { name: /^problem$/i });
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
    const preview = page.getByRole("button", { name: /^preview$/i });
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

    const railButtons = page.locator(".vt-panel-rail__btn");
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
    const preview = page
      .getByRole("navigation", { name: /right panels/i })
      .getByRole("button", { name: /^preview$/i });
    await expect(newBtn).toBeVisible();
    await expect(preview).toBeVisible();

    const toolbarBox = await toolbar.boundingBox();
    const newBox = await newBtn.boundingBox();
    const previewBox = await preview.boundingBox();
    expect(toolbarBox).toBeTruthy();
    expect(newBox).toBeTruthy();
    expect(previewBox).toBeTruthy();
    expect(newBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y - 2);
    expect(newBox!.y + newBox!.height).toBeLessThanOrEqual(
      toolbarBox!.y + toolbarBox!.height + 4,
    );
    expect(previewBox!.y).toBeGreaterThan(toolbarBox!.y + toolbarBox!.height);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("desktop workspace does not scroll horizontally with both panes open", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only overflow check");

    await page.setViewportSize({ width: 900, height: 720 });
    await openSheet(page);

    await page.getByRole("button", { name: /^problem$/i }).click();
    await page
      .getByRole("navigation", { name: /right panels/i })
      .getByRole("button", { name: /^preview$/i })
      .click();

    await expect(
      page.getByRole("complementary", { name: /problem reference/i }),
    ).toBeVisible();
    await expect(page.locator(".latex-preview")).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const editorBox = await page.locator("main").boundingBox();
    expect(editorBox).toBeTruthy();
    expect(editorBox!.width).toBeGreaterThanOrEqual(280);
  });

  test("chat stream has no message cards", async ({ page }) => {
    await openSheet(page);

    await page.getByRole("button", { name: /^chat$/i }).click();
    const chat = page.getByRole("complementary", { name: /room chat/i });
    await expect(chat).toBeVisible();

    await expect(chat.getByLabel(/model for @ai/i)).toBeVisible();
    await expect(chat.locator(".vt-chat-composer__field")).toBeVisible();

    const input = chat.getByPlaceholder(/^message/i);
    await input.fill("hello stream");
    await chat.getByRole("button", { name: /send message/i }).click();

    await expect(chat.getByText("hello stream")).toBeVisible();
    await expect(chat.locator(".vt-chat-msg")).toHaveCount(1);
    await expect(chat.locator(".vt-chat-msg .rounded-lg.border")).toHaveCount(0);
  });

  test("preview and chat share the right panel", async ({ page }) => {
    await openSheet(page);

    const preview = page.getByRole("button", { name: /^preview$/i });
    const chat = page.getByRole("button", { name: /^chat$/i });

    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".latex-preview")).toBeVisible();
    await expect(page.getByRole("complementary")).toHaveCount(1);

    await chat.click();
    await expect(chat).toHaveAttribute("aria-pressed", "true");
    await expect(preview).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".latex-preview")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: /room chat/i })).toBeVisible();
    await expect(page.getByRole("complementary")).toHaveCount(1);
  });

  test("desktop panes can be resized with drag handles", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only resize check");

    await openSheet(page);

    await page.getByRole("button", { name: /^problem$/i }).click();
    const panel = page.getByRole("complementary", { name: /problem reference/i });
    await expect(panel).toBeVisible();

    const handle = page.getByRole("separator", { name: /resize left panel/i });
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
      handleBox!.x + handleBox!.width / 2 + 80,
      handleBox!.y + handleBox!.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();

    const boxAfter = await panel.boundingBox();
    expect(boxAfter).toBeTruthy();
    expect(boxAfter!.width).toBeGreaterThan(boxBefore!.width + 40);
  });

  test("status bar exposes editable name", async ({ page }) => {
    await openSheet(page);

    const nameBtn = page.locator("footer button").first();
    await nameBtn.click();
    const dialog = page.getByRole("dialog", { name: /display name/i });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/axion/i).fill("Renamed");
    await dialog.getByRole("button", { name: /^save$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /^renamed$/i })).toBeVisible();
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
