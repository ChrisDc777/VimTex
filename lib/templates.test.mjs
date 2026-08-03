import assert from "node:assert/strict";
import test from "node:test";
import { parseNote } from "./render-note.ts";
import {
  SESSION_TEMPLATES,
  buildTemplateDefaults,
  extractTemplateVariables,
  fillTemplateVariables,
} from "./templates.ts";

// Templates must seed TeX that the same renderer actually detects as math,
// so "New homework" / "New derivation" produce a live preview immediately.
// The blank template is intentionally empty and is excluded.
test("session templates parse TeX commands out of their content", () => {
  for (const template of SESSION_TEMPLATES.filter((t) => t.id !== "blank")) {
    const segments = parseNote(template.content);
    const math = segments.filter((seg) => seg.type === "math");
    assert.ok(
      math.length > 0,
      `template "${template.id}" should seed at least one math segment`,
    );
  }
});

test("blank template seeds an empty buffer", () => {
  const blank = SESSION_TEMPLATES.find((t) => t.id === "blank");
  assert.equal(blank?.content, "");
});

test("homework template includes an inline math delimiter", () => {
  const hw = SESSION_TEMPLATES.find((t) => t.id === "homework");
  assert.ok(hw?.content.includes("\\("));
  assert.ok(hw?.content.includes("\\sqrt"));
});

test("extractTemplateVariables finds unique placeholders in order", () => {
  assert.deepEqual(
    extractTemplateVariables("{{course}} then {{course}} then {{name}}"),
    ["course", "name"],
  );
  assert.deepEqual(extractTemplateVariables("no placeholders here"), []);
});

test("fillTemplateVariables substitutes values and leaves unknowns", () => {
  assert.equal(
    fillTemplateVariables("Dear {{name}}, course {{course}}", {
      name: "Ada",
      course: "Math 101",
    }),
    "Dear Ada, course Math 101",
  );
  assert.equal(fillTemplateVariables("keep {{unknown}}", {}), "keep {{unknown}}");
});

test("buildTemplateDefaults special-cases date and name", () => {
  const defaults = buildTemplateDefaults(["date", "name", "course"], "Neutrino");
  assert.equal(defaults.name, "Neutrino");
  assert.match(defaults.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(defaults.course, "");
});
