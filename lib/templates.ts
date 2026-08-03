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

Course: {{course}}
Due: {{date}}

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

Goal: {{goal}}

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

Topic: {{topic}}

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

Dear {{name}},

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

Title: {{title}}

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
  return getAllTemplates().find((t) => t.id === id);
}

export function getTemplateContent(id: string): string {
  return getTemplateById(id)?.content ?? "";
}

// --- Template variables ------------------------------------------------
//
// Content may declare `{{key}}` placeholders (e.g. {{course}}, {{date}}).
// When a template with placeholders is chosen, the shell prompts for values
// and fills them before seeding the new room.

const TEMPLATE_VAR_RE = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

/** Unique `{{key}}` placeholders in template content, in first-seen order. */
export function extractTemplateVariables(content: string): string[] {
  const found = new Set<string>();
  const seen: string[] = [];
  for (const match of content.matchAll(TEMPLATE_VAR_RE)) {
    const key = match[1];
    if (!found.has(key)) {
      found.add(key);
      seen.push(key);
    }
  }
  return seen;
}

/** Substitute `{{key}}` values; placeholders without a value stay as-is. */
export function fillTemplateVariables(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(TEMPLATE_VAR_RE, (full, key: string) =>
    key in values ? values[key] : full,
  );
}

/** Sensible starting values for a variable prompt. */
export function buildTemplateDefaults(
  variables: string[],
  displayName?: string,
): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const v of variables) {
    if (v === "date") defaults[v] = new Date().toISOString().slice(0, 10);
    else if (v === "name") defaults[v] = displayName ?? "";
    else defaults[v] = "";
  }
  return defaults;
}

// --- Custom templates ---------------------------------------------------
//
// Users can save the current note as a personal template (localStorage).
// Custom templates are surfaced alongside the built-ins wherever the new
// sheet flow lists SESSION_TEMPLATES (command palette, Studio menu).

const CUSTOM_TEMPLATES_KEY = "vimtex:customTemplates";

function readCustomTemplatesRaw(): unknown {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCustomTemplates(list: SessionTemplate[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function loadCustomTemplates(): SessionTemplate[] {
  const raw = readCustomTemplatesRaw();
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (t): t is SessionTemplate =>
      !!t &&
      typeof t === "object" &&
      typeof (t as SessionTemplate).id === "string" &&
      typeof (t as SessionTemplate).label === "string" &&
      typeof (t as SessionTemplate).content === "string",
  );
}

/** Insert or replace a custom template, returning the new list. */
export function saveCustomTemplate(
  template: SessionTemplate,
): SessionTemplate[] {
  const next = [
    ...loadCustomTemplates().filter((t) => t.id !== template.id),
    template,
  ];
  writeCustomTemplates(next);
  return next;
}

export function removeCustomTemplate(id: string): SessionTemplate[] {
  const next = loadCustomTemplates().filter((t) => t.id !== id);
  writeCustomTemplates(next);
  return next;
}

/** Built-in + custom templates in one list (customs last). */
export function getAllTemplates(): SessionTemplate[] {
  return [...SESSION_TEMPLATES, ...loadCustomTemplates()];
}

export function makeTemplateId(label: string): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "template";
  return `custom-${slug}-${Date.now().toString(36)}`;
}
