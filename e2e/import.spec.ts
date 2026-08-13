import { expect, test } from "@playwright/test";
import { editorDocText, joinStudioRoom, openForge } from "./helpers";

const MD_BODY = "Imported heading\n\nSee \\(x^2\\) and $literal$.\n";
const TEX_DOC = [
  "\\documentclass{article}",
  "\\begin{document}",
  "TeX body \\(a+b\\)",
  "\\end{document}",
  "",
].join("\n");

test.describe("M4 note import (#31)", () => {
  test("Studio menu imports a Markdown file into the buffer", async ({
    page,
  }) => {
    await joinStudioRoom(page);

    await page.getByRole("button", { name: /^room menu$/i }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      menu.getByRole("menuitem", { name: /import file/i }).click(),
    ]);
    await chooser.setFiles({
      name: "notes.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(MD_BODY, "utf8"),
    });

    await expect(page.getByText(/imported notes\.md/i)).toBeVisible({
      timeout: 8_000,
    });
    await expect(await editorDocText(page)).toContain("Imported heading");
    await expect(await editorDocText(page)).toContain("$literal$");
  });

  test("Forge palette imports a .tex document body only", async ({ page }) => {
    await openForge(page);

    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible({ timeout: 5_000 });
    await palette.getByLabel("Command palette").fill("import");

    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      palette
        .getByRole("option", { name: /import latex or markdown/i })
        .click(),
    ]);
    await chooser.setFiles({
      name: "hw.tex",
      mimeType: "application/x-tex",
      buffer: Buffer.from(TEX_DOC, "utf8"),
    });

    await expect(page.getByText(/imported hw\.tex/i)).toBeVisible({
      timeout: 8_000,
    });
    const doc = await editorDocText(page);
    expect(doc).toContain("TeX body");
    expect(doc).not.toContain("documentclass");
  });
});
