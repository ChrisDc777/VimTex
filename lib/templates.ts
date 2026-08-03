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
  {
    id: "notes",
    label: "Notes",
    hint: "Definitions, theorems, examples",
    content: `# Notes

Capture definitions, theorems, and worked examples below.

## Definition

A sequence \\( a_n \\) converges to \\( L \\) when its terms get arbitrarily close to \\( L \\).

## Theorem

\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}

## Worked example

\\int_0^1 x^2 \\, dx = \\frac{1}{3}
`,
  },
  {
    id: "letter",
    label: "Letter",
    hint: "Correspondence with a key result",
    content: `# Letter

Dear Reader,

Thank you for your time. The key result referenced below follows from the enclosed argument:

\\int \\frac{1}{1 + x^2} \\, dx = \\arctan x + C

Please let me know if you have any questions.

Sincerely,

Name
`,
  },
  {
    id: "paper",
    label: "Paper",
    hint: "Abstract, methods, results",
    content: `# Paper

Title:

## Abstract

## Introduction

## Methods

## Results

\\sigma^2 = \\frac{1}{N} \\sum_{i=1}^{N} (x_i - \\mu)^2

## Conclusion
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
