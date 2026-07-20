/**
 * LaTeX command snippets for editor tab-completion.
 * Templates use CodeMirror snippet syntax (`${}` / `${n}`).
 */
export type LatexCommand = {
  /** Command name without leading backslash. */
  name: string;
  /** Snippet template including the leading `\\`. */
  template: string;
  /** Short hint shown in the completion list. */
  detail?: string;
};

/** Commands that take arguments → braces are inserted on expand. */
export const LATEX_COMMANDS: readonly LatexCommand[] = [
  { name: "frac", template: "\\frac{${}}{${}}", detail: "fraction" },
  { name: "dfrac", template: "\\dfrac{${}}{${}}", detail: "display fraction" },
  { name: "tfrac", template: "\\tfrac{${}}{${}}", detail: "text fraction" },
  { name: "sqrt", template: "\\sqrt{${}}", detail: "square root" },
  { name: "binom", template: "\\binom{${}}{${}}", detail: "binomial" },
  { name: "sum", template: "\\sum_{${}}^{${}}", detail: "summation" },
  { name: "prod", template: "\\prod_{${}}^{${}}", detail: "product" },
  { name: "int", template: "\\int_{${}}^{${}}", detail: "integral" },
  { name: "iint", template: "\\iint_{${}}^{${}}", detail: "double integral" },
  { name: "oint", template: "\\oint_{${}}^{${}}", detail: "contour integral" },
  { name: "lim", template: "\\lim_{${}}", detail: "limit" },
  { name: "infty", template: "\\infty", detail: "infinity" },
  { name: "partial", template: "\\partial", detail: "partial" },
  { name: "nabla", template: "\\nabla", detail: "nabla" },
  { name: "cdot", template: "\\cdot", detail: "dot product" },
  { name: "times", template: "\\times", detail: "times" },
  { name: "div", template: "\\div", detail: "division" },
  { name: "pm", template: "\\pm", detail: "plus-minus" },
  { name: "mp", template: "\\mp", detail: "minus-plus" },
  { name: "leq", template: "\\leq", detail: "≤" },
  { name: "geq", template: "\\geq", detail: "≥" },
  { name: "neq", template: "\\neq", detail: "≠" },
  { name: "approx", template: "\\approx", detail: "≈" },
  { name: "equiv", template: "\\equiv", detail: "≡" },
  { name: "sim", template: "\\sim", detail: "~" },
  { name: "propto", template: "\\propto", detail: "∝" },
  { name: "subset", template: "\\subset", detail: "⊂" },
  { name: "supset", template: "\\supset", detail: "⊃" },
  { name: "subseteq", template: "\\subseteq", detail: "⊆" },
  { name: "supseteq", template: "\\supseteq", detail: "⊇" },
  { name: "in", template: "\\in", detail: "∈" },
  { name: "notin", template: "\\notin", detail: "∉" },
  { name: "cup", template: "\\cup", detail: "∪" },
  { name: "cap", template: "\\cap", detail: "∩" },
  { name: "emptyset", template: "\\emptyset", detail: "∅" },
  { name: "forall", template: "\\forall", detail: "∀" },
  { name: "exists", template: "\\exists", detail: "∃" },
  { name: "rightarrow", template: "\\rightarrow", detail: "→" },
  { name: "leftarrow", template: "\\leftarrow", detail: "←" },
  { name: "Rightarrow", template: "\\Rightarrow", detail: "⇒" },
  { name: "Leftarrow", template: "\\Leftarrow", detail: "⇐" },
  { name: "leftrightarrow", template: "\\leftrightarrow", detail: "↔" },
  { name: "mapsto", template: "\\mapsto", detail: "↦" },
  { name: "to", template: "\\to", detail: "→" },
  { name: "alpha", template: "\\alpha" },
  { name: "beta", template: "\\beta" },
  { name: "gamma", template: "\\gamma" },
  { name: "delta", template: "\\delta" },
  { name: "epsilon", template: "\\epsilon" },
  { name: "varepsilon", template: "\\varepsilon" },
  { name: "zeta", template: "\\zeta" },
  { name: "eta", template: "\\eta" },
  { name: "theta", template: "\\theta" },
  { name: "iota", template: "\\iota" },
  { name: "kappa", template: "\\kappa" },
  { name: "lambda", template: "\\lambda" },
  { name: "mu", template: "\\mu" },
  { name: "nu", template: "\\nu" },
  { name: "xi", template: "\\xi" },
  { name: "pi", template: "\\pi" },
  { name: "rho", template: "\\rho" },
  { name: "sigma", template: "\\sigma" },
  { name: "tau", template: "\\tau" },
  { name: "upsilon", template: "\\upsilon" },
  { name: "phi", template: "\\phi" },
  { name: "varphi", template: "\\varphi" },
  { name: "chi", template: "\\chi" },
  { name: "psi", template: "\\psi" },
  { name: "omega", template: "\\omega" },
  { name: "Gamma", template: "\\Gamma" },
  { name: "Delta", template: "\\Delta" },
  { name: "Theta", template: "\\Theta" },
  { name: "Lambda", template: "\\Lambda" },
  { name: "Xi", template: "\\Xi" },
  { name: "Pi", template: "\\Pi" },
  { name: "Sigma", template: "\\Sigma" },
  { name: "Phi", template: "\\Phi" },
  { name: "Psi", template: "\\Psi" },
  { name: "Omega", template: "\\Omega" },
  { name: "mathbb", template: "\\mathbb{${}}", detail: "blackboard" },
  { name: "mathbf", template: "\\mathbf{${}}", detail: "bold" },
  { name: "mathrm", template: "\\mathrm{${}}", detail: "roman" },
  { name: "mathit", template: "\\mathit{${}}", detail: "italic" },
  { name: "mathcal", template: "\\mathcal{${}}", detail: "calligraphic" },
  { name: "mathfrak", template: "\\mathfrak{${}}", detail: "fraktur" },
  { name: "mathsf", template: "\\mathsf{${}}", detail: "sans" },
  { name: "mathtt", template: "\\mathtt{${}}", detail: "typewriter" },
  { name: "text", template: "\\text{${}}", detail: "text" },
  { name: "textbf", template: "\\textbf{${}}" },
  { name: "textit", template: "\\textit{${}}" },
  { name: "emph", template: "\\emph{${}}" },
  { name: "hat", template: "\\hat{${}}" },
  { name: "bar", template: "\\bar{${}}" },
  { name: "vec", template: "\\vec{${}}" },
  { name: "dot", template: "\\dot{${}}" },
  { name: "ddot", template: "\\ddot{${}}" },
  { name: "tilde", template: "\\tilde{${}}" },
  { name: "overline", template: "\\overline{${}}" },
  { name: "underline", template: "\\underline{${}}" },
  { name: "overbrace", template: "\\overbrace{${}}^{${}}" },
  { name: "underbrace", template: "\\underbrace{${}}_{${}}" },
  { name: "begin", template: "\\begin{${1:env}}\n\t${}\n\\end{${1:env}}" },
  { name: "matrix", template: "\\begin{matrix}\n\t${}\n\\end{matrix}" },
  { name: "pmatrix", template: "\\begin{pmatrix}\n\t${}\n\\end{pmatrix}" },
  { name: "bmatrix", template: "\\begin{bmatrix}\n\t${}\n\\end{bmatrix}" },
  { name: "vmatrix", template: "\\begin{vmatrix}\n\t${}\n\\end{vmatrix}" },
  { name: "cases", template: "\\begin{cases}\n\t${}\n\\end{cases}" },
  { name: "align", template: "\\begin{align}\n\t${}\n\\end{align}" },
  { name: "quad", template: "\\quad" },
  { name: "qquad", template: "\\qquad" },
  { name: "hspace", template: "\\hspace{${}}" },
  { name: "vspace", template: "\\vspace{${}}" },
];

export const LATEX_COMMAND_MAP: ReadonlyMap<string, LatexCommand> = new Map(
  LATEX_COMMANDS.map((cmd) => [cmd.name, cmd]),
);

export function findLatexCommands(prefix: string): LatexCommand[] {
  if (!prefix) return [...LATEX_COMMANDS];
  const out: LatexCommand[] = [];
  for (const cmd of LATEX_COMMANDS) {
    if (cmd.name.startsWith(prefix)) out.push(cmd);
  }
  // Case-insensitive fallback for Greek capitals typed lowercase, etc.
  if (out.length === 0) {
    const lower = prefix.toLowerCase();
    for (const cmd of LATEX_COMMANDS) {
      if (cmd.name.toLowerCase().startsWith(lower)) out.push(cmd);
    }
  }
  return out;
}
