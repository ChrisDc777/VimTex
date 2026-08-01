/**
 * Named session templates shown in the "New sheet" flow.
 *
 * Templates are Markdown + TeX in the same bare-math style as the default
 * starter note so the live renderer and @ai context treat them uniformly.
 * The content is used as emptyRoomSeed - it only seeds a brand-new empty
 * room, never overwrites an existing collaborative buffer.
 */

export type SessionTemplate = {
  id: string;
  label: string;
  hint: string;
  /** Fresh-room seed content. Empty string = truly blank sheet. */
  content: string;
};

export const SESSION_TEMPLATES: readonly SessionTemplate[] = [
  {
    id: "blank",
    label: "Blank sheet",
    hint: "Start fresh",
    content: "",
  },
  {
    id: "homework",
    label: "Homework",
    hint: "Problem + show your work",
    content: `# Homework

Solve each problem. Show your work; keep each step on its own line.

## Problem 1

Given \\( a = 3 \\), \\( b = 4 \\), find \\( c \\).

c = \\sqrt{a^2 + b^2}

## Problem 2

\\int_0^1 x^2 \\, dx
`,
  },
  {
    id: "derivation",
    label: "Derivation",
    hint: "Step-through derivation",
    content: `# Derivation

Goal: state what you are deriving.

Start from a known rule:

\\frac{d}{dx} x^n = n x^{n-1}

Step 1:

Step 2:

Conclusion:

\\therefore \\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C
`,
  },
];

/** Look up template content by id, falling back to an empty string. */
export function getTemplateById(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateContent(id: string): string {
  return getTemplateById(id)?.content ?? "";
}
