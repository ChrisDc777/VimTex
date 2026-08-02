export const SNIPPET_CURSOR = "\uE000";
export const SNIPPET_SEL_OPEN = "\uE001";
export const SNIPPET_SEL_CLOSE = "\uE002";

export type MathSnippet = {
  id: string;
  label: string;
  keywords: string;
  /** Template with SNIPPET_CURSOR / SNIPPET_SEL_* markers. */
  snippet: string;
};

export const MATH_SNIPPETS: MathSnippet[] = [
  {
    id: "frac",
    label: "Fraction",
    keywords: "frac division divide ratio",
    snippet: `\\frac{${SNIPPET_CURSOR}}{}`,
  },
  {
    id: "sqrt",
    label: "Square root",
    keywords: "sqrt radical root",
    snippet: `\\sqrt{${SNIPPET_CURSOR}}`,
  },
  {
    id: "nthroot",
    label: "Nth root",
    keywords: "sqrt radical root",
    snippet: `\\sqrt[${SNIPPET_CURSOR}]{}`,
  },
  {
    id: "sum",
    label: "Sum",
    keywords: "summation sigma series",
    snippet: `\\sum_{${SNIPPET_CURSOR}}^{}`,
  },
  {
    id: "int",
    label: "Integral",
    keywords: "integral integrate",
    snippet: `\\int_{${SNIPPET_CURSOR}}^{}`,
  },
  {
    id: "prod",
    label: "Product",
    keywords: "product pi prod",
    snippet: `\\prod_{${SNIPPET_CURSOR}}^{}`,
  },
  {
    id: "lim",
    label: "Limit",
    keywords: "limit approaches infinity",
    snippet: `\\lim_{${SNIPPET_CURSOR} \\to \\infty}`,
  },
  {
    id: "matrix",
    label: "Matrix",
    keywords: "matrix array bmatrix",
    snippet: `\\begin{bmatrix}${SNIPPET_CURSOR}\\\\ \\end{bmatrix}`,
  },
  {
    id: "aligned",
    label: "Aligned equations",
    keywords: "align cases equations system",
    snippet: `\\begin{aligned}${SNIPPET_CURSOR} \\end{aligned}`,
  },
  {
    id: "cases",
    label: "Cases",
    keywords: "piecewise cases",
    snippet: `\\begin{cases}${SNIPPET_CURSOR} \\end{cases}`,
  },
  {
    id: "display",
    label: "Display equation",
    keywords: "display equation block centered",
    snippet: `\\[${SNIPPET_CURSOR}\\]`,
  },
  {
    id: "mathbb",
    label: "Blackboard bold",
    keywords: "mathbb blackboard set reals",
    snippet: `\\mathbb{${SNIPPET_SEL_OPEN}R${SNIPPET_SEL_CLOSE}}`,
  },
  {
    id: "hat",
    label: "Hat",
    keywords: "hat vector unit accent",
    snippet: `\\hat{${SNIPPET_CURSOR}}`,
  },
  {
    id: "vec",
    label: "Vector arrow",
    keywords: "vec vector accent",
    snippet: `\\vec{${SNIPPET_CURSOR}}`,
  },
  {
    id: "over",
    label: "Overline",
    keywords: "bar overline average conjugate",
    snippet: `\\overline{${SNIPPET_CURSOR}}`,
  },
  {
    id: "partial",
    label: "Partial",
    keywords: "partial derivative differential",
    snippet: `\\partial ${SNIPPET_CURSOR}`,
  },
];
