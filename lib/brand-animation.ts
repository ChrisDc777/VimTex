export type BrandAnimStep = {
  text: string;
  mode: "insert" | "normal";
  selection?: [number, number];
  delayMs: number;
};

export type BrandAnimSequence = {
  id: string;
  steps: BrandAnimStep[];
};

export const BRAND_FINAL_TEXT = "VimTex";

const TYPED = "vimtex";
const EMPTY_MS = 250;
const TYPE_MS = 130;
const TYPE_FIRST_MS = 150;
const NORMAL_MS = 350;
const SELECT_MS = 300;
const CHANGE_MS = 250;
const HOLD_MS = 2000;
const DELETE_MS = 150;
const BACKSPACE_MS = 90;

function typeChars(text: string, firstDelay = TYPE_FIRST_MS): BrandAnimStep[] {
  const steps: BrandAnimStep[] = [];
  for (let i = 1; i <= text.length; i++) {
    steps.push({
      text: text.slice(0, i),
      mode: "insert",
      delayMs: i === 1 ? firstDelay : TYPE_MS,
    });
  }
  return steps;
}

function buildTypeAndChangeSequence(): BrandAnimSequence {
  const steps: BrandAnimStep[] = [{ text: "", mode: "insert", delayMs: EMPTY_MS }];

  steps.push(...typeChars(TYPED));

  steps.push(
    { text: TYPED, mode: "normal", delayMs: NORMAL_MS },
    { text: TYPED, mode: "normal", selection: [0, TYPED.length], delayMs: SELECT_MS },
    { text: BRAND_FINAL_TEXT, mode: "insert", delayMs: CHANGE_MS },
    { text: BRAND_FINAL_TEXT, mode: "normal", delayMs: HOLD_MS },
    { text: "", mode: "normal", delayMs: DELETE_MS },
    { text: "", mode: "insert", delayMs: EMPTY_MS },
  );

  return { id: "type-and-change", steps };
}

function buildCaseMorphSequence(): BrandAnimSequence {
  const upper = "VIMTEX";

  return {
    id: "case-morph",
    steps: [
      { text: upper, mode: "normal", delayMs: NORMAL_MS },
      { text: upper, mode: "normal", selection: [0, upper.length], delayMs: SELECT_MS },
      { text: BRAND_FINAL_TEXT, mode: "insert", delayMs: CHANGE_MS },
      { text: BRAND_FINAL_TEXT, mode: "normal", delayMs: HOLD_MS },
      { text: "", mode: "normal", delayMs: DELETE_MS },
      { text: "", mode: "insert", delayMs: EMPTY_MS },
    ],
  };
}

function buildSubstituteSequence(): BrandAnimSequence {
  return {
    id: "substitute",
    steps: [
      { text: TYPED, mode: "normal", delayMs: NORMAL_MS },
      { text: TYPED, mode: "normal", delayMs: 300 },
      { text: BRAND_FINAL_TEXT, mode: "normal", delayMs: HOLD_MS },
      { text: "", mode: "normal", delayMs: DELETE_MS },
      { text: "", mode: "insert", delayMs: EMPTY_MS },
    ],
  };
}

function buildLatexFlirtSequence(): BrandAnimSequence {
  const partial = "\\vim";
  const steps: BrandAnimStep[] = [{ text: "", mode: "insert", delayMs: EMPTY_MS }];

  steps.push(...typeChars(partial));

  for (let i = partial.length - 1; i >= 0; i--) {
    steps.push({
      text: partial.slice(0, i),
      mode: "insert",
      delayMs: BACKSPACE_MS,
    });
  }

  steps.push(...typeChars(BRAND_FINAL_TEXT, TYPE_MS));

  steps.push(
    { text: BRAND_FINAL_TEXT, mode: "normal", delayMs: HOLD_MS },
    { text: "", mode: "normal", delayMs: DELETE_MS },
    { text: "", mode: "insert", delayMs: EMPTY_MS },
  );

  return { id: "latex-flirt", steps };
}

export const BRAND_ANIM_SEQUENCES: BrandAnimSequence[] = [
  buildTypeAndChangeSequence(),
  buildCaseMorphSequence(),
  buildSubstituteSequence(),
  buildLatexFlirtSequence(),
];
