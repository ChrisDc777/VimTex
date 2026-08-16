import { expect, type Page } from "@playwright/test";

type UiVariant = "studio" | "forge";

/** Clear storage once per browser context and pin the UI variant. */
export async function prepareApp(
  page: Page,
  opts: {
    variant?: UiVariant;
    /** When set, Studio skips the name gate. */
    displayName?: string;
    /** Preselect the editor keybindings (default: Vim). */
    editorMode?: "vim" | "standard";
    /** Seed onboarding as already seen (default: true). */
    onboardingSeen?: boolean;
    /** Studio Enhanced | Basic experience (default: enhanced). */
    studioExperience?: "enhanced" | "basic";
  } = {},
) {
  const variant = opts.variant ?? "studio";
  const displayName = opts.displayName;
  const editorMode = opts.editorMode;
  const onboardingSeen = opts.onboardingSeen ?? true;
  const studioExperience = opts.studioExperience ?? "enhanced";
  await page.addInitScript(
    ({
      variant: v,
      displayName: name,
      editorMode: mode,
      onboardingSeen: seen,
      studioExperience: experience,
    }) => {
      if (document.cookie.includes("vimtex_test_cleared=1")) return;
      document.cookie = "vimtex_test_cleared=1; path=/; SameSite=Lax";
      try {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("vimtex:uiVariant", v);
        localStorage.setItem("vimtex:studioExperience", experience);
        if (name) localStorage.setItem("vimtex:displayName", name);
        if (seen) localStorage.setItem("vimtex:onboardingSeen", "1");
        if (mode) localStorage.setItem("vimtex:editorMode", mode);
      } catch {
        /* ignore */
      }
    },
    { variant, displayName, editorMode, onboardingSeen, studioExperience },
  );
}

export async function joinStudioRoom(
  page: Page,
  opts: {
    room?: string;
    name?: string;
    studioExperience?: "enhanced" | "basic";
  } = {},
) {
  const room = opts.room ?? `studio-${Date.now().toString(16)}`;
  const name = opts.name ?? "Tester";
  await prepareApp(page, {
    variant: "studio",
    studioExperience: opts.studioExperience,
  });
  await page.goto(`/?room=${room}`, { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: /display name/i });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByPlaceholder(/axion/i).fill(name);
  await dialog.getByRole("button", { name: /^join room$/i }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".ui-studio")).toBeVisible();
  if ((opts.studioExperience ?? "enhanced") === "enhanced") {
    await expect(page.locator(".vt-studio-dock")).toBeVisible({
      timeout: 20_000,
    });
  }
  return room;
}

/** Forge: no required name gate; editor ready immediately. */
export async function openForge(
  page: Page,
  opts: { room?: string; displayName?: string } = {},
) {
  const room = opts.room ?? `sheet-${Date.now().toString(16)}`;
  await prepareApp(page, {
    variant: "forge",
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
          .locator(".vt-studio-footer__meta, .vt-footer__status-label")
          .first()
          .innerText()
          .catch(() => ""),
      { timeout },
    )
    .toMatch(/connected/i);
}
