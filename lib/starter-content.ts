/** Shown when the buffer is empty (CodeMirror placeholder). */
export const EDITOR_PLACEHOLDER =
  "Type math directly — 2^5, \\frac{1}{2}, or display \\[...\\]";

/** Seeded into empty Classic collaborative rooms after first Yjs sync. */
export const STARTER_NOTE = `# VimTex

An ephemeral Vim + LaTeX scratchpad. Type TeX commands directly — no $ needed.

Inline in prose with \\( \\): the quadratic formula \\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\) sits here.

Or just put commands on their own line:

\\frac{1}{2} + \\sqrt{x^{2} + 1}

\\int_{0}^{1} \\sqrt{1 - x^{2}} \\, dx = \\frac{\\pi}{4}

Display with \\[ \\]:

\\[
E = mc^{2}
\\]
`;
