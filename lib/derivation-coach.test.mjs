import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DERIVATION_COACH_MODE_PREFIX,
  DERIVATION_COACH_SYSTEM_RULES,
  isDerivationCoachInstruction,
  wrapDerivationCoachInstruction,
} from "./derivation-coach.ts";

describe("derivation coach", () => {
  it("wraps instructions with a stable mode prefix", () => {
    const wrapped = wrapDerivationCoachInstruction("chain rule");
    assert.ok(isDerivationCoachInstruction(wrapped));
    assert.ok(wrapped.includes("chain rule"));
    assert.ok(wrapped.startsWith(DERIVATION_COACH_MODE_PREFIX));
  });

  it("system rules forbid edit markers", () => {
    assert.match(DERIVATION_COACH_SYSTEM_RULES, /Derivation-coach mode/i);
    assert.match(DERIVATION_COACH_SYSTEM_RULES, /@@@PATCH/);
    assert.match(DERIVATION_COACH_SYSTEM_RULES, /@@@DOCUMENT/);
    assert.match(DERIVATION_COACH_SYSTEM_RULES, /NEVER emit/i);
  });
});
