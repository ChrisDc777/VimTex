import { expect, type Page } from "@playwright/test";

type UiVariant = "classic" | "quietCraft";

/** Clear storage once per browser context and pin the UI variant. */
export async function prepareApp(
  page: Page,
  opts: {
    variant?: UiVariant;
    /** When set, Classic skips the name gate. */
    displayName?: string;
  } = {},
) {
  const variant = opts.variant ?? "classic";
  const displayName = opts.displayName;
  await page.addInitScript(
    ({ variant: v, displayName: name }) => {
      if (document.cookie.includes("vimtex_test_cleared=1")) return;
      document.cookie = "vimtex_test_cleared=1; path=/; SameSite=Lax";
      try {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("vimtex:uiVariant", v);
        if (name) localStorage.setItem("vimtex:displayName", name);
        localStorage.setItem("vimtex:onboardingSeen", "1");
      } catch {
        /* ignore */
      }
    },
    { variant, displayName },
  );
}

export async function joinClassicRoom(
  page: Page,
  opts: { room?: string; name?: string } = {},
) {
  const room = opts.room ?? `classic-${Date.now().toString(16)}`;
  const name = opts.name ?? "Tester";
  await prepareApp(page, { variant: "classic" });
  await page.goto(`/?room=${room}`, { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: /display name/i });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByPlaceholder(/axion/i).fill(name);
  await dialog.getByRole("button", { name: /^join room$/i }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".ui-classic")).toBeVisible();
  return room;
}

/** Quiet Craft: no required name gate; editor ready immediately. */
export async function openQuietCraft(
  page: Page,
  opts: { room?: string; displayName?: string } = {},
) {
  const room = opts.room ?? `sheet-${Date.now().toString(16)}`;
  await prepareApp(page, {
    variant: "quietCraft",
    displayName: opts.displayName,
  });
  await page.goto(`/?room=${room}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("dialog", { name: /display name/i }),
  ).toHaveCount(0);
  return room;
}

export async function insertMode(page: Page) {
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
}

export async function vimInsertAtEnd(page: Page) {
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+G");
  await page.keyboard.press("o");
}

export async function editorText(page: Page) {
  return page.locator(".cm-content").innerText();
}

/** Document text without y-codemirror remote caret chrome. */
export async function editorDocText(page: Page) {
  return page.locator(".cm-content").evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll(
        ".cm-ySelectionInfo, .cm-ySelectionCaret, .cm-ySelectionCaretDot, .cm-widgetBuffer",
      )
      .forEach((node) => node.remove());
    return (clone.textContent ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, "");
  });
}

/** Clear buffer (Vim) and type a single marker line. */
export async function replaceDocWithMarker(page: Page, marker: string) {
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("g");
  await page.keyboard.press("g");
  await page.keyboard.press("d");
  await page.keyboard.press("G");
  await page.keyboard.press("i");
  await page.keyboard.type(marker);
  await page.keyboard.press("Escape");
}

export async function waitConnected(page: Page, timeout = 20_000) {
  await expect
    .poll(
      async () =>
        page
          .locator(".vt-classic-footer__meta, .vt-footer__status-label")
          .first()
          .innerText()
          .catch(() => ""),
      { timeout },
    )
    .toMatch(/connected/i);
}
